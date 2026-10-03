import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {Text} from '@ui-kitten/components';
import * as RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';
import {
  errorCodes,
  isErrorWithCode,
  pick,
  types as documentTypes,
} from '@react-native-documents/picker';
import AppInput from '../../../shared/components/AppInput';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import {
  CancelButton,
  SaveButton,
} from '../../../shared/components/ActionButtons';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import {EditSvgIcon, DeleteSvgIcon} from '../../../shared/components/icons';
import {
  ListEmptyState,
  ScreenContainer,
} from '../../../shared/components/crud';
import {formStyles} from '../../../shared/styles/form';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {COLORS} from '../../../shared/constants/colors';
import {fs, ms, rs, ws} from '../../../shared/utils/scale';
import {
  isSuperAdmin,
  resolveRoleIdFromUser,
} from '../../../shared/utils/permissions';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {returnToList} from '../../../shared/utils/returnToList';
import AddNewHeaderButton from '../../../shared/components/AddNewHeaderButton';
import api from '../../../config/api';
import type {TranslationKey} from '../../../shared/translations/types';
import {
  deleteResource,
  deleteResourceFile,
  getResourceById,
  listResourceFileFormats,
  reorderResourceChildren,
  reorderResourceFiles,
  resolveResourceMediaUrl,
  ResourceDetailItem,
  ResourceFileFormatItem,
  ResourceFileItem,
  ResourceListItem,
  updateResourceFile,
  uploadResourceFile,
} from '../services/resource.service';

function stripHtml(value?: string | null): string {
  if (!value) {
    return '';
  }
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .trim();
}

function getFileExtension(filename?: string) {
  if (!filename || !filename.includes('.')) {
    return 'FILE';
  }
  return filename.split('.').pop()?.toUpperCase() || 'FILE';
}

const LANGUAGE_NAME_KEYS: Record<string, TranslationKey> = {
  en: 'langEnglish',
  es: 'langSpanish',
  fr: 'langFrench',
  pt: 'langPortuguese',
  zh: 'langChinese',
  ms: 'langMalay',
  ja: 'langJapanese',
  vi: 'langVietnamese',
};

export const RESOURCE_LANGUAGE_CODES = [
  'en',
  'es',
  'fr',
  'pt',
  'zh',
  'ms',
  'ja',
  'vi',
] as const;

export function resourceLanguageLabel(
  code: string | null | undefined,
  t: (key: TranslationKey) => string,
): string {
  const normalized = (code ?? '').trim().toLowerCase();
  if (!normalized) {
    return '';
  }
  const key = LANGUAGE_NAME_KEYS[normalized];
  return key ? t(key) : code!.toUpperCase();
}

type FileModalMode = 'upload' | 'edit';

