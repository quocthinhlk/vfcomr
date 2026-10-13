import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, Path, Rect} from 'react-native-svg';
import {fs, rs, ws} from '../../utils/scale';

export type FileKind =
  | 'pdf'
  | 'word'
  | 'excel'
  | 'powerpoint'
  | 'image'
  | 'video'
  | 'audio'
  | 'archive'
  | 'code'
  | 'text'
  | 'other';

const EXTENSION_KINDS: Record<string, FileKind> = {
  pdf: 'pdf',
  doc: 'word', docx: 'word', odt: 'word', rtf: 'word', pages: 'word',
  xls: 'excel', xlsx: 'excel', xlsm: 'excel', ods: 'excel', csv: 'excel', numbers: 'excel',
  ppt: 'powerpoint', pptx: 'powerpoint', odp: 'powerpoint', key: 'powerpoint',
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', heic: 'image',
  heif: 'image', bmp: 'image', svg: 'image', tif: 'image', tiff: 'image',
  mp4: 'video', mov: 'video', m4v: 'video', avi: 'video', mkv: 'video', webm: 'video', wmv: 'video', '3gp': 'video',
  mp3: 'audio', wav: 'audio', m4a: 'audio', aac: 'audio', ogg: 'audio', flac: 'audio', wma: 'audio',
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive', tgz: 'archive', bz2: 'archive',
  html: 'code', htm: 'code', json: 'code', xml: 'code', js: 'code', ts: 'code', css: 'code',
  txt: 'text', md: 'text', log: 'text', epub: 'text',
};

/** Mid-tone hues that read on both light and dark surfaces; the tile uses a translucent tint. */
const KIND_COLORS: Record<FileKind, string> = {
  pdf: '#E5484D',
  word: '#2F6FDB',
  excel: '#1F9D55',
  powerpoint: '#E8762C',
  image: '#8E4EC6',
  video: '#D6409F',
  audio: '#12A594',
  archive: '#C58A00',
  code: '#5B6B7F',
  text: '#5B6B7F',
  other: '#7C8594',
};

export function getFileExtension(filename?: string) {
  if (!filename || !filename.includes('.')) {
    return '';
  }
  return (filename.split('.').pop() || '').toLowerCase();
}

export function getFileKind(filename?: string): FileKind {
  return EXTENSION_KINDS[getFileExtension(filename)] ?? 'other';
}

const stroke = (color: string) => ({
  stroke: color,
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

const Page = ({color}: {color: string}) => (
  <>
    <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" {...stroke(color)} />
    <Path d="M14 3v5h5" {...stroke(color)} />
  </>
);

const Glyph = ({kind, color}: {kind: FileKind; color: string}) => {
  switch (kind) {
    case 'image':
      return (
        <>
          <Rect x={3} y={3} width={18} height={18} rx={2} {...stroke(color)} />
          <Circle cx={8.5} cy={8.5} r={1.5} {...stroke(color)} />
          <Path d="M21 15l-5-5L5 21" {...stroke(color)} />
        </>
      );
    case 'video':
      return (
        <>
          <Rect x={2} y={6} width={14} height={12} rx={2} {...stroke(color)} />
          <Path d="M16 10.5l6-3.5v10l-6-3.5" {...stroke(color)} />
        </>
      );
    case 'audio':
      return (
        <>
          <Path d="M9 18V5l12-2v13" {...stroke(color)} />
          <Circle cx={6} cy={18} r={3} {...stroke(color)} />
          <Circle cx={18} cy={16} r={3} {...stroke(color)} />
        </>
      );
    case 'archive':
      return (
        <>
          <Page color={color} />
          <Path d="M10 4h1M10 7h1M10 10h1" {...stroke(color)} />
          <Rect x={9} y={13} width={3} height={4} rx={0.5} {...stroke(color)} />
        </>
      );
    case 'excel':
      return (
        <>
          <Page color={color} />
          <Path d="M8 12h8v6H8zM12 12v6M8 15h8" {...stroke(color)} />
        </>
      );
    case 'powerpoint':
      return (
        <>
          <Page color={color} />
          <Path d="M9 18v-3M12 18v-5M15 18v-2" {...stroke(color)} />
        </>
      );
    case 'code':
      return (
        <>
          <Page color={color} />
          <Path d="M10 12l-2 2.5 2 2.5M14 12l2 2.5-2 2.5" {...stroke(color)} />
        </>
      );
    case 'pdf':
    case 'word':
    case 'text':
      return (
        <>
          <Page color={color} />
          <Path d="M9 13h6M9 17h4" {...stroke(color)} />
        </>
      );
    default:
      return <Page color={color} />;
  }
};

type Props = {
  filename?: string;
  /** Tile edge length. */
  size?: number;
};

/** Square tile with a file-type icon and the extension underneath, colored per kind. */
export const FileTypeIcon: React.FC<Props> = ({filename, size = ws(42)}) => {
  const kind = getFileKind(filename);
  const color = KIND_COLORS[kind];
  const ext = getFileExtension(filename).toUpperCase().slice(0, 4);
  const iconSize = Math.round(size * (ext ? 0.48 : 0.56));

  return (
    <View
      style={[
        styles.tile,
        {width: size, height: size, backgroundColor: `${color}1F`},
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <Glyph kind={kind} color={color} />
      </Svg>
      {ext ? (
        <Text style={[styles.ext, {color}]} numberOfLines={1}>
          {ext}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    borderRadius: rs(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  ext: {
    marginTop: 1,
    fontSize: fs(8),
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export default FileTypeIcon;
