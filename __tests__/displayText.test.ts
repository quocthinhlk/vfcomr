import {fixMojibake, stripTreePrefix} from '../app/shared/utils/displayText';

describe('display text', () => {
  it('repairs UTF-8 read as Latin-1', () => {
    expect(fixMojibake('PortuguÃªs')).toBe('Português');
    expect(fixMojibake('FranÃ§ais')).toBe('Français');
    expect(fixMojibake('Ã‰glise')).toBe('Ã‰glise'); // cp1252 bytes: left alone, not garbled further
    expect(fixMojibake('BogotÃ¡ & SÃ£o')).toBe('Bogotá & São');
  });

  it('leaves correct text alone', () => {
    ['Português', 'Mandarin', 'São Paulo', 'Ã', 'Bahasa Indonesia', '日本語', ''].forEach(text =>
      expect(fixMojibake(text)).toBe(text),
    );
  });

  it('strips tree dashes', () => {
    expect(stripTreePrefix('--- Sarawak')).toBe('Sarawak');
    expect(stripTreePrefix('- South East Asia')).toBe('South East Asia');
    expect(stripTreePrefix('VFC Reg. 2 - SC James Gan')).toBe('VFC Reg. 2 - SC James Gan');
  });
});