export default function ResourceDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const resourceId: number | undefined = route.params?.resourceId;
  const {t} = useTranslation();
  const C = useThemedColors();

  const [resource, setResource] = useState<ResourceDetailItem | null>(null);
  const [formats, setFormats] = useState<ResourceFileFormatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [openingFileId, setOpeningFileId] = useState<number | null>(null);

  const [fileModalVisible, setFileModalVisible] = useState(false);
  const [fileModalMode, setFileModalMode] = useState<FileModalMode>('upload');
  const [editingFile, setEditingFile] = useState<ResourceFileItem | null>(null);
  const [fileName, setFileName] = useState('');
  const [partNo, setPartNo] = useState('1');
  const [fileLang, setFileLang] = useState('en');
  const [formatId, setFormatId] = useState<number | null>(null);
  const [isAiTranslated, setIsAiTranslated] = useState(false);
  const [pickedFile, setPickedFile] = useState<{
    uri: string;
    type?: string;
    name?: string;
  } | null>(null);

  const canManage = isSuperAdmin(userRoleId);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/users/me');
        if (mounted) {
          setUserRoleId(resolveRoleIdFromUser(res?.data?.data));
        }
      } catch (error) {
        console.error(error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!resourceId) {
      setResource(null);
      setLoading(false);
      return;
    }
    try {
      setLoadError(null);
      setLoading(true);
      const [detailRes, formatRes] = await Promise.all([
        getResourceById(resourceId),
        listResourceFileFormats().catch(() => ({data: [] as ResourceFileFormatItem[]})),
      ]);
      setResource(detailRes.data ?? null);
      setFormats(formatRes.data ?? []);
    } catch (error) {
      console.error(error);
      setResource(null);
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  }, [resourceId]);
  useFocusEffect(
    useCallback(() => {
      // Always refresh when the screen comes into focus so edits are reflected.
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const formatNameById = useMemo(
    () => new Map(formats.map(item => [item.id, item.name] as const)),
    [formats],
  );

  const files = useMemo(() => {
    const list = [...(resource?.files ?? [])];
    return list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);
  }, [resource?.files]);

  const children = useMemo(() => {
    const list = [...(resource?.children ?? [])];
    return list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);
  }, [resource?.children]);

  const graphicUrl = resolveResourceMediaUrl(resource?.graphic_path);
  const description = stripHtml(resource?.short_description);

  const handleOpenFile = async (file: ResourceFileItem, url: string) => {
    if (!url || openingFileId != null) {
      return;
    }
    const safeName = (file.filename || `resource-${file.id}`)
      .replace(/[^\w.\-]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const localPath = `${RNFS.CachesDirectoryPath}/resource-${file.id}-${safeName}`;

    try {
      setOpeningFileId(file.id);
      const exists = await RNFS.exists(localPath);
      if (!exists) {
        const result = await RNFS.downloadFile({
          fromUrl: url,
          toFile: localPath,
        }).promise;
        if (result.statusCode < 200 || result.statusCode >= 300) {
          throw new Error(`Download failed (${result.statusCode})`);
        }
      }
      await FileViewer.open(localPath, {
        displayName: file.filename,
        showOpenWithDialog: false,
        showAppsSuggestions: false,
      });
    } catch (error) {
      Alert.alert(t('error'), getApiErrorMessage(error, t));
    } finally {
      setOpeningFileId(null);
    }
  };

  const confirmDeleteResource = () => {
    if (!resourceId) {
      return;
    }
    Alert.alert(t('delete'), t('resourceConfirmDelete'), [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            await deleteResource(resourceId);
            Alert.alert(t('success'), t('resourceDeleted'));
            returnToList(navigation);
          } catch (error) {
            Alert.alert(t('error'), getApiErrorMessage(error, t));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const moveFile = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= files.length || !resourceId) {
      return;
    }
    const previousFiles = [...files];
    const next = [...files];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    const reorderedFiles = next.map((file, orderIndex) => ({
      ...file,
      sort_order: orderIndex + 1,
    }));
    // Update locally so the ScrollView remains mounted and keeps its position.
    setResource(current =>
      current ? {...current, files: reorderedFiles} : current,
    );
    try {
      setBusy(true);
      await reorderResourceFiles(
        resourceId,
        reorderedFiles.map((file, orderIndex) => ({
          file_id: file.id,
          sort_order: orderIndex + 1,
        })),
      );
    } catch (error) {
      setResource(current =>
        current ? {...current, files: previousFiles} : current,
      );
      Alert.alert(t('error'), getApiErrorMessage(error, t));
    } finally {
      setBusy(false);
    }
  };

  const moveChild = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= children.length || !resourceId) {
      return;
    }
    const previousChildren = [...children];
    const next = [...children];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    const reorderedChildren = next.map((child, orderIndex) => ({
      ...child,
      sort_order: orderIndex + 1,
    }));
    setResource(current =>
      current ? {...current, children: reorderedChildren} : current,
    );
    try {
      setBusy(true);
      await reorderResourceChildren(
        resourceId,
        reorderedChildren.map((child, orderIndex) => ({
          resource_id: child.id,
          sort_order: orderIndex + 1,
        })),
      );
    } catch (error) {
      setResource(current =>
        current ? {...current, children: previousChildren} : current,
      );
      Alert.alert(t('error'), getApiErrorMessage(error, t));
    } finally {
      setBusy(false);
    }
  };

  const openUploadModal = () => {
    setFileModalMode('upload');
    setEditingFile(null);
    setFileName('');
    setPartNo('1');
    setFileLang(resource?.available_languages?.[0] || 'en');
    setFormatId(formats[0]?.id ?? null);
    setIsAiTranslated(false);
    setPickedFile(null);
    setFileModalVisible(true);
  };

  const openEditFileModal = (file: ResourceFileItem) => {
    setFileModalMode('edit');
    setEditingFile(file);
    setFileName(file.filename);
    setPartNo(String(file.part_no ?? 1));
    setFileLang(file.lang || 'en');
    setFormatId(file.format_id);
    setIsAiTranslated(Boolean(file.is_ai_translated));
    setPickedFile(null);
    setFileModalVisible(true);
  };

  const pickUploadFile = async () => {
    try {
      const [file] = await pick({
        type: [documentTypes.allFiles],
        allowMultiSelection: false,
        mode: 'import',
      });
      setPickedFile({
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: file.name || file.uri.split('/').pop() || 'resource-file',
      });
    } catch (error) {
      if (
        isErrorWithCode(error) &&
        error.code === errorCodes.OPERATION_CANCELED
      ) {
        return;
      }
      Alert.alert(t('error'), getApiErrorMessage(error, t));
    }
  };

  const submitFileModal = async () => {
    const parsedPart = Number(partNo);
    const partValue = Number.isFinite(parsedPart) && parsedPart > 0 ? parsedPart : 1;

    try {
      setBusy(true);
      if (fileModalMode === 'upload') {
        if (!resourceId || !formatId || !pickedFile) {
          Alert.alert(t('error'), t('fillRequiredFields'));
          return;
        }
        await uploadResourceFile({
          uri: pickedFile.uri,
          type: pickedFile.type,
          name: pickedFile.name,
          resourceId,
          formatId,
          partNo: partValue,
          lang: fileLang || 'en',
          isAiTranslated,
        });
        Alert.alert(t('success'), t('resourceFileUploaded'));
      } else if (editingFile) {
        if (!fileName.trim()) {
          Alert.alert(t('error'), t('fillRequiredFields'));
          return;
        }
        await updateResourceFile(editingFile.id, {
          filename: fileName.trim(),
          part_no: partValue,
          lang: fileLang || 'en',
          is_ai_translated: isAiTranslated,
        });
        Alert.alert(t('success'), t('resourceFileUpdated'));
      }
      setFileModalVisible(false);
      await load();
    } catch (error) {
      Alert.alert(t('error'), getApiErrorMessage(error, t));
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteFile = (file: ResourceFileItem) => {
    Alert.alert(t('delete'), t('resourceConfirmDelete'), [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            await deleteResourceFile(file.id);
            Alert.alert(t('success'), t('resourceFileDeleted'));
            await load();
          } catch (error) {
            Alert.alert(t('error'), getApiErrorMessage(error, t));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const renderFileRow = (file: ResourceFileItem, index: number) => {
    const fileUrl = file.url || resolveResourceMediaUrl(file.path);
    const fileTag =
      formatNameById.get(file.format_id || 0) || getFileExtension(file.filename);
    const isOpenable = Boolean(fileUrl);

    return (
      <View
        key={file.id}
        style={[
          styles.itemCard,
          {backgroundColor: C.inputBg, borderColor: C.inputBorder},
        ]}>
        <TouchableOpacity
          style={styles.listRowMain}
          activeOpacity={isOpenable ? 0.75 : 1}
          disabled={!isOpenable || openingFileId != null}
          onPress={() => handleOpenFile(file, fileUrl)}>
          <View style={[styles.fileBadge, {backgroundColor: C.bgSelectedOption}]}>
            <Text style={[styles.fileBadgeText, {color: COLORS.mainColor}]} numberOfLines={1}>
              {fileTag}
            </Text>
          </View>
          <View style={styles.listRowBody}>
            <Text style={[styles.fileName, {color: C.textPrimary}]} numberOfLines={2}>
              {file.filename}
            </Text>
            <Text style={[styles.fileMeta, {color: C.textSecondary}]}>
              {resourceLanguageLabel(file.lang, t)} · {t('resourcePartNumber')} {file.part_no}
            </Text>
          </View>
          <Text
            style={[
              styles.openHint,
              {color: isOpenable ? COLORS.mainColor : C.textSecondary},
            ]}>
            {openingFileId === file.id
              ? `${t('loading')}...`
              : isOpenable
                ? `${t('open')}  ›`
                : ''}
          </Text>
        </TouchableOpacity>
        {canManage ? (
          <View style={[styles.itemActions, {borderTopColor: C.inputBorder}]}>
            <View style={styles.reorderActions}>
              <TouchableOpacity
                style={styles.reorderButton}
                onPress={() => moveFile(index, -1)}
                disabled={busy || index === 0}>
                <Text
                  style={[
                    styles.reorderGlyph,
                    {color: index === 0 ? C.textSecondary : COLORS.mainColor},
                  ]}>
                  ↑
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reorderButton}
                onPress={() => moveFile(index, 1)}
                disabled={busy || index === files.length - 1}>
                <Text
                  style={[
                    styles.reorderGlyph,
                    {
                      color:
                        index === files.length - 1
                          ? C.textSecondary
                          : COLORS.mainColor,
                    },
                  ]}>
                  ↓
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.simpleIconButton}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel={t('edit')}
                onPress={() => openEditFileModal(file)}>
                <EditSvgIcon
                  width={fs(17)}
                  height={fs(17)}
                  color={COLORS.mainColor}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.simpleIconButton}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel={t('delete')}
                onPress={() => confirmDeleteFile(file)}>
                <DeleteSvgIcon
                  width={fs(17)}
                  height={fs(17)}
                  color={COLORS.dangerColor}
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  const renderChildRow = (child: ResourceListItem, index: number) => (
    <View
      key={child.id}
      style={[
        styles.itemCard,
        {backgroundColor: C.inputBg, borderColor: C.inputBorder},
      ]}>
      <TouchableOpacity
        style={styles.listRowMain}
        activeOpacity={0.75}
        onPress={() =>
          navigation.push('ResourceDetail', {resourceId: child.id})
        }>
        <View style={styles.listRowBody}>
          <Text style={[styles.childName, {color: C.textPrimary}]} numberOfLines={2}>
            {child.name}
          </Text>
        </View>
        <Text style={[styles.chevron, {color: C.textSecondary}]}>›</Text>
      </TouchableOpacity>
      {canManage ? (
        <View style={[styles.itemActions, {borderTopColor: C.inputBorder}]}>
          <View style={styles.reorderActions}>
            <TouchableOpacity
              style={styles.reorderButton}
              onPress={() => moveChild(index, -1)}
              disabled={busy || index === 0}>
              <Text
                style={[
                  styles.reorderGlyph,
                  {color: index === 0 ? C.textSecondary : COLORS.mainColor},
                ]}>
                ↑
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reorderButton}
              onPress={() => moveChild(index, 1)}
              disabled={busy || index === children.length - 1}>
              <Text
                style={[
                  styles.reorderGlyph,
                  {
                    color:
                      index === children.length - 1
                        ? C.textSecondary
                        : COLORS.mainColor,
                  },
                ]}>
                ↓
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );

  if (loading && !refreshing) {
    return <ScreenContainer title={t('resourceDetailTitle')} loading />;
  }

  if (!resource) {
    return (
      <ScreenContainer title={t('resourceDetailTitle')}>
        {loadError ? (
          <ApiErrorState error={loadError} onRetry={load} />
        ) : (
          <ListEmptyState />
        )}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title={t('resourceDetailTitle')}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          <View
            style={[
              styles.heroCard,
              {backgroundColor: C.surface, borderColor: C.surfaceBorder},
            ]}>
            {graphicUrl ? (
              <Image
                source={{uri: graphicUrl}}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : null}
            <View style={styles.heroBody}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryText}>
                  <Text style={[styles.resourceTitle, {color: C.textPrimary}]}>
                    {resource.name}
                  </Text>
                  {resource.available_languages?.length ? (
                    <View style={styles.metaWrap}>
                      {resource.available_languages.map(code => (
                        <View
                          key={code}
                          style={[
                            styles.metaChip,
                            {backgroundColor: C.bgSelectedOption},
                          ]}>
                          <Text
                            style={[
                              styles.metaChipText,
                              {color: C.textSecondary},
                            ]}>
                            {resourceLanguageLabel(code, t)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>

              {description ? (
                <Text style={[styles.descriptionText, {color: C.textSecondary}]}>
                  {description}
                </Text>
              ) : null}

              {canManage ? (
                <View style={styles.primaryActions}>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    style={styles.heroIconButton}
                    accessibilityRole="button"
                    accessibilityLabel={t('edit')}
                    onPress={() =>
                      navigation.navigate('EditResource', {
                        resourceId: resource.id,
                      })
                    }>
                    <EditSvgIcon
                      width={fs(19)}
                      height={fs(19)}
                      color={COLORS.mainColor}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    style={styles.heroIconButton}
                    accessibilityRole="button"
                    accessibilityLabel={t('delete')}
                    onPress={confirmDeleteResource}
                    disabled={busy}>
                    <DeleteSvgIcon
                      width={fs(19)}
                      height={fs(19)}
                      color={COLORS.dangerColor}
                    />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>

          <View
            style={[
              styles.sectionCard,
              {backgroundColor: C.surface, borderColor: C.surfaceBorder},
            ]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
                {t('resourceFiles')}
              </Text>
              {canManage ? (
                <TouchableOpacity
                  style={styles.sectionAction}
                  onPress={openUploadModal}
                  disabled={busy}>
                  <Text style={styles.sectionActionText}>
                    +{' '}
                    {t('resourceUploadFile')}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {files.length === 0 ? (
              <Text style={[styles.emptyText, {color: C.textSecondary}]}>
                {t('resourceNoFiles')}
              </Text>
            ) : (
              files.map(renderFileRow)
            )}
          </View>

          <View
            style={[
              styles.sectionCard,
              {backgroundColor: C.surface, borderColor: C.surfaceBorder},
            ]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
                {t('resourceChildren')}
              </Text>
              {canManage ? (
                <AddNewHeaderButton
                  name="AddNewResource"
                  params={{parentId: resource.id}}
                  text={t('addNew')}
                  style={{
                    backgroundColor: C.surface,
                    borderWidth: 1,
                    borderColor: COLORS.mainColor,
                    marginTop: 0,
                  }}
                  textStyle={{color: COLORS.mainColor}}
                />
              ) : null}
            </View>
            {children.length === 0 ? (
              <Text style={[styles.emptyText, {color: C.textSecondary}]}>
                {t('resourceNoChildren')}
              </Text>
            ) : (
              children.map(renderChildRow)
            )}
          </View>
        </ScrollView>

      <Modal
        visible={fileModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFileModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalKeyboardAvoider}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalBackdrop}>
            <ScrollView
              style={[styles.modalCard, {backgroundColor: C.surface}]}
              contentContainerStyle={styles.modalCardContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}>
            <Text style={[styles.modalTitle, {color: C.textPrimary}]}>
              {fileModalMode === 'upload'
                ? t('resourceUploadFile')
                : t('resourceEditFile')}
            </Text>
            {fileModalMode === 'edit' ? (
              <>
                <Text style={[formStyles.label, {color: C.textPrimary}]}>
                  {t('resourceFileName')}
                </Text>
                <AppInput value={fileName} onChangeText={setFileName} />
              </>
            ) : (
              <>
                <Text style={[formStyles.label, {color: C.textPrimary}]}>
                  {t('resourceFormat')}
                </Text>
                <ElementDropdown
                  data={formats.map(item => ({
                    label: item.name,
                    value: item.id,
                  }))}
                  value={formatId}
                  onChange={value =>
                    setFormatId(typeof value === 'number' ? value : Number(value))
                  }
                  placeholder={t('resourceSelectFormat')}
                  search={false}
                />
                <TouchableOpacity
                  onPress={pickUploadFile}
                  activeOpacity={0.7}
                  style={[styles.pickFileButton, {borderColor: COLORS.mainColor}]}>
                  <Text
                    style={[
                      styles.pickFileButtonText,
                      {color: COLORS.mainColor},
                    ]}
                    numberOfLines={1}>
                    {pickedFile?.name || t('resourcePickFile')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <Text style={[formStyles.label, styles.fieldGap, {color: C.textPrimary}]}>
              {t('resourcePartNumber')}
            </Text>
            <AppInput
              value={partNo}
              onChangeText={setPartNo}
              keyboardType="number-pad"
            />
            <Text style={[formStyles.label, styles.fieldGap, {color: C.textPrimary}]}>
              {t('resourceFileLanguage')}
            </Text>
            <ElementDropdown
              data={RESOURCE_LANGUAGE_CODES.map(code => ({
                label: resourceLanguageLabel(code, t),
                value: code,
              }))}
              value={fileLang || 'en'}
              onChange={value => setFileLang(String(value))}
              placeholder={t('resourceFileLanguage')}
              search={false}
            />
            <View style={styles.switchRow}>
              <Text style={[formStyles.label, {color: C.textPrimary, marginBottom: 0}]}>
                {t('resourceAiTranslated')}
              </Text>
              <Switch
                value={isAiTranslated}
                onValueChange={setIsAiTranslated}
              />
            </View>
            <View style={styles.modalActions}>
              <CancelButton
                label={t('cancel')}
                onPress={() => setFileModalVisible(false)}
                style={styles.adminButton}
              />
              <SaveButton
                label={busy ? t('saving') : t('save')}
                onPress={submitFileModal}
                disabled={busy}
                style={styles.adminButton}
              />
            </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: ms(12),
    paddingBottom: ms(28),
    gap: ms(16),
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: rs(12),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: rs(6),
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  heroImage: {
    width: '100%',
    height: ws(170),
  },
  heroBody: {
    padding: ms(16),
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  summaryText: {
    flex: 1,
    minWidth: 0,
  },
  resourceTitle: {
    fontSize: fs(19),
    fontWeight: '700',
    lineHeight: fs(25),
  },
  descriptionText: {
    fontSize: fs(14),
    lineHeight: fs(21),
    marginTop: ms(12),
  },
  metaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(6),
    marginTop: ms(6),
  },
  metaChip: {
    borderRadius: rs(12),
    paddingHorizontal: ms(9),
    paddingVertical: ms(3),
  },
  metaChipText: {
    fontSize: fs(11),
    fontWeight: '600',
  },
  primaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: ms(6),
    marginTop: ms(16),
  },
  heroIconButton: {
    width: ws(34),
    height: ws(34),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: rs(12),
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: ms(14),
  },
  sectionTitle: {
    fontSize: fs(16),
    fontWeight: '700',
  },
  sectionAction: {
    borderWidth: 1,
    borderColor: COLORS.mainColor,
    borderRadius: rs(6),
    paddingHorizontal: ms(10),
    paddingVertical: ms(6),
  },
  sectionActionText: {
    color: COLORS.mainColor,
    fontSize: fs(12),
    fontWeight: '600',
  },
  itemCard: {
    borderWidth: 0,
    borderTopWidth: 1,
    borderRadius: 0,
    marginBottom: 0,
  },
  listRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(12),
  },
  listRowBody: {
    flex: 1,
    minWidth: 0,
  },
  fileBadge: {
    borderRadius: rs(6),
    paddingHorizontal: ms(8),
    paddingVertical: ms(5),
    marginRight: ms(10),
    maxWidth: ws(82),
  },
  fileBadgeText: {
    fontSize: fs(10),
    fontWeight: '700',
  },
  fileName: {
    fontSize: fs(13),
    fontWeight: '600',
    lineHeight: fs(18),
  },
  fileMeta: {
    fontSize: fs(11),
    marginTop: ms(2),
  },
  openHint: {
    fontSize: fs(12),
    fontWeight: '600',
    marginLeft: ms(8),
  },
  chevron: {
    fontSize: fs(22),
    lineHeight: fs(22),
    marginLeft: ms(8),
  },
  childName: {
    fontSize: fs(14),
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
  },
  reorderActions: {
    flexDirection: 'row',
    gap: ms(6),
  },
  editActions: {
    flexDirection: 'row',
    gap: ms(4),
  },
  simpleIconButton: {
    width: ws(30),
    height: ws(30),
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderButton: {
    width: ws(30),
    height: ws(30),
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderGlyph: {
    fontSize: fs(17),
    fontWeight: '700',
  },
  emptyText: {
    fontSize: fs(13),
    paddingVertical: ms(16),
    textAlign: 'center',
  },
  modalKeyboardAvoider: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '92%',
    borderTopLeftRadius: rs(16),
    borderTopRightRadius: rs(16),
  },
  modalCardContent: {
    padding: ms(16),
    paddingBottom: ms(28),
  },
  modalTitle: {
    fontSize: fs(16),
    fontWeight: '700',
    marginBottom: ms(12),
  },
  fieldGap: {
    marginTop: ms(10),
  },
  pickFileButton: {
    marginTop: ms(10),
    borderWidth: 1,
    borderRadius: rs(6),
    paddingHorizontal: ms(10),
    paddingVertical: ms(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickFileButtonText: {
    fontSize: fs(13),
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: ms(12),
  },
  modalActions: {
    flexDirection: 'row',
    gap: ms(12),
    marginTop: ms(16),
  },
  adminButton: {
    flex: 1,
  },
});
