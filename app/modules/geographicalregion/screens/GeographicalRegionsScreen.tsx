import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  BackHandler,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {
  GeographicalRegionItem,
  hasChildRegions,
  listGeographicalRegionChildren,
  listGeographicalRegionRoots,
} from '../services/geographicalregion.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {COLORS} from '../../../shared/constants/colors';
import {fs, ms} from '../../../shared/utils/scale';
import SearchInput from '../../../shared/components/SearchInput';
import {
  EntityListCard,
  ListEmptyState,
  ListLoadState,
  ListToolbar,
  ScreenContainer,
  listContentStyle,
} from '../../../shared/components/crud';

/** Browses the region tree one level at a time: roots first, tap to drill in. */
export const GeographicalRegionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const C = useThemedColors();
  // Regions opened so far, root first; empty = showing the roots.
  const [path, setPath] = useState<GeographicalRegionItem[]>([]);
  const [items, setItems] = useState<GeographicalRegionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [query, setQuery] = useState('');

  const current = path.length ? path[path.length - 1] : null;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = current
        ? await listGeographicalRegionChildren(current.id)
        : await listGeographicalRegionRoots();
      setItems(res);
      setLoadError(null);
    } catch (e) {
      console.error(e);
      // A failed load shows a recoverable error, never the empty state.
      setLoadError(e);
    } finally {
      setLoading(false);
    }
  }, [current]);

  useEffect(() => {
    setItems([]);
    setQuery('');
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.reload) {
        navigation.setParams({reload: undefined});
        fetchData();
      }
    }, [route.params?.reload, fetchData]),
  );

  const goUp = useCallback(() => {
    if (!path.length) {
      return false;
    }
    setPath(prev => prev.slice(0, -1));
    return true;
  }, [path.length]);

  // Android back steps up one level before leaving the screen.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', goUp);
      return () => sub.remove();
    }, [goUp]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter(i => i.name?.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const renderItem = ({item}: {item: GeographicalRegionItem}) => {
    const expandable = hasChildRegions(item);
    return (
      <EntityListCard
        title={item.name}
        trailingText={expandable ? '›' : undefined}
        onPress={expandable ? () => setPath(prev => [...prev, item]) : undefined}
      />
    );
  };

  const isInitialLoading = loading && items.length === 0 && !refreshing;
  const title = t('geographicalRegions');

  return (
    <ScreenContainer
      title={current?.name || title}
      showMenu={!current}
      onBackPress={current ? goUp : undefined}>
      <ListToolbar
        countText={
          loadError && !items.length
            ? undefined
            : `${visibleItems.length} ${title.toLowerCase()}`
        }
        addRoute="AddGeographicalRegion"
        addParams={current ? {parentId: current.id} : undefined}
      />

      {!!current && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.breadcrumb}>
          {[null, ...path].map((node, index) => {
            const isLast = index === path.length;
            return (
              <View key={node?.id ?? 'root'} style={styles.crumbRow}>
                {index > 0 && (
                  <Text style={[styles.crumbSep, {color: C.textSecondary}]}>›</Text>
                )}
                <TouchableOpacity
                  disabled={isLast}
                  onPress={() => setPath(prev => prev.slice(0, index))}
                  accessibilityRole="button">
                  <Text
                    style={[
                      styles.crumb,
                      {color: isLast ? C.textPrimary : COLORS.mainColor},
                    ]}>
                    {node?.name ?? title}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}

      <SearchInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('search')}
      />

      <FlatList
        data={visibleItems}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        style={styles.flex}
        contentContainerStyle={listContentStyle}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          // Pull-to-refresh with no items: show nothing until it settles.
          isInitialLoading || !loading ? (
            <ListLoadState
              loading={isInitialLoading}
              error={loadError}
              onRetry={fetchData}>
              <ListEmptyState
                title={t('noDataFound')}
                hint={query ? undefined : t('emptyListHint')}
              />
            </ListLoadState>
          ) : null
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  breadcrumb: {
    alignItems: 'center',
    paddingBottom: ms(8),
  },
  crumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crumbSep: {
    fontSize: fs(14),
    marginHorizontal: ms(6),
  },
  crumb: {
    fontSize: fs(14),
    fontWeight: '600',
  },
});

export default GeographicalRegionsScreen;
