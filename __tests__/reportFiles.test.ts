/** Generate Reports: every format the API produced is offered after generating. */
// Built inside the factory: imports are hoisted above `const`s, so the
// factory runs before any top-level variable here is initialised.
jest.mock('react-native-fs', () => {
  const fs: any = {
    CachesDirectoryPath: '/cache',
    DownloadDirectoryPath: '/storage/Download',
    DocumentDirectoryPath: '/docs',
    files: new Set<string>(),
    exists: jest.fn(async (p: string) => fs.files.has(p)),
    mkdir: jest.fn(async () => {}),
    unlink: jest.fn(async () => {}),
    scanFile: jest.fn(async () => []),
    copyFile: jest.fn(async (_from: string, to: string) => {
      fs.files.add(to);
    }),
    downloadFile: jest.fn(({toFile}: {toFile: string}) => {
      fs.files.add(toFile);
      return {promise: Promise.resolve({statusCode: 200})};
    }),
  };
  return {__esModule: true, default: fs};
});
jest.mock('../app/config/api', () => ({__esModule: true, default: {get: jest.fn(), post: jest.fn()}}));

import api from '../app/config/api';
import {Platform} from 'react-native';
import RNFS from 'react-native-fs';

const mockFs = RNFS as any;
import {
  freePath,
  generateReport,
  listReportFiles,
  saveReportToDownloads,
} from '../app/modules/report/services/report.service';

describe('report download formats', () => {
  it('offers Excel (file_url) and PDF (pdf_url), Excel first', () => {
    expect(
      listReportFiles(
        {
          file_name: 'church-report.xlsx',
          file_url: 'https://x/church-report.xlsx',
          pdf_url: 'https://x/church-report.pdf',
        },
        'r.pdf',
      ),
    ).toEqual([
      {url: 'https://x/church-report.xlsx', filename: 'church-report.xlsx', label: 'excel'},
      {url: 'https://x/church-report.pdf', filename: 'church-report.pdf', label: 'pdf'},
    ]);
  });

  it('a PDF-only report offers just the PDF', () => {
    expect(listReportFiles({file_url: 'https://x/dir.pdf'}, 'r.pdf')).toEqual([
      {url: 'https://x/dir.pdf', filename: 'dir.pdf', label: 'pdf'},
    ]);
    expect(listReportFiles({pdf_url: 'https://x/a.pdf', file_name: 'a.xlsx'}, 'r')).toEqual([
      {url: 'https://x/a.pdf', filename: 'a.pdf', label: 'pdf'},
    ]);
  });

  it('names a file without extension from file_type, else .xlsx', () => {
    expect(listReportFiles({file_url: 'https://x/dl?id=1', file_name: 'rep', file_type: 'xls'}, 'r')[0].filename).toBe('rep.xls');
    expect(listReportFiles({file_url: 'https://x/', file_name: 'rep'}, 'r')[0].filename).toBe('rep.xlsx');
  });

  it('generateReport returns both formats, or the API message when there is no file', async () => {
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: {success: true, data: {file_url: 'https://x/a.xlsx', pdf_url: 'https://x/a.pdf'}},
    });
    const result = await generateReport('church', {}, 'a.pdf');
    expect(result.kind === 'files' && result.files.map(f => f.label)).toEqual(['excel', 'pdf']);
    (api.post as jest.Mock).mockResolvedValueOnce({data: {success: true, message: 'Emailed'}});
    expect(await generateReport('church', {}, 'a.pdf')).toEqual({kind: 'message', message: 'Emailed'});
  });
});

describe('saving a report on the device', () => {
  const file = {url: 'https://x/a.xlsx', filename: 'a.xlsx', label: 'excel' as const};
  beforeEach(() => {
    mockFs.files.clear();
    jest.clearAllMocks();
  });

  it('never overwrites: the next copy is "name (1).ext"', async () => {
    mockFs.files.add('/d/a.xlsx');
    expect(await freePath('/d', 'a.xlsx')).toBe('/d/a (1).xlsx');
    expect(await freePath('/d', 'b.pdf')).toBe('/d/b.pdf');
  });

  it('Android: copies into the Download folder and indexes it', async () => {
    Platform.OS = 'android';
    (Platform as any).Version = 34;
    const path = await saveReportToDownloads(file);
    expect(path).toBe('/storage/Download/a.xlsx');
    expect(mockFs.copyFile).toHaveBeenCalledWith(expect.stringMatching(/^\/cache\/reports\//), path);
    expect(mockFs.scanFile).toHaveBeenCalledWith(path);
    // Saving again keeps the first copy.
    expect(await saveReportToDownloads(file)).toBe('/storage/Download/a (1).xlsx');
  });
});
