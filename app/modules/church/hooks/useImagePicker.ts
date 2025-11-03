import { useState } from 'react';
import ImagePicker from 'react-native-image-crop-picker';
import { Alert } from 'react-native';

interface ImagePickerResult {
  path: string;
  size: number;
}

export function useImagePicker() {
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const handleImagePick = async () => {
    try {
      const image: ImagePickerResult = await ImagePicker.openPicker({
        width: 300,
        height: 300,
        cropping: true,
        cropperCircleOverlay: false,
        compressImageMaxWidth: 1024,
        compressImageMaxHeight: 1024,
        compressImageQuality: 0.8,
        includeBase64: false,
      });

      if (image.size > 1572864) { // 1.5 MB
        Alert.alert('File too large', 'Please select an image under 1.5MB');
        setImageError('File too large');
        return;
      }

      if (image?.path) {
        setImagePath(image.path);
        setImageError(null);
      }
    } catch (error) {
      console.warn('Image pick error:', error);
      setImageError('Image selection failed');
    }
  };

  const clearImage = () => {
    setImagePath(null);
    setImageError(null);
  };

  return { imagePath, imageError, handleImagePick, clearImage };
} 