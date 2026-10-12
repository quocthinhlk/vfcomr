import React, {useCallback, useEffect, useState} from 'react';
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
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
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
} from '../services/resource.service';

function stripHtml(value?: string | null): string {
  if (!value) {
    return '';
  }
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

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

  const fetchData = useCallback(async (showSpinner = true) => {
    try {
      setLoadError(null);
      if (showSpinner) {
        setLoading(true);
      }
      const name = query.trim();
      const res = await listResources(
        name ? {name} : {root_only: true},
      );
      setItems(res.data ?? []);
    } catch (error) {
      console.error(error);
      setItems([]);
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.reload) {
        navigation.setParams({reload: undefined});
      }
      fetchData();
    }, [fetchData, navigation, route.params?.reload]),
  );

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

  const handleDelete = (item: ResourceListItem) => {
    Alert.alert(t('delete'), t('resourceConfirmDelete'), [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteResource(item.id);
            Alert.alert(t('success'), t('resourceDeleted'));
            fetchData();
          } catch (error) {
            Alert.alert(t('error'), getApiErrorMessage(error, t));
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
            paddingRight: canManage ? ms(4) : ms(16),
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
          <Text style={[styles.name, {color: C.textPrimary}]} numberOfLines={2}>
            {item.name}
            <Text style={[styles.listId, {color: C.textSecondary}]}>{`  #${item.id}`}</Text>
          </Text>
          {description ? (
            <Text
              style={[styles.description, {color: C.textSecondary}]}
              numberOfLines={3}>
              {description}
            </Text>
          ) : null}
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
        <ApiErrorState error={loadError} onRetry={fetchData} />
      ) : (
        <FlatList
          data={items}
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
    paddingLeft: ms(16),
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
  moreBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
});
