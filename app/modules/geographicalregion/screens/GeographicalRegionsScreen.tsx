import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {FlatList, Platform, Pressable, RefreshControl, StyleSheet, View} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {
  GeographicalRegionItem,
  GeographicalRegionTreeNode,
  getGeographicalRegionTree,
} from '../services/geographicalregion.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useUiTokens} from '../../../shared/styles/uiTokens';
import {fs, ms, ws} from '../../../shared/utils/scale';
import SearchInput from '../../../shared/components/SearchInput';
import ActionSheetModal, {ActionItem} from '../../../shared/components/ActionSheetModal';
import {SelectionSheet} from '../../../shared/components/SelectionSheet';
import {ChevronRightIcon} from '../../../shared/components/icons/UiIcons';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import {
  EntityListCard,
  ListEmptyState,
  ListLoadState,
  ListPageBar,
  ListToolbar,
  ScreenContainer,
  listContentStyle,
} from '../../../shared/components/crud';

/** One region below the chosen top-level region, with the names above it. */
type RegionRow = {
  node: GeographicalRegionTreeNode;
  /** Ancestors from the top-level region down, e.g. "Worldwide › South East Asia". */
  path: string;
  searchText: string;
};

/** Route params carry the plain record, not its (possibly huge) subtree. */
const toParam = (node: GeographicalRegionTreeNode): GeographicalRegionItem => ({
  id: node.id,
  parent_id: node.parent_id,
  left: node.left,
  right: node.right,
  name: node.name,
});

/** Every region under `root`, parents before children (same order as the web list). */
const flattenUnder = (root: GeographicalRegionTreeNode): RegionRow[] => {
  const rows: RegionRow[] = [];
  const walk = (nodes: GeographicalRegionTreeNode[] | undefined, names: string[]) => {
    nodes?.forEach(node => {
      const path = names.join(' › ');
      rows.push({node, path, searchText: `${path} ${node.name}`.toLowerCase()});
      walk(node.children, [...names, node.name]);
    });
  };
  walk(root.children, [root.name]);
  return rows;
};

const countUnder = (node: GeographicalRegionTreeNode): number =>
  (node.children ?? []).reduce((sum, child) => sum + 1 + countUnder(child), 0);

/**
 * Mirrors the web list "Geographical Regions under: WORLDWIDE": one flat list
 * of every region below a top-level region, each with its full path and ID.
 * Data: GET geographical-regions (the whole tree in `data.items`).
 */
