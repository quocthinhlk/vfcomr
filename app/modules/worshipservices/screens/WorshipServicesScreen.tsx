import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {
  listWorshipServicesByChurch,
  WorshipServiceItem,
} from '../services/worshipService.service';
import {useNavigation, useFocusEffect, useRoute} from '@react-navigation/native';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {getListStyles} from '../../../shared/styles/list';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import {fs, ws, ms, rs} from '../../../shared/utils/scale';
import AddNewHeaderButton from '../../../shared/components/AddNewHeaderButton';
const editIcon = require('../../../assets/icons/edit.png');
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../config/api';
export const WorshipServicesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const L = getListStyles(C, theme);
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

  const handleEdit = (item: WorshipServiceItem) => {
    navigation.navigate('EditWorshipService', {worshipServiceId: item.id});
  };

  const handleDelete = (item: WorshipServiceItem) => {
    navigation.navigate('DeleteWorshipService', {worshipServiceId: item.id});
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeString;
  };

  const renderItem = ({item}: {item: WorshipServiceItem}) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => handleView(item)}
      onLongPress={() => {
        setSelectedService(item);
        setActionsVisible(true);
      }}
      delayLongPress={300}>
      <View style={L.itemCard as any}>
        <View style={L.itemRow as any}>
          <View style={styles.itemCol}>
            <Text style={[styles.name, {color: C.textPrimary}]}>
              {item.name}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, {color: C.textSecondary}]}>
                {item.day_name} • {formatTime(item.time)}
              </Text>
            </View>
          </View>
          <View style={styles.itemColRight}>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.editBtn, {backgroundColor: C.surface}]}
                onPress={() => handleEdit(item)}>
                <Image source={editIcon} style={styles.editIcon} resizeMode="contain" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const keyExtractor = (item: WorshipServiceItem) => String(item.id);

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={{flex: 1, backgroundColor: C.background}}>
        <View style={[styles.container, {backgroundColor: C.background}]}>
          <Header title={t('worshipServices') || 'Worship Services'} />

          {churchName ? (
            <View style={[styles.churchNameContainer, {backgroundColor: C.surface, borderColor: C.border}]}>
              <Text style={[styles.churchNameText, {color: C.textPrimary}]}>
                {churchName}
              </Text>
            </View>
          ) : null}

          <View style={styles.headerRow}>
            <AddNewHeaderButton
              name="AddWorshipService"
              text={t('addNew') || 'Add New'}
            />
          </View>

          <FlatList
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              !loading ? (
                <Text style={[styles.empty, {color: C.textSecondary}]}>
                  {t('noDataFound') || 'No data found'}
                </Text>
              ) : null
            }
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
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: ms(16),
    paddingRight: ms(16),
  },
  churchNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ms(8),
    marginBottom: ms(4),
    paddingVertical: ms(4),
  },
  churchNameLabel: {
    fontSize: fs(14),
    fontWeight: '500',
  },
  churchNameText: {
    fontSize: fs(14),
    fontWeight: '600',
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: ms(8),
    marginBottom: ms(12),
  },
  itemCol: {
    flex: 1,
    paddingRight: ms(8),
  },
  itemColRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: ms(8),
    width: ws(72),
  },
  name: {
    fontSize: fs(14),
    fontWeight: '600',
    marginBottom: ms(4),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
  },
  metaText: {
    fontSize: fs(12),
  },
  empty: {
    textAlign: 'center',
    marginTop: ms(40),
  },
  actionRow: {
    flexDirection: 'row',
    gap: ms(6),
  },
  actionBtn: {
    width: ws(25),
    height: ws(25),
    borderRadius: rs(4),
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
  },
  editIcon: {
    width: ws(16),
    height: ws(16),
  },
});

export default WorshipServicesScreen;
