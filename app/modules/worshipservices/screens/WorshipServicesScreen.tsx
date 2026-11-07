import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {Text} from '@ui-kitten/components';
import {
  listWorshipServicesByChurch,
  WorshipServiceItem,
} from '../services/worshipService.service';
import {useNavigation, useFocusEffect, useRoute} from '@react-navigation/native';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import {COLORS} from '../../../shared/constants/colors';
import {MSC_FAQ_ID} from '../../../shared/constants/faq';
import {fs, ms, rs} from '../../../shared/utils/scale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../config/api';
import {useReloadOnReturn} from '../../../shared/hooks/useReloadOnReturn';
import {
  dayLabel,
  formatServiceTime,
  sortWorshipServices,
} from '../utils/worshipService.utils';
import {
  CardMeta,
  EntityListCard,
  ListEmptyState,
  ListLoadState,
  ListToolbar,
  ScreenContainer,
  listContentStyle,
} from '../../../shared/components/crud';

export const WorshipServicesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useThemedColors();
  const {t} = useTranslation();
  const [items, setItems] = useState<WorshipServiceItem[]>([]);
  // True until the first answer, so "No worship services" does not flash first.
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<WorshipServiceItem | null>(null);
  const churchIdRef = useRef<number | null>(null);
  const [churchName, setChurchName] = useState<string>('');

  const fetchChurchInfo = useCallback(async (id: number) => {
    try {
      const res = await api.get(`churches/${id}`);
      const churchData = res?.data?.data;
      if (churchData?.name && churchIdRef.current === id) {
        setChurchName(String(churchData.name).trim());
      }
    } catch (e) {
      console.error('Error fetching church info:', e);
    }
  }, []);

  // Only the newest load may write (pull-to-refresh during a reload, or a
  // reload after a change, answered out of order). The old `if (loading)`
  // guard read a stale value and could skip the reload after an add.
  const requestRef = useRef(0);
  const alertedRef = useRef(false);
  const fetchData = useCallback(
    async (showSpinner = true) => {
      const requestId = ++requestRef.current;
      const isCurrent = () => requestId === requestRef.current;
      const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
      const id = savedChurchId ? parseInt(savedChurchId, 10) : NaN;
      if (Number.isNaN(id)) {
        if (isCurrent()) {
          setLoading(false);
        }
        // Once, not on every refresh.
        if (!alertedRef.current) {
          alertedRef.current = true;
          Alert.alert(
            t('error') || 'Error',
            savedChurchId ? t('invalidChurchId') : t('churchIdNotFound'),
          );
        }
        return;
      }
      if (!isCurrent()) {
        return;
      }
      if (id !== churchIdRef.current) {
        // Another church was picked on the dashboard: drop the old church's rows.
        churchIdRef.current = id;
        setItems([]);
        setChurchName('');
      }
      if (showSpinner) {
        setLoading(true);
      }
      try {
        const [res] = await Promise.all([
          listWorshipServicesByChurch(id),
          fetchChurchInfo(id),
        ]);
        if (isCurrent()) {
          setItems(sortWorshipServices(res?.data ?? []));
          setLoadError(null);
        }
      } catch (e) {
        if (isCurrent()) {
          console.error('Error fetching worship services:', e);
          // Shown as a recoverable error state in the list (not an Alert + empty list).
          setLoadError(e);
        }
      } finally {
        if (isCurrent()) {
          setLoading(false);
        }
      }
    },
    [t, fetchChurchInfo],
  );

  const reload = useCallback(() => fetchData(true), [fetchData]);

  useEffect(() => {
    fetchData(true);
    // First load only; later loads come from useReloadOnReturn / focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back from detail keeps the list; reload after an add / edit / delete.
  useReloadOnReturn(() => fetchData(false), {
    dataKey: 'worshipServices',
    reload: route.params?.reload,
    clearReload: () => navigation.setParams({reload: undefined}),
  });

  // The list follows the church picked on the dashboard; coming back after
  // picking another one kept showing the previous church.
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('selectedChurchId').then(saved => {
        const id = saved ? parseInt(saved, 10) : NaN;
        if (!Number.isNaN(id) && churchIdRef.current != null && id !== churchIdRef.current) {
          fetchData(true);
        }
      });
    }, [fetchData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(false);
    setRefreshing(false);
  };

  const handleView = (item: WorshipServiceItem) => {
    navigation.navigate('WorshipServiceDetail', {worshipServiceId: item.id});
  };

  const openActions = (item: WorshipServiceItem) => {
    setSelectedService(item);
    setActionsVisible(true);
  };

  const renderItem = ({item}: {item: WorshipServiceItem}) => (
    <EntityListCard
      title={item.name?.trim() || '—'}
      trailingText={`#${item.id}`}
      onPress={() => handleView(item)}
      onMorePress={() => openActions(item)}>
      <CardMeta>
        {dayLabel(item.day_name, t)} • {formatServiceTime(item.time)}
      </CardMeta>
    </EntityListCard>
  );

  const keyExtractor = (item: WorshipServiceItem) => String(item.id);

  const renderMscNoteFooter = () => (
    <View
      style={[
        styles.infoNote,
        {backgroundColor: C.inputBg, borderColor: C.inputBorder},
      ]}>
      <Text
        style={[styles.infoNoteTitle, {color: C.textPrimary}]}
        allowFontScaling={false}>
        {t('worshipServicesMscNoteTitle')}
      </Text>
      <Text
        style={[styles.infoNoteText, {color: C.textSecondary}]}
        allowFontScaling={false}>
        {t('worshipServicesMscNoteP1')}
      </Text>
      <Text
        style={[styles.infoNoteText, {color: C.textSecondary}]}
        allowFontScaling={false}>
        {t('worshipServicesMscNoteP2')}
      </Text>
      <Text
        style={[styles.infoNoteText, {color: C.textSecondary}]}
        allowFontScaling={false}>
        {t('worshipServicesMscNoteP3')}
      </Text>
      <View style={styles.infoNoteActions}>
        <TouchableOpacity
          style={[
            styles.infoNoteBtn,
            {borderColor: COLORS.mainColor, backgroundColor: C.surface},
          ]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('FAQDetail', {faqId: MSC_FAQ_ID})}>
          <Text
            style={[styles.infoNoteBtnText, {color: C.textPrimary}]}
            allowFontScaling={false}>
            {t('worshipServicesMscGoToFaq')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.infoNoteBtn,
            {borderColor: COLORS.mainColor, backgroundColor: C.surface},
          ]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('OmrSupport')}>
          <Text
            style={[styles.infoNoteBtnText, {color: C.textPrimary}]}
            allowFontScaling={false}>
            {t('worshipServicesMscGoToSupport')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const isInitialLoading = loading && items.length === 0 && !refreshing;

  return (
    <ScreenContainer title={t('worshipServices') || 'Worship Services'} showMenu>
      {/* Adds to the same selectedChurchId this list shows; returns with reload. */}
      {/* Order: Add New (top right) → church name → count. */}
      <ListToolbar addRoute="AddWorshipService" />

      {churchName ? (
        <Text
          style={[styles.churchNameText, {color: C.textPrimary}]}
          numberOfLines={2}>
          {churchName}
        </Text>
      ) : null}

      {loadError && items.length === 0 ? null : (
        <Text
          style={[styles.countText, {color: C.textSecondary}]}
          accessibilityLiveRegion="polite">
          {`${items.length} ${(t('worshipServices') || 'Worship Services').toLowerCase()}`}
        </Text>
      )}

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={listContentStyle}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          isInitialLoading || !loading ? (
            <ListLoadState
              loading={isInitialLoading}
              error={loadError}
              onRetry={reload}>
              <ListEmptyState
                title={t('noWorshipServicesFound') || t('noDataFound')}
                hint={t('emptyListHint')}
              />
            </ListLoadState>
          ) : null
        }
        ListFooterComponent={renderMscNoteFooter}
      />

      <ActionSheetModal
        visible={actionsVisible}
        title={selectedService?.name?.trim() || t('worshipService') || 'Worship Service'}
        onRequestClose={() => {
          setActionsVisible(false);
          setSelectedService(null);
        }}
        actions={((): ActionItem[] => {
          const list: ActionItem[] = [];
          list.push({
            label: t('view') || 'View',
            icon: 'view',
            onPress: () => {
              if (selectedService) {
                navigation.navigate('WorshipServiceDetail', {
                  worshipServiceId: selectedService.id,
                });
              }
              setActionsVisible(false);
              setSelectedService(null);
            },
          });
          list.push({
            label: t('edit') || 'Edit',
            icon: 'edit',
            onPress: () => {
              if (selectedService) {
                navigation.navigate('EditWorshipService', {
                  worshipServiceId: selectedService.id,
                });
              }
              setActionsVisible(false);
              setSelectedService(null);
            },
          });
          list.push({
            label: t('delete') || 'Delete',
            icon: 'delete',
            type: 'danger',
            onPress: () => {
              if (selectedService) {
                navigation.navigate('DeleteWorshipService', {
                  worshipServiceId: selectedService.id,
                });
              }
              setActionsVisible(false);
              setSelectedService(null);
            },
          });
          return list;
        })()}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  churchNameText: {
    fontSize: fs(14),
    fontWeight: '600',
    marginTop: ms(8),
  },
  // Same look as ListToolbar's count, now on its own line under the name.
  countText: {
    marginTop: ms(4),
    marginBottom: ms(4),
    fontSize: fs(13),
    fontWeight: '500',
  },
  list: {
    flex: 1,
    marginTop: ms(8),
  },
  infoNote: {
    marginTop: ms(12),
    marginBottom: ms(16),
    paddingHorizontal: ms(10),
    paddingVertical: ms(10),
    borderRadius: rs(8),
    borderWidth: StyleSheet.hairlineWidth,
  },
  infoNoteTitle: {
    fontSize: fs(15),
    fontWeight: '700',
    lineHeight: fs(22),
    marginBottom: ms(8),
  },
  infoNoteText: {
    fontSize: fs(13),
    lineHeight: fs(20),
    marginBottom: ms(8),
  },
  infoNoteActions: {
    flexDirection: 'row',
    gap: ms(8),
    marginTop: ms(4),
  },
  infoNoteBtn: {
    flex: 1,
    paddingHorizontal: ms(8),
    paddingVertical: ms(10),
    borderRadius: rs(6),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoNoteBtnText: {
    fontSize: fs(12),
    lineHeight: fs(16),
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default WorshipServicesScreen;
