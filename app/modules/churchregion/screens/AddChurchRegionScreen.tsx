import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {formStyles} from '../../../shared/styles/form';
import {
  createChurchRegion,
  getChurchRegionHierarchy,
} from '../services/churchregion.service';
import {
  SaveButton,
  CancelButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import ElementDropdown, {
  ElementDropdownItem,
} from '../../../shared/components/ElementDropdown';
import {useImagePicker} from '../../church/hooks/useImagePicker';
import api from '../../../config/api';
import {Col, Row, Grid} from 'react-native-easy-grid';
import {fs, ws, hs, ms, rs} from '../../../shared/utils/scale';

export const AddChurchRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [options, setOptions] = useState<ElementDropdownItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const {t} = useTranslation();
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const {imagePath, handleImagePick, clearImage} = useImagePicker();

  useEffect(() => {
    let mounted = true;
    const fetchHierarchy = async () => {
      try {
        const resp = await getChurchRegionHierarchy();
        const tree = (resp?.data ?? resp) as any[];
        const out: ElementDropdownItem[] = [];
        const walk = (nodes: any[], depth: number) => {
          nodes?.forEach(n => {
            out.push({label: `${'— '.repeat(depth)}${n.name}`, value: n.id});
            if (n.children && n.children.length) {
              walk(n.children, depth + 1);
            }
          });
        };
        walk(tree || [], 0);
        if (mounted) {
          setOptions(out);
        }
      } catch {}
    };
    fetchHierarchy();
    return () => {
      mounted = false;
    };
  }, []);

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('validation') || 'Validation', t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      
      // Upload image first if selected
      let uploadedLogoPath: string | null = null;
      if (imagePath) {
        const form = new FormData();
        const fileName = imagePath.split('/').pop() || 'logo.jpg';
        form.append('file', { uri: imagePath, name: fileName, type: 'image/jpeg' } as any);
        form.append('entity_type', 'church-regions');
        form.append('alt_text', name.trim());
        const uploadRes = await api.post('images/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        uploadedLogoPath = uploadRes?.data?.data?.path || null;
      }
      
      await createChurchRegion({
        name: name.trim(),
        parent_id: parentId ?? null,
        logo_path: uploadedLogoPath ?? undefined,
      } as any);
      Alert.alert(t('success') || 'Success', `${t('churchApostolicRegions')}: ${t('add')} ${t('success')}`);
      navigation.navigate('ChurchRegions', { reload: true });
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', e?.message || 'Failed to create church region');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={{flex: 1, backgroundColor: C.background}}>
        <View style={styles.container}>
          <Grid>
            <Row>
              <Col>
                <Header
                  title={`${t('addNew')} ${t('churchApostolicRegions')}`}
                  showMenu={false}
                />
                <Text
                  style={[
                    formStyles.label,
                    {color: C.textPrimary, marginTop: ms(12)},
                  ]}>
                  {t('churchRegion') || t('churchApostolicRegions')}
                </Text>
                <TextInput
                  style={[
                    formStyles.textField,
                    {
                      marginTop: ms(4),
                      marginBottom: ms(12),
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
                <Text
                  style={[formStyles.label, {color: C.textPrimary}]}>
                  {t('churchParent')}
                </Text>
                <ElementDropdown
                  data={options}
                  value={parentId}
                  onChange={v =>
                    setParentId(
                      (typeof v === 'number' ? v : Number(v)) || null,
                    )
                  }
                  placeholder={t('churchParent')}
                  containerStyle={{marginBottom: ms(8)}}
                />

                <Text style={[formStyles.label, {color: C.textPrimary}]}>
                  {t('logo')}
                </Text>
                <TouchableOpacity
                  onPress={handleImagePick}
                  style={
                    [
                      formStyles.avatarSquare as any,
                      {
                        backgroundColor: C.inputBg,
                        borderColor: (C as any).inputBorder || C.border,
                      },
                    ] as any
                  }>
                  {imagePath ? (
                    <>
                      <Image
                        source={{uri: imagePath}}
                        style={formStyles.avatarImage as any}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        onPress={clearImage}
                        style={formStyles.avatarClose as any}>
                        <Text style={{color: '#fff'}}>✗</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <Text
                      style={
                        [formStyles.avatarPlus as any, {color: C.textSecondary}] as any
                      }>
                      +
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={[formStyles.buttonRow, {marginTop: ms(24)}]}>
                  <CancelButton
                    label={t('cancel')}
                    onPress={() => navigation.goBack()}
                    disabled={submitting}
                  />
                  <SaveButton
                    label={t('save')}
                    onPress={onSave}
                    disabled={submitting}
                  />
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
    paddingLeft: ms(16),
    paddingRight: ms(16),
  },
  input: {
    height: hs(44),
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: rs(6),
    paddingHorizontal: ms(12),
    color: '#000',
  },
  label: {
    marginTop: ms(8),
    marginBottom: ms(4),
    color: '#333',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    marginTop: ms(24),
    gap: ms(12),
  },
});

export default AddChurchRegionScreen;


