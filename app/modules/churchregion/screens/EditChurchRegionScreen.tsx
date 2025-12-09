import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, TextInput, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@ui-kitten/components';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '../../../shared/components/Header';
import { globalStyles } from '../../../shared/styles/global';
import { formStyles } from '../../../shared/styles/form';
import { getChurchRegionById, updateChurchRegion, getChurchRegionHierarchy } from '../services/churchregion.service';
import { SaveButton, CancelButton } from '../../../shared/components/ActionButtons';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';
import { useThemeMode } from '../../../shared/context/ThemeContext';
import ElementDropdown, { ElementDropdownItem } from '../../../shared/components/ElementDropdown';
import { useImagePicker } from '../../church/hooks/useImagePicker';
import api from '../../../config/api';
import { Col, Row, Grid } from 'react-native-easy-grid';

export const EditChurchRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchRegionId: number | undefined = route.params?.churchRegionId;
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [options, setOptions] = useState<ElementDropdownItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const [originalLogoUrl, setOriginalLogoUrl] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const { t } = useTranslation();
  const C = useThemedColors();
  const { theme } = useThemeMode();
  const { imagePath, handleImagePick, clearImage } = useImagePicker();
  
  // Reset imageRemoved flag when user picks a new image
  useEffect(() => {
    if (imagePath) {
      setImageRemoved(false);
    }
  }, [imagePath]);

  useEffect(() => {
    let mounted = true;
    if (churchRegionId) {
      getChurchRegionById(churchRegionId).then(res => {
        if (!mounted) return;
        const data = res?.data?.data || res?.data;
        setName(data?.name || '');
        setParentId(data?.parent_id ?? null);
        const logoUrl = data?.logo_url || null;
        setExistingLogoUrl(logoUrl);
        setOriginalLogoUrl(logoUrl);
      }).catch(() => {});
    }
    return () => { (mounted = false); };
  }, [churchRegionId]);

  useEffect(() => {
    let mounted = true;
    const fetchHierarchy = async () => {
      try {
        const resp = await getChurchRegionHierarchy();
        const tree = (resp?.data ?? resp) as any[];
        const out: ElementDropdownItem[] = [];
        const walk = (nodes: any[], depth: number) => {
          nodes?.forEach(n => {
            out.push({ label: `${'— '.repeat(depth)}${n.name}`, value: n.id });
            if (n.children && n.children.length) walk(n.children, depth + 1);
          });
        };
        walk(tree || [], 0);
        if (mounted) setOptions(out);
      } catch {}
    };
    fetchHierarchy();
    return () => { mounted = false; };
  }, []);

  const onSave = async () => {
    if (!churchRegionId) return;
    if (!name.trim()) {
      Alert.alert(t('validation') || 'Validation', t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      
      const updateData: any = { 
        name: name.trim(), 
        parent_id: parentId ?? null
      };
      
      // Determine if image was changed
      const imageChanged = imagePath || (imageRemoved && !existingLogoUrl);
      
      if (imageChanged) {
        if (imagePath) {
          // User uploaded a new image
          const form = new FormData();
          const fileName = imagePath.split('/').pop() || 'logo.jpg';
          form.append('file', { uri: imagePath, name: fileName, type: 'image/jpeg' } as any);
          form.append('entity_type', 'church-regions');
          form.append('alt_text', name.trim());
          const uploadRes = await api.post('images/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
          updateData.logo_path = uploadRes?.data?.data?.path || '';
        } else if (imageRemoved && !existingLogoUrl) {
          // User removed the image without uploading a new one
          updateData.logo_path = '';
        }
      }
      // If no image change, don't include logo_path in update
      
      await updateChurchRegion(churchRegionId, updateData);
      Alert.alert(t('success') || 'Success', `${t('churchApostolicRegions')}: ${t('edit')} ${t('success')}`);
      navigation.navigate('ChurchRegions', { reload: true });
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to update church region');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}>
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <View style={styles.container}>
          <Grid>
            <Row>
              <Col>
                <Header title={`${t('edit')} ${t('churchApostolicRegions')}`} showMenu={false} />
                <Text style={[formStyles.label, { color: C.textPrimary, marginTop: 12 }]}>{t('churchRegion') || t('churchApostolicRegions')}</Text>
                <TextInput
                  style={[
                    formStyles.textField,
                    {
                      marginTop: 4,
                      marginBottom: 12,
                      borderColor: (C as any).inputBorder || C.border,
                      color: C.textPrimary,
                      backgroundColor: (C as any).card || C.background,
                    },
                  ]}
                  placeholder={t('churchRegion') || t('churchApostolicRegions')}
                  placeholderTextColor={C.textSecondary}
                  value={name}
                  onChangeText={setName}
                />
                <Text style={[formStyles.label, { color: C.textPrimary }]}>{t('churchParent')}</Text>
                <ElementDropdown
                  data={options}
                  value={parentId}
                  onChange={(v) => setParentId((typeof v === 'number' ? v : Number(v)) || null)}
                  placeholder={t('churchParent')}
                  containerStyle={{ marginBottom: 8 }}
                />
                
                <Text style={[formStyles.label, { color: C.textPrimary }]}>{t('logo')}</Text>
                <TouchableOpacity
                  onPress={handleImagePick}
                  style={[formStyles.avatarSquare as any, { backgroundColor: C.inputBg, borderColor: (C as any).inputBorder || C.border }] as any}>
                  {imagePath ? (
                    <>
                      <Image source={{ uri: imagePath }} style={formStyles.avatarImage as any} resizeMode="cover" />
                      <TouchableOpacity onPress={clearImage} style={formStyles.avatarClose as any}>
                        <Text style={{ color: '#fff' }}>✗</Text>
                      </TouchableOpacity>
                    </>
                  ) : existingLogoUrl ? (
                    <>
                      <Image source={{ uri: existingLogoUrl }} style={formStyles.avatarImage as any} resizeMode="cover" />
                      <TouchableOpacity
                        onPress={() => {
                          setExistingLogoUrl(null);
                          setImageRemoved(true);
                        }}
                        style={formStyles.avatarClose as any}>
                        <Text style={{ color: '#fff' }}>✗</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <Text style={[formStyles.avatarPlus as any, { color: C.textSecondary }] as any}>+</Text>
                  )}
                </TouchableOpacity>
                
                <View style={[formStyles.buttonRow, { marginTop: 24 }]}>
                  <CancelButton label={t('cancel')} onPress={() => navigation.goBack()} disabled={submitting} />
                  <SaveButton label={t('save')} onPress={onSave} disabled={submitting} />
                </View>
              </Col>
            </Row>
          </Grid>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: 16,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    color: '#000',
  },
  label: {
    marginTop: 8,
    marginBottom: 4,
    color: '#333',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
});

export default EditChurchRegionScreen;


