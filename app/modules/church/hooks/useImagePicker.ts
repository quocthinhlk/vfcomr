import {useState} from 'react';
import ImagePicker from 'react-native-image-crop-picker';
import {ActionSheetIOS, Alert, Linking, PermissionsAndroid, Platform} from 'react-native';
import {useTranslation} from '../../../shared/hooks/useTranslation';

interface ImagePickerResult {
  path: string;
  size: number;
}

interface ImagePickerConfig {
  /**
   * Target width for cropping. Defaults to 300.
   */
  width?: number;
  /**
   * Target height for cropping. Defaults to 300.
   */
  height?: number;
}

export function useImagePicker(config?: ImagePickerConfig) {
  const {t} = useTranslation();
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const promptPermission = (source: 'camera' | 'library') => {
    const title = source === 'camera' ? 'Camera permission required' : 'Photo access required';
    const message = `Please enable ${
      source === 'camera' ? 'camera' : 'photo library'
    } access in system settings to continue.`;

    Alert.alert(title, message, [
      {text: t('cancel') || 'Cancel', style: 'cancel'},
      {
        text: 'Open Settings',
        onPress: () => {
          void Linking.openSettings();
        },
      },
    ]);
  };

  const ensureAndroidPermission = async (source: 'camera' | 'library') => {
    if (Platform.OS !== 'android') return true;

    const requestOne = async (permission: any) => {
      try {
        const result = await PermissionsAndroid.request(permission);
        if (result === PermissionsAndroid.RESULTS.GRANTED) return true;
        if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          promptPermission(source);
          return false;
        }
        // denied
        promptPermission(source);
        return false;
      } catch {
        promptPermission(source);
        return false;
      }
    };

    if (source === 'camera') {
      return requestOne(PermissionsAndroid.PERMISSIONS.CAMERA);
    }

    // library
    const androidVersion = Number(Platform.Version) || 0;
    const perm = androidVersion >= 33
      ? // Some RN versions may not type this constant; runtime value exists on Android 13+.
        (PermissionsAndroid.PERMISSIONS as any).READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    return requestOne(perm);
  };

  const isPermissionError = (error: unknown) => {
    const msg = String((error as any)?.message ?? '');
    const code = String((error as any)?.code ?? '');
    return /permission|denied|not authorized|not authorised/i.test(msg) || /permission/i.test(code);
  };

  const pick = async (source: 'camera' | 'library') => {
    const targetWidth = config?.width ?? 300;
    const targetHeight = config?.height ?? 300;

    const ok = await ensureAndroidPermission(source);
    if (!ok) return;

    const open =
      source === 'camera'
        ? ImagePicker.openCamera
        : ImagePicker.openPicker;

    let image: ImagePickerResult;
    try {
      image = await open({
        width: targetWidth,
        height: targetHeight,
        cropping: true,
        cropperCircleOverlay: false,
        compressImageMaxWidth: 1024,
        compressImageMaxHeight: 1024,
        compressImageQuality: 0.8,
        includeBase64: false,
      });
    } catch (error) {
      if (isPermissionError(error)) {
        promptPermission(source);
        return;
      }
      throw error;
    }

    if (image.size > 1572864) {
      // 1.5 MB
      Alert.alert(t('fileTooLargeTitle'), t('fileTooLargeMessage'));
      setImageError(t('fileTooLargeTitle'));
      return;
    }

    if (image?.path) {
      setImagePath(image.path);
      setImageError(null);
    }
  };

  const handleImagePick = async () => {
    try {
      // Match UserScreen.tsx pattern: iOS ActionSheet, Android Alert buttons.
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [t('takePhoto'), t('uploadImage'), t('cancel')],
            cancelButtonIndex: 2,
            userInterfaceStyle: 'light',
          },
          (idx: number) => {
            if (idx === 0) void pick('camera');
            if (idx === 1) void pick('library');
          },
        );
        return;
      }

      Alert.alert(t('selectImage'), '', [
        {text: t('takePhoto'), onPress: () => void pick('camera')},
        {text: t('uploadImage'), onPress: () => void pick('library')},
        {text: t('cancel'), style: 'cancel'},
      ]);
    } catch (error) {
      console.warn('Image pick error:', error);
      setImageError(t('imageSelectionFailed'));
    }
  };

  const clearImage = () => {
    setImagePath(null);
    setImageError(null);
  };

  return {imagePath, imageError, handleImagePick, clearImage};
}