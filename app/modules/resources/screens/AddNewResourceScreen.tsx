import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import AppInput from '../../../shared/components/AppInput';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import {
  FormActions,
  FormField,
  ScreenContainer,
} from '../../../shared/components/crud';
import {formStyles} from '../../../shared/styles/form';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useImagePicker} from '../../church/hooks/useImagePicker';
import {isSuperAdmin, resolveRoleIdFromUser} from '../../../shared/utils/permissions';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {COLORS} from '../../../shared/constants/colors';
import {fs, ms, rs, ws} from '../../../shared/utils/scale';
import api from '../../../config/api';
import {
  createResource,
  getResourceById,
  listResources,
  resolveResourceMediaUrl,
  updateResource,
} from '../services/resource.service';
import {
  RESOURCE_LANGUAGE_CODES,
  resourceLanguageLabel,
} from './ResourceDetailScreen';

export default function AddNewResourceScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useThemedColors();
  const {t, selectedLanguage} = useTranslation();
  const {imagePath, handleImagePick, clearImage} = useImagePicker({
    freeAspect: true,
  });

  const resourceId: number | undefined = route.params?.resourceId;
  const presetParentId: number | undefined = route.params?.parentId;
  const isEdit = typeof resourceId === 'number';

  const [checkingRole, setCheckingRole] = useState(true);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Role check / parent list failures (e.g. offline) show a retryable error
  // instead of kicking the user out or an empty Parent dropdown (which in edit
  // mode would drop the saved parent on save).
  const [roleError, setRoleError] = useState<unknown>(null);
  const [roleRetryKey, setRoleRetryKey] = useState(0);
  const [parentsLoading, setParentsLoading] = useState(true);
  const [parentsError, setParentsError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const [invalidFields, setInvalidFields] = useState({
    name: false,
    languages: false,
  });
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(presetParentId ?? null);
  const [shortDescription, setShortDescription] = useState('');
  const [graphicPath, setGraphicPath] = useState('');
  const [languages, setLanguages] = useState<string[]>(['en']);
  const [sortOrder, setSortOrder] = useState('1');
  const [fileIds, setFileIds] = useState<number[]>([]);
  const [childIds, setChildIds] = useState<number[]>([]);
  const [parentOptions, setParentOptions] = useState<{label: string; value: number}[]>(
    [],
  );
  const scrollRef = useRef<ScrollView>(null);
  const fieldPositions = useRef({name: 0, languages: 0});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setCheckingRole(true);
        setRoleError(null);
        const res = await api.get('/users/me');
        if (!mounted) {
          return;
        }
        const roleId = resolveRoleIdFromUser(res?.data?.data);
        if (!isSuperAdmin(roleId)) {
          Alert.alert(t('error'), t('accessDenied'));
          navigation.goBack();
          return;
        }
      } catch (error) {
        if (mounted) {
          setRoleError(error);
        }
      } finally {
        if (mounted) {
          setCheckingRole(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigation, selectedLanguage, roleRetryKey]);

  const loadParents = useCallback(async () => {
    try {
      setParentsLoading(true);
      setParentsError(null);
      const res = await listResources();
      setParentOptions(
        (res.data ?? [])
          .filter(item => item.id !== resourceId)
          .map(item => ({label: item.name, value: item.id})),
      );
    } catch (error) {
      console.error(error);
      setParentsError(error);
    } finally {
      setParentsLoading(false);
    }
  }, [resourceId]);

  const retryLoad = () => {
    if (roleError) {
      setRoleRetryKey(k => k + 1);
    }
    if (loadError) {
      setReloadKey(k => k + 1);
    }
    if (parentsError) {
      loadParents();
    }
  };

  useEffect(() => {
    loadParents();
  }, [loadParents]);

  useEffect(() => {
    if (!isEdit || !resourceId) {
      return;
    }
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getResourceById(resourceId);
        const detail = res.data;
        if (!mounted || !detail) {
          return;
        }
        setName(detail.name ?? '');
        setParentId(detail.parent_id ?? null);
        setShortDescription(detail.short_description ?? '');
        setGraphicPath(detail.graphic_path ?? '');
        setLanguages(
          Array.isArray(detail.available_languages) &&
            detail.available_languages.length > 0
            ? detail.available_languages
            : ['en'],
        );
        setSortOrder(String(detail.sort_order ?? 1));
        setFileIds((detail.files ?? []).map(file => file.id));
        setChildIds((detail.children ?? []).map(child => child.id));
        setLoadError(null);
      } catch (error) {
        // Show a recoverable error instead of a blank edit form that could be saved.
        console.error(error);
        if (mounted) {
          setLoadError(error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isEdit, resourceId, selectedLanguage, reloadKey]);

  const previewUri = useMemo(() => {
    if (imagePath) {
      return imagePath.startsWith('file://') ? imagePath : `file://${imagePath}`;
    }
    return resolveResourceMediaUrl(graphicPath);
  }, [graphicPath, imagePath]);

  // Dynamic aspect ratio for the graphic preview so that images
  // are not visually cropped or distorted in a fixed 16:9 frame.
  const [previewAspect, setPreviewAspect] = useState<number | null>(null);

  useEffect(() => {
    if (!previewUri) {
      setPreviewAspect(null);
      return;
    }
    // Measure the intrinsic size of the image to derive its aspect ratio.
    // Ignore errors quietly; we will fall back to a default height.
    Image.getSize(
      previewUri,
      (width, height) => {
        if (width > 0 && height > 0) {
          setPreviewAspect(width / height);
        }
      },
      () => {
        setPreviewAspect(null);
      },
    );
  }, [previewUri]);

  const toggleLanguage = (code: string) => {
    setInvalidFields(current => ({...current, languages: false}));
    setLanguages(current =>
      current.includes(code)
        ? current.filter(item => item !== code)
        : [...current, code],
    );
  };

  const uploadGraphicIfNeeded = async (): Promise<string> => {
    if (!imagePath) {
      return graphicPath.trim();
    }
    const form = new FormData();
    const fileName = imagePath.split('/').pop() || 'resource.jpg';
    form.append('file', {
      uri: imagePath.startsWith('file://') ? imagePath : `file://${imagePath}`,
      name: fileName,
      type: 'image/jpeg',
    } as any);
    form.append('entity_type', 'resources');
    form.append('alt_text', name.trim() || 'resource');
    const uploadRes = await api.post('/images/upload', form, {
      headers: {'Content-Type': 'multipart/form-data'},
    });
    return (
      uploadRes?.data?.data?.path ||
      uploadRes?.data?.path ||
      graphicPath.trim()
    );
  };

  const onSave = async () => {
    const nextInvalid = {
      name: !name.trim(),
      languages: languages.length === 0,
    };
    setInvalidFields(nextInvalid);
    if (nextInvalid.name || nextInvalid.languages) {
      const firstInvalidY = nextInvalid.name
        ? fieldPositions.current.name
        : fieldPositions.current.languages;
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          y: Math.max(0, firstInvalidY - ms(12)),
          animated: true,
        });
      });
      Alert.alert(t('error'), t('fillRequiredFields'));
      return;
    }
    const parsedSort = Number(sortOrder);
    const sortValue = Number.isFinite(parsedSort) && parsedSort > 0 ? parsedSort : 1;

    try {
      setSubmitting(true);
      const uploadedPath = await uploadGraphicIfNeeded();
      const payload = {
        name: name.trim(),
        parent_id: parentId,
        short_description: shortDescription.trim() || null,
        graphic_path: uploadedPath || '',
        available_languages: languages,
        sort_order: sortValue,
        file_ids: fileIds,
        child_ids: childIds,
      };

      if (isEdit && resourceId) {
        await updateResource(resourceId, payload);
        markDataChanged('resources');
        Alert.alert(t('success'), t('resourceUpdated'));
        returnAfterEdit(navigation);
      } else {
        const created = await createResource(payload);
        markDataChanged('resources');
        const newId = created?.data?.resource_id;
        Alert.alert(t('success'), t('resourceCreated'));
        if (typeof newId === 'number') {
          navigation.replace('ResourceDetail', {resourceId: newId});
        } else {
          navigation.navigate('Resources', {reload: true});
        }
      }
    } catch (error) {
      Alert.alert(t('error'), getApiErrorMessage(error, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      title={isEdit ? t('editResource') : t('addNewResource')}
      loading={checkingRole || loading || parentsLoading}
      error={roleError || loadError || parentsError}
      onRetry={retryLoad}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View
            style={styles.detailsSection}>
            <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
              {t('details')}
            </Text>

            <View
              onLayout={event => {
                fieldPositions.current.name = event.nativeEvent.layout.y;
              }}>
              <FormField
                label={t('name')}
                required
                error={invalidFields.name ? t('required') : undefined}>
                <AppInput
                  value={name}
                  onChangeText={value => {
                    setName(value);
                    if (invalidFields.name) {
                      setInvalidFields(current => ({...current, name: false}));
                    }
                  }}
                  placeholder={t('name')}
                  error={invalidFields.name}
                />
              </FormField>
            </View>

            <FormField label={t('resourceParent')}>
              <ElementDropdown
                data={[
                  {label: t('resourceRootFolder'), value: -1},
                  ...parentOptions,
                ]}
                value={parentId ?? -1}
                onChange={value => {
                  const next = typeof value === 'number' ? value : Number(value);
                  setParentId(!next || next < 0 ? null : next);
                }}
                placeholder={t('resourceSelectParent')}
                search
              />
            </FormField>

            <FormField label={t('resourceShortDescription')}>
              <AppInput
                value={shortDescription}
                onChangeText={setShortDescription}
                placeholder={t('resourceShortDescription')}
                multiline
                containerStyle={styles.multiline}
                style={styles.multilineInput}
              />
            </FormField>
          </View>

          <View style={styles.plainSection}>
            <Text style={[formStyles.label, {color: C.textPrimary}]}>
              {t('resourceGraphic')}
            </Text>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleImagePick}
              style={[
                styles.graphicPicker,
                previewAspect != null
                  ? {height: undefined, aspectRatio: previewAspect}
                  : {height: ws(170)},
                {
                  backgroundColor: C.inputBg,
                  borderColor: previewUri ? C.surfaceBorder : COLORS.mainColor,
                },
              ]}>
              {previewUri ? (
                <>
                  <Image
                    source={{uri: previewUri}}
                    style={styles.preview}
                    resizeMode="contain"
                  />
                  <View style={styles.changeImageBadge}>
                    <Text style={styles.changeImageText}>{t('selectImage')}</Text>
                  </View>
                </>
              ) : (
                <View style={styles.emptyGraphic}>
                  <Text style={styles.uploadIcon}>＋</Text>
                  <Text style={styles.selectImageText}>{t('selectImage')}</Text>
                </View>
              )}
            </TouchableOpacity>
            {imagePath || graphicPath ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  clearImage();
                  setGraphicPath('');
                }}
                style={styles.removeImageButton}>
                <Text style={styles.removeImageText}>{t('delete')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View
            onLayout={event => {
              fieldPositions.current.languages = event.nativeEvent.layout.y;
            }}
            style={styles.plainSection}>
            <Text
              style={[
                formStyles.label,
                {
                  color: invalidFields.languages
                    ? COLORS.dangerColor
                    : C.textPrimary,
                },
              ]}>
              {t('resourceAvailableLanguages')}{' '}
              <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.chipWrap}>
              {RESOURCE_LANGUAGE_CODES.map(code => {
                const selected = languages.includes(code);
                return (
                  <TouchableOpacity
                    key={code}
                    activeOpacity={0.7}
                    style={[
                      styles.chip,
                      {
                        borderColor: invalidFields.languages
                          ? COLORS.dangerColor
                          : selected
                            ? COLORS.mainColor
                            : C.inputBorder,
                        backgroundColor: selected
                          ? COLORS.mainColor
                          : C.inputBg,
                      },
                    ]}
                    onPress={() => toggleLanguage(code)}>
                    <Text
                      style={[
                        styles.chipText,
                        {color: selected ? COLORS.white : C.textPrimary},
                      ]}>
                      {selected ? '✓ ' : ''}
                      {resourceLanguageLabel(code, t)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <FormField label={t('resourceSortOrder')}>
              <AppInput
                value={sortOrder}
                onChangeText={setSortOrder}
                keyboardType="number-pad"
                placeholder="1"
              />
            </FormField>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {backgroundColor: C.background, borderTopColor: C.surfaceBorder},
          ]}>
          <FormActions
            onCancel={() => navigation.goBack()}
            onSave={onSave}
            submitting={submitting}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: ms(12),
    paddingBottom: ms(24),
    gap: ms(14),
  },
  detailsSection: {
    paddingTop: ms(4),
  },
  plainSection: {
    paddingTop: ms(4),
  },
  sectionTitle: {
    fontSize: fs(17),
    fontWeight: '700',
    marginBottom: ms(16),
  },
  required: {
    color: COLORS.dangerColor,
  },
  multiline: {
    minHeight: ws(100),
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingVertical: ms(8),
  },
  multilineInput: {
    width: '100%',
    height: ws(100),
    paddingTop: ms(8),
    paddingBottom: ms(8),
  },
  graphicPicker: {
    width: '100%',
    borderRadius: rs(12),
    borderWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  emptyGraphic: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(6),
  },
  uploadIcon: {
    color: COLORS.mainColor,
    fontSize: fs(30),
    fontWeight: '300',
  },
  selectImageText: {
    color: COLORS.mainColor,
    fontSize: fs(14),
    fontWeight: '600',
  },
  changeImageBadge: {
    position: 'absolute',
    right: ms(10),
    bottom: ms(10),
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: rs(16),
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
  },
  changeImageText: {
    color: COLORS.white,
    fontSize: fs(11),
    fontWeight: '600',
  },
  removeImageButton: {
    alignSelf: 'flex-end',
    paddingTop: ms(10),
    paddingHorizontal: ms(4),
  },
  removeImageText: {
    color: COLORS.dangerColor,
    fontSize: fs(13),
    fontWeight: '600',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(8),
    marginBottom: ms(16),
  },
  chip: {
    borderWidth: 1,
    borderRadius: rs(18),
    paddingHorizontal: ms(12),
    paddingVertical: ms(7),
  },
  chipText: {
    fontSize: fs(12),
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: ms(4),
    paddingBottom: ms(8),
  },
});
