import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import MapView, {MapPressEvent, Marker, Region} from 'react-native-maps';
import api from '../../../config/api';
import {Header} from '../../../shared/components/Header';
import ElementDropdown, {ElementDropdownItem} from '../../../shared/components/ElementDropdown';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useUiTokens} from '../../../shared/styles/uiTokens';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {globalStyles} from '../../../shared/styles/global';
import {COLORS} from '../../../shared/constants/colors';
import {fs, ms, rs} from '../../../shared/utils/scale';
import {fixMojibake} from '../../../shared/utils/displayText';
import {useLatestRequest} from '../../church/hooks/useLatestRequest';
import {ChurchMapLocation, getChurchMapLocations} from '../services/omrMap.service';
import {
  clusterLabel,
  clusterLocations,
  isSameSpot,
  MapCluster,
  normalizeRegion,
  regionToBounds,
} from '../utils/mapClusters';

const WORLD: Region = {latitude: 15, longitude: 100, latitudeDelta: 140, longitudeDelta: 360};
const FIT_PADDING = {top: 160, right: 60, bottom: 120, left: 60};
/** Zoomed in this far, a cluster that still holds several churches is shown as a list. */
const LIST_BELOW_DELTA = 0.02;

/** Geographical regions tree → dropdown items, children prefixed with "-" per level. */
function flattenRegions(nodes: any[], depth = 0): ElementDropdownItem[] {
  const out: ElementDropdownItem[] = [];
  (nodes ?? []).forEach(node => {
    out.push({label: `${'-'.repeat(depth)}${depth ? ' ' : ''}${node.name}`, value: Number(node.id)});
    if (Array.isArray(node.children) && node.children.length) {
      out.push(...flattenRegions(node.children, Math.min(depth + 1, 6)));
    }
  });
  return out;
}

/**
 * OMR Map (Admin): every church with map coordinates. The visible area is
 * fetched from churches/map-locations as the map moves; churches close
 * together on screen are grouped (tap to zoom in, or to list them when they
 * share a spot). Tapping a church shows its details and opens its page.
 */
