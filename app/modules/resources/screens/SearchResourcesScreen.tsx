import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {markDataChanged, useReloadOnReturn} from '../../../shared/hooks/useReloadOnReturn';
import SearchInput from '../../../shared/components/SearchInput';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import {
  CenteredLoader,
  ListEmptyState,
  ListToolbar,
  ScreenContainer,
  listContentStyle,
} from '../../../shared/components/crud';
import {MoreIcon} from '../../../shared/components/icons/UiIcons';
import {useThemedColors} from '../../../shared/styles/theme';
import {useUiTokens} from '../../../shared/styles/uiTokens';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs, ms, rs, ws} from '../../../shared/utils/scale';
import {isSuperAdmin, resolveRoleIdFromUser} from '../../../shared/utils/permissions';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import api from '../../../config/api';
import {
  deleteResource,
  listResources,
  resolveResourceMediaUrl,
  ResourceListItem,
  getResourceById,
} from '../services/resource.service';
import {stripHtml} from '../utils/resource.utils';

export default function SearchResourcesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useThemedColors();
  const T = useUiTokens();
  const {t} = useTranslation();

  const [items, setItems] = useState<ResourceListItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ResourceListItem | null>(null);
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

  // Only the newest search may write: answers arriving out of order
  // showed the results of an older search.
  const requestRef = useRef(0);
  const fetchData = useCallback(async (showSpinner = true) => {
    const requestId = ++requestRef.current;
    const isCurrent = () => requestId === requestRef.current;
    try {
      setLoadError(null);
      if (showSpinner) {
        setLoading(true);
      }
      const name = query.trim();
      const res = await listResources(
        name ? {name} : {root_only: true},
      );
      if (isCurrent()) {
        setItems(res.data ?? []);
      }
    } catch (error) {
      if (isCurrent()) {
        console.error(error);
        setItems([]);
        setLoadError(error);
      }
    } finally {
      if (isCurrent()) {
        setLoading(false);
      }
    }
  }, [query]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Back from detail keeps the list as is; reload only after a change.
  useReloadOnReturn(() => fetchData(false), {
    dataKey: 'resources',
    reload: route.params?.reload,
    clearReload: () => navigation.setParams({reload: undefined}),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(false);
    setRefreshing(false);
  };

  const handleOpen = (item: ResourceListItem) => {
    navigation.navigate('ResourceDetail', {resourceId: item.id});
  };

  const handleEdit = (item: ResourceListItem) => {
    navigation.navigate('EditResource', {resourceId: item.id});
  };

  const deletingRef = useRef(false);
  const handleDelete = async (item: ResourceListItem) => {
    // The API deletes a folder and leaves its children pointing at a missing
    // parent; the list does not say whether there are any, so ask the detail.
    try {
      const childCount = (await getResourceById(item.id)).data?.children?.length ?? 0;
      if (childCount > 0) {
        Alert.alert(t('error'), t('resourceHasChildren').replace('{count}', String(childCount)));
        return;
      }
    } catch (error) {
      Alert.alert(t('error'), getApiErrorMessage(error, t));
      return;
    }
    Alert.alert(t('delete'), t('resourceConfirmDelete'), [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          if (deletingRef.current) {
            return;
          }
          deletingRef.current = true;
          try {
            await deleteResource(item.id);
            markDataChanged('resources');
            Alert.alert(t('success'), t('resourceDeleted'));
            fetchData(false);
          } catch (error) {
            Alert.alert(t('error'), getApiErrorMessage(error, t));
          } finally {
            deletingRef.current = false;
          }
        },
      },
    ]);
  };

  const openActions = (item: ResourceListItem) => {
    if (!canManage) {
      return;
    }
    setSelectedItem(item);
    setActionsVisible(true);
  };

  const closeActions = () => setActionsVisible(false);

  // Close the sheet first so navigation / the delete Alert are not shown
  // underneath it. Delete still goes through the existing Alert confirmation.
  const actionItems: ActionItem[] = selectedItem
    ? [
        {
          label: t('view'),
          icon: 'view',
          onPress: () => {
            closeActions();
            handleOpen(selectedItem);
          },
        },
        {
          label: t('edit'),
          icon: 'edit',
          onPress: () => {
            closeActions();
            handleEdit(selectedItem);
          },
        },
        {
          label: t('delete'),
          icon: 'delete',
          type: 'danger',
          onPress: () => {
            closeActions();
            handleDelete(selectedItem);
          },
        },
      ]
    : [];

  const renderItem = ({item}: {item: ResourceListItem}) => {
    const imageUrl = resolveResourceMediaUrl(item.graphic_path);
    const description = stripHtml(item.short_description);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleOpen(item)}
        onLongPress={() => openActions(item)}
        delayLongPress={300}
        accessibilityRole="button"
        accessibilityLabel={item.name}
        style={[
          styles.card,
          {
            backgroundColor: C.surface,
            borderColor: C.surfaceBorder,
            shadowOpacity: T.shadowOpacity,
          },
        ]}>
        {imageUrl ? (
          <Image source={{uri: imageUrl}} style={styles.thumb} />
        ) : (
          <View
            style={[
              styles.thumbPlaceholder,
              {backgroundColor: C.inputBg, borderColor: C.inputBorder},
            ]}>
            <Text style={[styles.thumbPlaceholderText, {color: C.textSecondary}]}>
              {t('resourceNoImageAvailable')}
            </Text>
          </View>
        )}
        <View style={styles.itemBody}>
          <Text
            style={[styles.name, {color: C.textPrimary}, canManage && styles.nameWithMore]}
            numberOfLines={2}>
            {item.name}
          </Text>
          {/* Description on the left, #id pinned bottom-right (like the other lists). */}
          <View style={styles.bottomRow}>
            <View style={styles.bottomText}>
              {description ? (
                <Text
                  style={[styles.description, {color: C.textSecondary}]}
                  numberOfLines={3}>
                  {description}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.listId, {color: C.textSecondary}]}>{`#${item.id}`}</Text>
          </View>
        </View>
        {canManage ? (
          <TouchableOpacity
            onPress={() => openActions(item)}
            hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
            style={styles.moreBtn}
            accessibilityRole="button"
            accessibilityLabel={`${t('moreActions')}: ${item.name}`}>
            <MoreIcon color={C.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer title={t('resources')} showMenu>
      <ListToolbar
        countText={
          loading && !refreshing
            ? undefined
            : `${items.length} ${t('resources').toLowerCase()}`
        }
        addRoute={canManage ? 'AddNewResource' : undefined}
      />

      <SearchInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('resourceSearchByName')}
      />

      {loading && !refreshing ? (
        <CenteredLoader />
      ) : loadError && items.length === 0 ? (
        <ApiErrorState error={loadError} onRetry={() => fetchData()} />
      ) : (
        <FlatList
          data={items}
          // With the search keyboard open the first tap on a card only
          // closed the keyboard (Android).
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={listContentStyle}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <ListEmptyState
              title={query.trim() ? t('resourceNoResults') : undefined}
              hint={query.trim() ? t('tryDifferentSearchKeyword') : undefined}
            />
          }
        />
      )}

      {canManage ? (
        <ActionSheetModal
          visible={actionsVisible}
          title={selectedItem?.name}
          actions={actionItems}
          onRequestClose={closeActions}
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // Record id after the title, like the shared list cards.
  listId: {
    fontSize: fs(12),
    fontWeight: '500',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(12),
    paddingVertical: ms(12),
    paddingHorizontal: ms(16),
    marginBottom: ms(10),
    borderRadius: rs(12),
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowRadius: rs(6),
    shadowOffset: {width: 0, height: 2},
    elevation: 1,
  },
  thumb: {
    width: ws(64),
    height: ws(64),
    borderRadius: rs(8),
  },
  thumbPlaceholder: {
    width: ws(64),
    height: ws(64),
    borderRadius: rs(8),
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(4),
  },
  thumbPlaceholderText: {
    fontSize: fs(10),
    textAlign: 'center',
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
    gap: ms(6),
  },
  name: {
    fontSize: fs(15),
    fontWeight: '600',
    lineHeight: fs(20),
  },
  description: {
    fontSize: fs(13),
    lineHeight: fs(18),
  },
  nameWithMore: {
    paddingRight: 32,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: ms(8),
  },
  bottomText: {
    flex: 1,
    minWidth: 0,
  },
  // Floats over the card's top-right corner, like ChurchListCard.
  moreBtn: {
    position: 'absolute',
    top: ms(2),
    right: ms(2),
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
});
