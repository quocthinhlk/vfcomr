import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useReloadOnReturn} from '../../../shared/hooks/useReloadOnReturn';
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
import DraggableList from '../../../shared/components/DraggableList';
import FileTypeIcon from '../../../shared/components/icons/FileTypeIcon';
import {
  CancelButton,
  SaveButton,
} from '../../../shared/components/ActionButtons';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import ActionSheetModal, {ActionItem} from '../../../shared/components/ActionSheetModal';
import {
  ChevronRightIcon,
  FolderIcon,
  MoreIcon,
} from '../../../shared/components/icons/UiIcons';
import {useUiTokens} from '../../../shared/styles/uiTokens';
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

// Longer descriptions start collapsed to 4 lines with a Show more toggle.
const DESCRIPTION_PREVIEW_CHARS = 220;

export default function ResourceDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const resourceId: number | undefined = route.params?.resourceId;
  const {t} = useTranslation();
  const C = useThemedColors();
  const T = useUiTokens();

  const [resource, setResource] = useState<ResourceDetailItem | null>(null);
  const [formats, setFormats] = useState<ResourceFileFormatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [openingFileId, setOpeningFileId] = useState<number | null>(null);
  // True while a file/folder row is being dragged; freezes the page scroll.
  const [reordering, setReordering] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  // Which "…" menu is open: the resource itself, one file, or one child resource.
  const [menu, setMenu] = useState<
    | {kind: 'resource'}
    | {kind: 'file'; index: number; file: ResourceFileItem}
    | {kind: 'child'; index: number; child: ResourceListItem}
    | null
  >(null);

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
  useEffect(() => {
    load();
  }, [load]);

  // Back from a sub-folder keeps this screen as is; reload only after an edit / add.
  useReloadOnReturn(load, {
    dataKey: 'resources',
    reload: route.params?.reload,
    clearReload: () => navigation.setParams({reload: undefined}),
  });

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

  const moveFile = async (index: number, target: number) => {
    if (target === index || target < 0 || target >= files.length || !resourceId) {
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

  const moveChild = async (index: number, target: number) => {
    if (target === index || target < 0 || target >= children.length || !resourceId) {
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

  const fileKey = useCallback((file: ResourceFileItem) => String(file.id), []);
  const childKey = useCallback((child: ResourceListItem) => String(child.id), []);

  // One row per file: tap opens it; admins get Move / Edit / Delete in "…".
  const renderFileRow = (file: ResourceFileItem, index: number) => {
    const fileUrl = file.url || resolveResourceMediaUrl(file.path);
    const formatName = formatNameById.get(file.format_id || 0);
    const isOpenable = Boolean(fileUrl);
    const isOpening = openingFileId === file.id;
    const meta = [formatName, resourceLanguageLabel(file.lang, t), `${t('resourcePartNumber')} ${file.part_no}`]
      .filter(Boolean)
      .join(' · ');

    return (
      <Pressable
        key={file.id}
        disabled={!isOpenable || openingFileId != null}
        onPress={() => handleOpenFile(file, fileUrl)}
        accessibilityRole="button"
        accessibilityLabel={`${file.filename}, ${meta}`}
        accessibilityHint={isOpenable ? t('open') : undefined}
        style={({pressed}) => [
          styles.row,
          index > 0 && {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border},
          pressed && {backgroundColor: T.pressedBg},
        ]}>
        <FileTypeIcon filename={file.filename} size={ws(42)} />
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, {color: C.textPrimary}]} numberOfLines={2}>
            {file.filename}
          </Text>
          <Text style={[styles.rowMeta, {color: C.textSecondary}]}>{meta}</Text>
        </View>
        {isOpening ? (
          <ActivityIndicator size="small" color={T.brandText} />
        ) : isOpenable && !canManage ? (
          <ChevronRightIcon color={C.textSecondary} size={ws(16)} />
        ) : null}
        {canManage ? (
          <TouchableOpacity
            onPress={() => setMenu({kind: 'file', index, file})}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            style={styles.moreButton}
            accessibilityRole="button"
            accessibilityLabel={`${file.filename}: ${t('edit')}, ${t('delete')}`}>
            <MoreIcon color={C.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </Pressable>
    );
  };

  const renderChildRow = (child: ResourceListItem, index: number) => (
    <Pressable
      key={child.id}
      onPress={() => navigation.push('ResourceDetail', {resourceId: child.id})}
      accessibilityRole="button"
      accessibilityLabel={child.name}
      style={({pressed}) => [
        styles.row,
        index > 0 && {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border},
        pressed && {backgroundColor: T.pressedBg},
      ]}>
      <View style={[styles.rowTile, {backgroundColor: T.brandTint}]}>
        <FolderIcon color={T.brandText} size={ws(18)} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, {color: C.textPrimary}]} numberOfLines={2}>
          {child.name}
        </Text>
      </View>
      {canManage && children.length > 1 ? (
        <TouchableOpacity
          onPress={() => setMenu({kind: 'child', index, child})}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
          style={styles.moreButton}
          accessibilityRole="button"
          accessibilityLabel={`${child.name}: ${t('moveUp')}, ${t('moveDown')}`}>
          <MoreIcon color={C.textSecondary} />
        </TouchableOpacity>
      ) : null}
    </Pressable>
  );

  const renderSection = (
    title: string,
    count: number,
    action: {label: string; onPress: () => void} | null,
    body: React.ReactNode,
    emptyText: string,
  ) => (
    <View style={[styles.sectionCard, {backgroundColor: C.surface, borderColor: C.surfaceBorder}]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, {color: C.textPrimary}]} accessibilityRole="header">
          {title}
          {count > 0 ? (
            <Text style={[styles.sectionCount, {color: C.textSecondary}]}>{`  ·  ${count}`}</Text>
          ) : null}
        </Text>
        {action ? (
          <Pressable
            onPress={action.onPress}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={({pressed}) => [
              styles.sectionAction,
              {backgroundColor: pressed ? T.pressedBg : T.brandTint},
              busy && styles.disabled,
            ]}>
            <Text style={[styles.sectionActionText, {color: T.brandText}]}>{`+  ${action.label}`}</Text>
          </Pressable>
        ) : null}
      </View>
      {count === 0 ? (
        <Text style={[styles.emptyText, {color: C.textSecondary}]}>{emptyText}</Text>
      ) : (
        <View style={[styles.sectionList, {borderTopColor: C.border}]}>{body}</View>
      )}
    </View>
  );

  // Actions for the "…" menus (resource, a file, a child resource).
  const menuActions = ((): ActionItem[] => {
    if (!menu) {
      return [];
    }
    const run = (fn: () => void) => () => {
      setMenu(null);
      fn();
    };
    if (menu.kind === 'resource') {
      return [
        {
          label: t('edit'),
          icon: 'edit',
          onPress: run(() => navigation.navigate('EditResource', {resourceId: resource?.id})),
        },
        {label: t('delete'), icon: 'delete', type: 'danger', onPress: run(confirmDeleteResource)},
      ];
    }
    const list = menu.kind === 'file' ? files : children;
    const move = menu.kind === 'file' ? moveFile : moveChild;
    const items: ActionItem[] = [];
    if (menu.index > 0) {
      items.push({label: t('moveUp'), icon: 'moveUp', onPress: run(() => move(menu.index, menu.index - 1))});
    }
    if (menu.index < list.length - 1) {
      items.push({label: t('moveDown'), icon: 'moveDown', onPress: run(() => move(menu.index, menu.index + 1))});
    }
    if (menu.kind === 'file') {
      const file = menu.file;
      items.push(
        {label: t('edit'), icon: 'edit', onPress: run(() => openEditFileModal(file))},
        {label: t('delete'), icon: 'delete', type: 'danger', onPress: run(() => confirmDeleteFile(file))},
      );
    }
    return items;
  })();

  const menuTitle =
    menu?.kind === 'file'
      ? menu.file.filename
      : menu?.kind === 'child'
        ? menu.child.name
        : resource?.name;

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

  const languages = resource.available_languages ?? [];
  const longDescription = description.length > DESCRIPTION_PREVIEW_CHARS;

  return (
    <ScreenContainer title={t('resourceDetailTitle')}>
      <ScrollView
        scrollEnabled={!reordering}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Summary: cover, name, languages, description; admin actions in "…". */}
        <View style={[styles.heroCard, {backgroundColor: C.surface, borderColor: C.surfaceBorder}]}>
          {graphicUrl ? (
            <Image
              source={{uri: graphicUrl}}
              style={styles.heroImage}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : null}
          <View style={styles.heroBody}>
            <View style={styles.heroTitleRow}>
              <Text style={[styles.resourceTitle, {color: C.textPrimary}]} accessibilityRole="header">
                {resource.name}
              </Text>
              {canManage ? (
                <TouchableOpacity
                  onPress={() => setMenu({kind: 'resource'})}
                  disabled={busy}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                  style={[styles.heroMore, {backgroundColor: T.neutralTint}]}
                  accessibilityRole="button"
                  accessibilityLabel={`${resource.name}: ${t('edit')}, ${t('delete')}`}>
                  <MoreIcon color={C.textPrimary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {languages.length ? (
              <View style={styles.chips}>
                {languages.map(code => (
                  <View key={code} style={[styles.chip, {backgroundColor: T.neutralTint}]}>
                    <Text style={[styles.chipText, {color: T.neutralText}]}>
                      {resourceLanguageLabel(code, t)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {description ? (
              <>
                <Text
                  style={[styles.descriptionText, {color: C.textSecondary}]}
                  numberOfLines={longDescription && !descriptionExpanded ? 4 : undefined}>
                  {description}
                </Text>
                {longDescription ? (
                  <TouchableOpacity
                    onPress={() => setDescriptionExpanded(v => !v)}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                    accessibilityRole="button"
                    accessibilityState={{expanded: descriptionExpanded}}>
                    <Text style={[styles.moreText, {color: T.brandText}]}>
                      {descriptionExpanded ? t('showLess') : t('showMore')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : null}
          </View>
        </View>

        {renderSection(
          t('resourceFiles'),
          files.length,
          canManage ? {label: t('resourceUploadFile'), onPress: openUploadModal} : null,
          <DraggableList
            items={files}
            keyExtractor={fileKey}
            renderItem={renderFileRow}
            onReorder={moveFile}
            enabled={canManage && !busy}
            onDragStateChange={setReordering}
            draggingStyle={{backgroundColor: C.surface}}
          />,
          t('resourceNoFiles'),
        )}

        {renderSection(
          t('resourceChildren'),
          children.length,
          canManage
            ? {
                label: t('addNew'),
                onPress: () => navigation.navigate('AddNewResource', {parentId: resource.id}),
              }
            : null,
          <DraggableList
            items={children}
            keyExtractor={childKey}
            renderItem={renderChildRow}
            onReorder={moveChild}
            enabled={canManage && !busy}
            onDragStateChange={setReordering}
            draggingStyle={{backgroundColor: C.surface}}
          />,
          t('resourceNoChildren'),
        )}
      </ScrollView>

      <ActionSheetModal
        visible={!!menu}
        title={menuTitle}
        actions={menuActions}
        onRequestClose={() => setMenu(null)}
      />

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
    borderRadius: rs(14),
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  heroBody: {
    padding: ms(16),
    gap: ms(10),
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ms(12),
  },
  resourceTitle: {
    flex: 1,
    fontSize: fs(20),
    fontWeight: '700',
    lineHeight: fs(27),
  },
  heroMore: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(6),
  },
  chip: {
    borderRadius: 12,
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
  },
  chipText: {
    fontSize: fs(12),
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: fs(14),
    lineHeight: fs(21),
  },
  moreText: {
    fontSize: fs(13),
    fontWeight: '600',
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: rs(14),
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: ms(12),
    paddingHorizontal: ms(16),
    paddingVertical: ms(12),
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: fs(16),
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: fs(14),
    fontWeight: '500',
  },
  sectionAction: {
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: ms(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionActionText: {
    fontSize: fs(13),
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  sectionList: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  // Shared file / child row: tile, text, trailing control; >= 64pt tall.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(12),
    minHeight: 64,
    paddingVertical: ms(10),
    paddingLeft: ms(16),
    paddingRight: ms(8),
  },
  rowTile: {
    width: ws(42),
    height: ws(42),
    borderRadius: rs(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: fs(14),
    fontWeight: '600',
    lineHeight: fs(19),
  },
  rowMeta: {
    marginTop: ms(2),
    fontSize: fs(12),
    lineHeight: fs(17),
  },
  moreButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: fs(13),
    paddingHorizontal: ms(16),
    paddingBottom: ms(16),
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
