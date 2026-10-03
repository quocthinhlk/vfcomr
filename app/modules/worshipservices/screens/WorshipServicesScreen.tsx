import React, {useCallback, useEffect, useState} from 'react';
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
import {
  CardMeta,
  CenteredLoader,
  EntityListCard,
  ListEmptyState,
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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<WorshipServiceItem | null>(null);
  const [churchId, setChurchId] = useState<number | null>(null);
  const [churchName, setChurchName] = useState<string>('');

  const fetchChurchInfo = useCallback(async (id: number) => {
    try {
      const res = await api.get(`churches/${id}`);
      const churchData = res?.data?.data;
      if (churchData?.name) {
        setChurchName(churchData.name);
      }
    } catch (e) {
      console.error('Error fetching church info:', e);
    }
  }, []);

  const fetchData = useCallback(
    async (reset = false) => {
      try {
        if (loading) {
          return;
        }
        const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
        if (!savedChurchId) {
          Alert.alert(t('error') || 'Error', t('churchIdNotFound') || 'Church ID not found');
          return;
        }
        const id = parseInt(savedChurchId, 10);
        if (isNaN(id)) {
          Alert.alert(t('error') || 'Error', t('invalidChurchId') || 'Invalid Church ID');
          return;
        }
        setChurchId(id);
        setLoading(true);
        const res = await listWorshipServicesByChurch(id);
        console.log('WorshipServices API Response:', res);
        const services = res?.data ?? [];
        console.log('WorshipServices parsed:', services);
        setItems(services);
        await fetchChurchInfo(id);
      } catch (e) {
        console.error('Error fetching worship services:', e);
        Alert.alert(t('error') || 'Error', t('failedToLoadWorshipServices') || 'Failed to load worship services');
      } finally {
        setLoading(false);
      }
    },
    [loading, t, fetchChurchInfo],
  );

  useEffect(() => {
    fetchData(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const shouldReload = route.params?.reload;
      if (shouldReload) {
        navigation.setParams({reload: undefined});
        fetchData(true);
      }
    }, [route.params?.reload, fetchData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  };

  const handleView = (item: WorshipServiceItem) => {
    navigation.navigate('WorshipServiceDetail', {worshipServiceId: item.id});
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeString;
  };

  const openActions = (item: WorshipServiceItem) => {
    setSelectedService(item);
    setActionsVisible(true);
  };

  const renderItem = ({item}: {item: WorshipServiceItem}) => (
    <EntityListCard
      title={item.name}
      onPress={() => handleView(item)}
      onMorePress={() => openActions(item)}>
      <CardMeta>
        {item.day_name} • {formatTime(item.time)}
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
      {churchName ? (
        <Text
          style={[styles.churchNameText, {color: C.textPrimary}]}
          numberOfLines={2}>
          {churchName}
        </Text>
      ) : null}

      {/* Add New is intentionally hidden (no addRoute), as before. */}
      <ListToolbar
        countText={`${items.length} ${(t('worshipServices') || 'Worship Services').toLowerCase()}`}
      />

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
          isInitialLoading ? (
            <CenteredLoader />
          ) : !loading ? (
            <ListEmptyState
              title={t('noWorshipServicesFound') || t('noDataFound')}
            />
          ) : null
        }
        ListFooterComponent={renderMscNoteFooter}
      />

      <ActionSheetModal
        visible={actionsVisible}
        title={selectedService?.name || t('worshipService') || 'Worship Service'}
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
