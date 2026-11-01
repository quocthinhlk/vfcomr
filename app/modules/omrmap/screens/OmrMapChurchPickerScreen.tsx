import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, Platform, RefreshControl, StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import SearchInput from '../../../shared/components/SearchInput';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import {
  CardMeta,
  EntityListCard,
  ListEmptyState,
  ListLoadState,
  ListPageBar,
  ScreenContainer,
  StatusBadge,
  listContentStyle,
} from '../../../shared/components/crud';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms} from '../../../shared/utils/scale';
import {fixMojibake} from '../../../shared/utils/displayText';
import {usePagedList} from '../../user/hooks/usePagedList';
import {ChurchListItem, getChurchesList} from '../../church/services/church.service';
import {ChurchMapLocation, getChurchMapLocations} from '../services/omrMap.service';

type PickedPoint = {latitude: number; longitude: number};

/**
 * OMR Map → Add location: pick the church whose map location is added (or
 * changed). Opened with a point when the map was held down there; the church
 * is then placed at that point. Hands over to EditChurchLocation, which saves
 * and returns straight to the map.
 */
export default function OmrMapChurchPickerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const C = useThemedColors();
  const [query, setQuery] = useState('');
  /** Churches that already have a location (id → location); the list API has no coordinates. */
  const [located, setLocated] = useState<Map<number, ChurchMapLocation>>(new Map());

  const lat = Number(route.params?.latitude);
  const lng = Number(route.params?.longitude);
  const point: PickedPoint | null =
    route.params?.latitude != null && Number.isFinite(lat) && Number.isFinite(lng)
      ? {latitude: lat, longitude: lng}
      : null;

  useEffect(() => {
    let active = true;
    getChurchMapLocations()
      .then(list => {
        if (active) {
          setLocated(new Map(list.map(c => [c.id, c])));
        }
      })
      .catch(() => {
        // Only the "On map" badges are missing; picking still works.
      });
    return () => {
      active = false;
    };
  }, []);

  const fetchPage = useCallback(
    (page: number, search: string) =>
      getChurchesList({
        page,
        limit: DEFAULT_PAGE_LIMIT,
        search: search || undefined,
        disabled: false,
        sort_by: 'name',
        sort_desc: false,
      }),
    [],
  );
  const {items, page, totalPages, loading, refreshing, loadError, goToPage, retry, onRefresh} =
    usePagedList<ChurchListItem>(fetchPage, query);

  const pick = (church: ChurchListItem) => {
    const current = located.get(church.id);
    const start = point ?? (current ? {latitude: current.latitude, longitude: current.longitude} : null);
    // Replace: after Save / Cancel the editor returns to the map, not here.
    navigation.replace('EditChurchLocation', {
      id: church.id,
      latitude: start?.latitude,
      longitude: start?.longitude,
    });
  };

  const renderItem = ({item}: {item: ChurchListItem}) => {
    const name = fixMojibake(item.name || '—');
    const place = [item.city, item.country_name].filter(Boolean).map(v => fixMojibake(String(v))).join(', ');
    const onMap = located.has(item.id);
    return (
      <EntityListCard
        title={name}
        trailingText={`#${item.id}`}
        accessibilityLabel={`${name}, ${onMap ? t('onMap') : t('noMapLocation')}, #${item.id}`}
        onPress={() => pick(item)}>
        {place ? <CardMeta>{place}</CardMeta> : null}
        <View style={styles.badges}>
          <StatusBadge
            label={onMap ? t('onMap') : t('noMapLocation')}
            tone={onMap ? 'success' : 'warning'}
          />
        </View>
      </EntityListCard>
    );
  };

  return (
    <ScreenContainer title={t('addChurchLocation')}>
      <Text style={[styles.hint, {color: C.textSecondary}]}>
        {point ? t('pickChurchForPoint') : t('pickChurchForLocation')}
      </Text>
      <SearchInput value={query} onChangeText={setQuery} placeholder={t('search')} />
      <View style={styles.flex}>
        <PaginatedListPager page={page} totalPages={totalPages} onPageChange={goToPage}>
          <FlatList
            data={items}
            keyExtractor={item => String(item.id)}
            renderItem={renderItem}
            nestedScrollEnabled={Platform.OS === 'android'}
            keyboardShouldPersistTaps="handled"
            style={styles.flex}
            contentContainerStyle={listContentStyle}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <ListLoadState loading={loading && !refreshing} error={loadError} onRetry={retry}>
                <ListEmptyState title={query ? t('noResultsFound') : t('noChurchesFound')} />
              </ListLoadState>
            }
          />
        </PaginatedListPager>
      </View>
      <ListPageBar page={page} totalPages={totalPages} loading={loading} onPageChange={goToPage} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1, minHeight: 0},
  hint: {fontSize: fs(13), lineHeight: fs(18), marginBottom: ms(8)},
  badges: {flexDirection: 'row', marginTop: ms(4)},
});
