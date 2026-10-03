import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import SearchInput from '../../../shared/components/SearchInput';
import AddNewHeaderButton from '../../../shared/components/AddNewHeaderButton';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {getListStyles} from '../../../shared/styles/list';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {COLORS} from '../../../shared/constants/colors';
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
  const {theme} = useThemeMode();
  const L = getListStyles(C, theme);
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

  const actionItems: ActionItem[] = selectedItem
    ? [
        {label: t('edit'), icon: 'edit', onPress: () => handleEdit(selectedItem)},
        {
          label: t('delete'),
          icon: 'delete',
          type: 'danger',
          onPress: () => handleDelete(selectedItem),
        },
      ]
    : [];

  const renderItem = ({item}: {item: ResourceListItem}) => {
    const imageUrl = resolveResourceMediaUrl(item.graphic_path);
    const description = stripHtml(item.short_description);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleOpen(item)}
        onLongPress={() => {
          if (!canManage) {
            return;
          }
          setSelectedItem(item);
          setActionsVisible(true);
        }}
        delayLongPress={300}>
        <View style={L.itemCard as any}>
          <View style={styles.row}>
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
              </Text>
              {description ? (
                <Text
                  style={[styles.description, {color: C.textSecondary}]}
                  numberOfLines={3}>
                  {description}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('resources')} />
        {canManage ? (
          <View style={styles.headerRow}>
            <AddNewHeaderButton
              name="AddNewResource"
              text={t('addNew')}
              style={{
                backgroundColor: C.surface,
                borderWidth: 1,
                borderColor: COLORS.mainColor,
              }}
              textStyle={{color: COLORS.mainColor}}
            />
          </View>
        ) : null}

        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('resourceSearchByName')}
        />

        {loading && !refreshing ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator color={COLORS.mainColor} />
          </View>
        ) : loadError && items.length === 0 ? (
          <ApiErrorState error={loadError} onRetry={fetchData} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <Text style={[styles.emptyText, {color: C.textSecondary}]}>
                {t('noDataFound')}
              </Text>
            }
          />
        )}
      </View>

      {canManage ? (
        <ActionSheetModal
          visible={actionsVisible}
          title={selectedItem?.name}
          actions={actionItems}
          onRequestClose={() => setActionsVisible(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: ms(12),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: ms(8),
    paddingBottom: ms(24),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumb: {
    width: ws(72),
    height: ws(72),
    borderRadius: rs(8),
    marginRight: ms(12),
  },
  thumbPlaceholder: {
    width: ws(72),
    height: ws(72),
    borderRadius: rs(8),
    borderWidth: 1,
    marginRight: ms(12),
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
  },
  name: {
    fontSize: fs(15),
    fontWeight: '700',
    marginBottom: ms(4),
  },
  description: {
    fontSize: fs(13),
    lineHeight: fs(18),
  },
  emptyText: {
    textAlign: 'center',
    marginTop: ms(24),
    fontSize: fs(14),
  },
});
