import * as RNFS from 'react-native-fs';
import ImageResizer from 'react-native-image-resizer';
import {requestPhotoPermission} from '../../../shared/services/permissions.service';

const CameraRollModule = require('@react-native-camera-roll/camera-roll');
const CameraRoll: {
  save?: (uri: string, opts?: {type?: string}) => Promise<unknown>;
} = CameraRollModule?.CameraRoll || CameraRollModule?.default || CameraRollModule;

export const CHART_SAVE_PERMISSION_DENIED = 'CHART_SAVE_PERMISSION_DENIED';

type SvgCapture = {
  toDataURL?: (callback: (base64: string) => void, options?: object) => void;
};

const stripBase64 = (value: string) => {
  const marker = 'base64,';
  const index = value.indexOf(marker);
  return index >= 0 ? value.slice(index + marker.length) : value;
};

const captureSvgBase64 = (svg: SvgCapture): Promise<string> =>
  new Promise((resolve, reject) => {
    if (typeof svg.toDataURL !== 'function') {
      reject(new Error('Chart capture is not available'));
      return;
    }
    const timer = setTimeout(() => {
      reject(new Error('Chart capture timed out'));
    }, 15000);
    svg.toDataURL(data => {
      clearTimeout(timer);
      const base64 = stripBase64(String(data || '').trim());
      if (!base64) {
        reject(new Error('Chart capture failed'));
        return;
      }
      resolve(base64);
    });
  });

export async function saveSvgChartAsJpeg(
  svg: SvgCapture | null,
  opts: {width: number; height: number; filePrefix?: string},
): Promise<void> {
  if (!svg) {
    throw new Error('Chart capture is not available');
  }

  const permission = await requestPhotoPermission({showAlertIfBlocked: true});
  if (permission.blocked) {
    const error = new Error(CHART_SAVE_PERMISSION_DENIED);
    error.name = CHART_SAVE_PERMISSION_DENIED;
    throw error;
  }

  if (!CameraRoll || typeof CameraRoll.save !== 'function') {
    throw new Error('Photo library is not available');
  }

  const base64 = await captureSvgBase64(svg);
  const stamp = Date.now();
  const pngPath = `${RNFS.CachesDirectoryPath}/${opts.filePrefix || 'chart'}-${stamp}.png`;
  await RNFS.writeFile(pngPath, base64, 'base64');

  const width = Math.max(1, Math.round(opts.width));
  const height = Math.max(1, Math.round(opts.height));
  const jpeg = await ImageResizer.createResizedImage(
    `file://${pngPath}`,
    width,
    height,
    'JPEG',
    90,
    0,
    undefined,
    false,
    {mode: 'stretch'},
  );

  await CameraRoll.save(jpeg.uri, {type: 'photo'});

  try {
    await RNFS.unlink(pngPath);
  } catch {
    // ignore cleanup errors
  }
}
