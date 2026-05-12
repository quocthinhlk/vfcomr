import * as RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {TOKEN_FOR_TEST} from '../../config/api';

// CameraRoll is provided by '@react-native-camera-roll/camera-roll' at runtime.
// The library exports `CameraRoll` as a named export in recent versions,
// so we resolve it from `.CameraRoll` first, then fall back to default/CommonJS.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CameraRollModule = require('@react-native-camera-roll/camera-roll');
const CameraRoll: any =
  CameraRollModule?.CameraRoll || CameraRollModule?.default || CameraRollModule;

export async function downloadImageToCameraRoll(
  remoteUrl: string,
  opts?: {filePrefix?: string; headers?: Record<string, string>},
) {
  if (!remoteUrl) {
    throw new Error('Missing image url');
  }

  if (!CameraRoll || typeof CameraRoll.save !== 'function') {
    throw new Error('CameraRoll module not available');
  }

  // Bundled / on-device files: save straight to the photo library (no HTTP download).
  if (/^file:\/\//i.test(remoteUrl) || remoteUrl.startsWith('content://')) {
    await CameraRoll.save(remoteUrl, {type: 'photo'});
    return;
  }

  const fileName = `${opts?.filePrefix || 'image'}-${Date.now()}.jpg`;
  const localPath = `${RNFS.CachesDirectoryPath}/${fileName}`;

  const headers: Record<string, string> = {...(opts?.headers || {})};
  if (!headers.Authorization) {
    const token = TOKEN_FOR_TEST || (await AsyncStorage.getItem('token')) || '';
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  // Download remote image to a local cache file, then save via CameraRoll.
  const downloadRes = await RNFS.downloadFile({
    fromUrl: remoteUrl,
    toFile: localPath,
    headers: Object.keys(headers).length ? headers : undefined,
  }).promise;

  if (!(downloadRes.statusCode >= 200 && downloadRes.statusCode < 300)) {
    throw new Error(`Download failed with status ${downloadRes.statusCode}`);
  }

  await CameraRoll.save(`file://${localPath}`, {type: 'photo'});

  try {
    await RNFS.unlink(localPath);
  } catch {
    // ignore cleanup errors
  }
}