export default function OmrMapScreen() {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  const C = useThemedColors();
  const T = useUiTokens();
  const {theme} = useThemeMode();
  const mapRef = useRef<MapView | null>(null);
  const {begin, debounce, cancel} = useLatestRequest();

  const [regionOptions, setRegionOptions] = useState<ElementDropdownItem[]>([]);
  const [geoRegionId, setGeoRegionId] = useState<number | null>(null);
  const [locations, setLocations] = useState<ChurchMapLocation[]>([]);
  const [mapRegion, setMapRegion] = useState<Region>(WORLD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  /** Churches shown in the bottom card (one marker, or a group at the same spot). */
  const [selected, setSelected] = useState<ChurchMapLocation[] | null>(null);
  const geoRegionIdRef = useRef(geoRegionId);
  geoRegionIdRef.current = geoRegionId;
  /** The map can't be moved before it is ready: a fit asked for earlier waits here. */
  const mapReadyRef = useRef(false);
  const pendingFitRef = useRef<ChurchMapLocation[] | null>(null);
  /** While all churches of the filter load, map moves don't fetch their area. */
  const loadingAllRef = useRef(false);

  useEffect(() => {
    let active = true;
    api
      .get('geographical-regions', {params: {sort_by: 'name', sort_desc: false}})
      .then(res => {
        if (active) {
          setRegionOptions(flattenRegions(res?.data?.data?.items ?? []));
        }
      })
      .catch(() => {
        // The filter is optional: the map works without it.
      });
    return () => {
      active = false;
    };
  }, []);

  const fitTo = useCallback((list: ChurchMapLocation[]) => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) {
      pendingFitRef.current = list;
      return;
    }
    if (list.length === 0) {
      // Nothing to show: keep the current view (the "no churches" note explains).
      return;
    } else if (list.length === 1 || isSameSpot(list)) {
      map.animateToRegion(
        {latitude: list[0].latitude, longitude: list[0].longitude, latitudeDelta: 0.05, longitudeDelta: 0.05},
        400,
      );
    } else {
      map.fitToCoordinates(
        list.map(c => ({latitude: c.latitude, longitude: c.longitude})),
        {edgePadding: FIT_PADDING, animated: true},
      );
    }
  }, []);

  /** All churches of the region filter, then the map zooms to show them. */
  const loadAndFit = useCallback(async () => {
    cancel('area');
    const isLatest = begin('map');
    loadingAllRef.current = true;
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const list = await getChurchMapLocations({geographicalRegionId: geoRegionIdRef.current});
      if (!isLatest()) {
        return;
      }
      setLocations(list);
      fitTo(list);
    } catch (e) {
      if (isLatest()) {
        setError(e);
      }
    } finally {
      if (isLatest()) {
        loadingAllRef.current = false;
        setLoading(false);
      }
    }
  }, [begin, cancel, fitTo]);

  useEffect(() => {
    loadAndFit();
  }, [geoRegionId, loadAndFit]);

  /** Churches inside the area on screen (after the map stops moving). */
  const loadArea = useCallback(
    async (region: Region) => {
      const isLatest = begin('map');
      setLoading(true);
      try {
        const list = await getChurchMapLocations({
          geographicalRegionId: geoRegionIdRef.current,
          bounds: regionToBounds(region),
        });
        if (!isLatest()) {
          return;
        }
        setLocations(list);
        setError(null);
      } catch (e) {
        // Keep the churches on screen; offer a retry.
        if (isLatest()) {
          setError(e);
        }
      } finally {
        if (isLatest()) {
          setLoading(false);
        }
      }
    },
    [begin],
  );

  const onRegionChangeComplete = (rawRegion: Region) => {
    const region = normalizeRegion(rawRegion);
    setMapRegion(region);
    if (!loadingAllRef.current) {
      debounce('area', () => loadArea(region), 450);
    }
  };

  const onMapReady = () => {
    mapReadyRef.current = true;
    const pending = pendingFitRef.current;
    pendingFitRef.current = null;
    if (pending) {
      fitTo(pending);
    }
  };

  const clusters = useMemo(() => clusterLocations(locations, mapRegion), [locations, mapRegion]);

  const onClusterPress = (cluster: MapCluster) => {
    if (cluster.churches.length === 1 || isSameSpot(cluster.churches) || mapRegion.longitudeDelta < LIST_BELOW_DELTA) {
      setSelected(cluster.churches);
      return;
    }
    setSelected(null);
    fitTo(cluster.churches);
  };

  const onMapPress = (event: MapPressEvent) => {
    // A marker tap also reaches the map on some platforms.
    if ((event.nativeEvent as any)?.action === 'marker-press') {
      return;
    }
    setSelected(null);
  };

  const countLabel = (count: number) =>
    count === 1 ? t('churchesOnMapCountOne') : t('churchesOnMapCount').replace('{count}', String(count));

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const renderChurch = (church: ChurchMapLocation, index: number) => {
    const place = [church.address, church.city].filter(Boolean).map(fixMojibake).join(', ');
    return (
      <View
        key={church.id}
        style={[styles.churchRow, index > 0 && {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border}]}>
        <Text style={[styles.churchName, {color: C.textPrimary}]}>{fixMojibake(church.name)}</Text>
        {church.short_name ? (
          <Text style={[styles.churchMeta, {color: C.textSecondary}]}>{church.short_name}</Text>
        ) : null}
        {place ? <Text style={[styles.churchMeta, {color: C.textSecondary}]}>{place}</Text> : null}
        <Text style={[styles.churchMeta, {color: C.textSecondary}]}>
          {`${t('avgAttendanceLast12Weeks')}: `}
          <Text style={{color: C.textPrimary, fontWeight: '700'}}>
            {church.avg_attendance_last_12_weeks ?? '-'}
          </Text>
        </Text>
        <View style={styles.contactRow}>
          {church.phone ? (
            <TouchableOpacity
              onPress={() => openUrl(`tel:${church.phone.replace(/[^\d+]/g, '')}`)}
              accessibilityRole="link">
              <Text style={[styles.link, {color: T.brandText}]}>{church.phone}</Text>
            </TouchableOpacity>
          ) : null}
          {church.email ? (
            <TouchableOpacity onPress={() => openUrl(`mailto:${church.email}`)} accessibilityRole="link">
              <Text style={[styles.link, {color: T.brandText}]} numberOfLines={1}>
                {church.email}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.detailButton, {backgroundColor: T.brandTint}]}
          onPress={() => navigation.navigate('ChurchDetail', {id: church.id})}
          accessibilityRole="button">
          <Text style={[styles.detailButtonText, {color: T.brandText}]}>{t('viewChurchDetails')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Header title={t('omrMap')} />
      </View>
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={WORLD}
          onMapReady={onMapReady}
          onRegionChangeComplete={onRegionChangeComplete}
          onPress={onMapPress}
          userInterfaceStyle={theme}
          rotateEnabled={false}
          showsCompass={false}
          toolbarEnabled={false}>
          {clusters.map(cluster =>
            cluster.churches.length === 1 ? (
              <Marker
                key={cluster.key}
                coordinate={{latitude: cluster.latitude, longitude: cluster.longitude}}
                pinColor={COLORS.mainColor}
                tracksViewChanges={false}
                onPress={() => onClusterPress(cluster)}
              />
            ) : (
              <Marker
                key={cluster.key}
                coordinate={{latitude: cluster.latitude, longitude: cluster.longitude}}
                onPress={() => onClusterPress(cluster)}
                anchor={{x: 0.5, y: 0.5}}>
                <View style={[styles.cluster, {backgroundColor: COLORS.mainColor}]}>
                  <Text style={styles.clusterText}>{clusterLabel(cluster.churches.length)}</Text>
                </View>
              </Marker>
            ),
          )}
        </MapView>

        {/* Filter + count, floating over the map. */}
        <View style={styles.topBar} pointerEvents="box-none">
          <View style={[styles.filterCard, {backgroundColor: T.sheetBg, borderColor: C.border}]}>
            <ElementDropdown
              data={regionOptions}
              value={geoRegionId}
              onChange={value => setGeoRegionId(value == null ? null : Number(value))}
              placeholder={t('allGeographicalRegions')}
              title={t('geographicalRegion')}
            />
            <View style={styles.countRow}>
              {loading ? <ActivityIndicator size="small" color={COLORS.mainColor} /> : null}
              <Text style={[styles.countText, {color: C.textSecondary}]}>
                {countLabel(locations.length)}
              </Text>
              <TouchableOpacity onPress={loadAndFit} hitSlop={8} accessibilityRole="button">
                <Text style={[styles.link, {color: T.brandText}]}>{t('showAllOnMap')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {error ? (
            <View style={[styles.errorCard, {backgroundColor: T.sheetBg, borderColor: C.border}]}>
              <ApiErrorState compact error={error} onRetry={loadAndFit} />
            </View>
          ) : !loading && locations.length === 0 ? (
            <View style={[styles.emptyCard, {backgroundColor: T.sheetBg, borderColor: C.border}]}>
              <Text style={{color: C.textSecondary, fontSize: fs(13)}}>{t('noChurchesOnMap')}</Text>
            </View>
          ) : null}
        </View>

        {selected ? (
          <View style={[styles.sheet, {backgroundColor: T.sheetBg, borderColor: C.border}]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, {color: C.textPrimary}]}>
                {selected.length > 1
                  ? countLabel(selected.length)
                  : t('churchDetail')}
              </Text>
              <Pressable onPress={() => setSelected(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('close')}>
                <Text style={[styles.close, {color: C.textSecondary}]}>×</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.sheetList} contentContainerStyle={{paddingBottom: ms(4)}}>
              {selected.map(renderChurch)}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {paddingHorizontal: ms(16)},
  container: {flex: 1},
  topBar: {position: 'absolute', top: ms(8), left: ms(12), right: ms(12), gap: ms(8)},
  filterCard: {
    borderRadius: rs(10),
    borderWidth: StyleSheet.hairlineWidth,
    padding: ms(8),
    gap: ms(6),
    ...Platform.select({
      ios: {shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: {width: 0, height: 2}},
      android: {elevation: 3},
    }),
  },
  countRow: {flexDirection: 'row', alignItems: 'center', gap: ms(8), paddingHorizontal: ms(4)},
  countText: {flex: 1, fontSize: fs(13)},
  errorCard: {borderRadius: rs(10), borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden'},
  emptyCard: {borderRadius: rs(10), borderWidth: StyleSheet.hairlineWidth, padding: ms(10), alignSelf: 'flex-start'},
  cluster: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 6,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterText: {color: '#fff', fontWeight: '700', fontSize: 13},
  sheet: {
    position: 'absolute',
    left: ms(12),
    right: ms(12),
    bottom: ms(12),
    maxHeight: '48%',
    borderRadius: rs(14),
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: ms(14),
    paddingTop: ms(10),
    paddingBottom: ms(8),
    ...Platform.select({
      ios: {shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: {width: 0, height: 3}},
      android: {elevation: 6},
    }),
  },
  sheetHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: ms(4)},
  sheetTitle: {flex: 1, fontSize: fs(15), fontWeight: '700'},
  close: {fontSize: fs(24), lineHeight: fs(26)},
  sheetList: {flexGrow: 0},
  churchRow: {paddingVertical: ms(10), gap: ms(3)},
  churchName: {fontSize: fs(15), fontWeight: '700'},
  churchMeta: {fontSize: fs(13), lineHeight: fs(18)},
  contactRow: {flexDirection: 'row', flexWrap: 'wrap', columnGap: ms(14), rowGap: ms(2), marginTop: ms(2)},
  link: {fontSize: fs(13), fontWeight: '600'},
  detailButton: {marginTop: ms(8), alignSelf: 'flex-start', borderRadius: rs(8), paddingVertical: ms(7), paddingHorizontal: ms(12)},
  detailButtonText: {fontSize: fs(13), fontWeight: '700'},
});
