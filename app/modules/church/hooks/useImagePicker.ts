import {useState} from 'react';
import ImagePicker from 'react-native-image-crop-picker';
import {ActionSheetIOS, Alert, Platform} from 'react-native';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {
  ensureAndroidPermission,
  isPermissionError,
  promptPermissionSettings,
} from '../../../shared/utils/permissions';

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

  const pick = async (source: 'camera' | 'library') => {
    const targetWidth = config?.width ?? 300;
    const targetHeight = config?.height ?? 300;

    const ok = await ensureAndroidPermission(source, t('cancel') || 'Cancel');
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
        promptPermissionSettings(source, t('cancel') || 'Cancel');
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