export const GeographicalRegionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const C = useThemedColors();
  const T = useUiTokens();

  const [tree, setTree] = useState<GeographicalRegionTreeNode[]>([]);
  const [rootId, setRootId] = useState<number | null>(null);
  const [rootPickerOpen, setRootPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<GeographicalRegionTreeNode | null>(null);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setTree(await getGeographicalRegionTree());
      setLoadError(null);
    } catch (e) {
      console.error(e);
      // A failed load shows a recoverable error, never the empty state.
      setLoadError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.reload) {
        navigation.setParams({reload: undefined});
        fetchData();
      }
    }, [route.params?.reload, fetchData, navigation]),
  );

  // Default to "Worldwide" (what the web shows); keep the choice across reloads.
  const root = useMemo(() => {
    if (!tree.length) {
      return null;
    }
    return (
      tree.find(n => n.id === rootId) ??
      tree.find(n => n.name?.trim().toLowerCase() === 'worldwide') ??
      tree[0]
    );
  }, [tree, rootId]);

  const allRows = useMemo(() => (root ? flattenUnder(root) : []), [root]);

  const q = query.trim().toLowerCase();
  const rows = useMemo(
    () => (q ? allRows.filter(r => r.searchText.includes(q)) : allRows),
    [allRows, q],
  );

  // The whole tree is already loaded, so pages are cut on the device.
  const totalPages = Math.max(1, Math.ceil(rows.length / DEFAULT_PAGE_LIMIT));
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => rows.slice((currentPage - 1) * DEFAULT_PAGE_LIMIT, currentPage * DEFAULT_PAGE_LIMIT),
    [rows, currentPage],
  );
  // A new search or another top-level region starts again at page 1.
  useEffect(() => {
    setPage(1);
  }, [q, root?.id]);
  const goToPage = (target: number) => {
    if (target >= 1 && target <= totalPages) {
      setPage(target);
    }
  };

  const rootItems = useMemo(
    () =>
      tree.map(n => ({
        key: n.id,
        title: n.name,
        subtitle: `${countUnder(n)} ${t('geographicalRegions').toLowerCase()}`,
      })),
    [tree, t],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const renderItem = ({item}: {item: RegionRow}) => (
    <EntityListCard
      title={item.node.name}
      trailingText={`#${item.node.id}`}
      onPress={() => navigation.navigate('EditGeographicalRegion', {region: toParam(item.node)})}
      onMorePress={() => setSelected(item.node)}>
      {item.path ? (
        <Text style={[styles.path, {color: C.textSecondary}]}>{item.path}</Text>
      ) : null}
    </EntityListCard>
  );

  const isInitialLoading = loading && tree.length === 0 && !refreshing;
  const title = t('geographicalRegions');
  const canSwitchRoot = tree.length > 1;

  return (
    <ScreenContainer title={title} showMenu>
      <ListToolbar
        countText={loadError && !tree.length ? undefined : `${rows.length} ${title.toLowerCase()}`}
        addRoute="AddGeographicalRegion"
        addParams={root ? {parentId: root.id} : undefined}
      />

      {root ? (
        // "Under: Worldwide" — tap to list another top-level region.
        <Pressable
          onPress={canSwitchRoot ? () => setRootPickerOpen(true) : undefined}
          disabled={!canSwitchRoot}
          accessibilityRole={canSwitchRoot ? 'button' : 'text'}
          accessibilityLabel={`${t('geoRegionsUnder')}: ${root.name}`}
          accessibilityHint={canSwitchRoot ? t('geoRegionChooseRoot') : undefined}
          style={({pressed}) => [
            styles.rootRow,
            {backgroundColor: pressed ? T.pressedBg : T.brandTint},
          ]}>
          <Text style={[styles.rootLabel, {color: C.textSecondary}]}>{t('geoRegionsUnder')}</Text>
          <Text style={[styles.rootName, {color: T.brandText}]} numberOfLines={1}>
            {root.name}
          </Text>
          {canSwitchRoot ? (
            <View style={styles.chevronDown}>
              <ChevronRightIcon color={T.brandText} size={ws(12)} />
            </View>
          ) : null}
        </Pressable>
      ) : null}

      <SearchInput value={query} onChangeText={setQuery} placeholder={t('search')} />

      <View style={styles.listArea}>
        <PaginatedListPager page={currentPage} totalPages={totalPages} onPageChange={goToPage}>
          <FlatList
            data={pageRows}
            keyExtractor={item => String(item.node.id)}
            renderItem={renderItem}
            style={styles.flex}
            contentContainerStyle={listContentStyle}
            nestedScrollEnabled={Platform.OS === 'android'}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              // Pull-to-refresh with no items: show nothing until it settles.
              isInitialLoading || !loading ? (
                <ListLoadState loading={isInitialLoading} error={loadError} onRetry={fetchData}>
                  <ListEmptyState
                    title={t('noDataFound')}
                    hint={query ? undefined : t('emptyListHint')}
                  />
                </ListLoadState>
              ) : null
            }
          />
        </PaginatedListPager>
      </View>

      <ListPageBar
        page={currentPage}
        totalPages={totalPages}
        loading={loading}
        onPageChange={goToPage}
      />

      <SelectionSheet
        visible={rootPickerOpen}
        title={t('geoRegionChooseRoot')}
        items={rootItems}
        selectedKey={root?.id}
        onSelect={key => {
          setRootId(Number(key));
          setQuery('');
        }}
        onClose={() => setRootPickerOpen(false)}
      />

      <ActionSheetModal
        visible={!!selected}
        title={selected?.name || title}
        onRequestClose={() => setSelected(null)}
        actions={((): ActionItem[] => {
          const go = (routeName: string) => () => {
            if (selected) {
              navigation.navigate(routeName, {region: toParam(selected)});
            }
            setSelected(null);
          };
          // Delete opens a confirmation screen, never deletes directly.
          return [
            {label: t('edit'), icon: 'edit', onPress: go('EditGeographicalRegion')},
            {
              label: t('delete'),
              icon: 'delete',
              type: 'danger',
              onPress: go('DeleteGeographicalRegion'),
            },
          ];
        })()}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  listArea: {flex: 1, minHeight: 0},
  rootRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    gap: ms(6),
    minHeight: 36,
    paddingHorizontal: ms(12),
    borderRadius: 18,
    marginBottom: ms(8),
  },
  rootLabel: {
    fontSize: fs(13),
  },
  rootName: {
    fontSize: fs(14),
    fontWeight: '700',
    flexShrink: 1,
  },
  chevronDown: {
    transform: [{rotate: '90deg'}],
  },
  path: {
    marginTop: ms(2),
    fontSize: fs(12),
    lineHeight: fs(17),
  },
});

export default GeographicalRegionsScreen;
