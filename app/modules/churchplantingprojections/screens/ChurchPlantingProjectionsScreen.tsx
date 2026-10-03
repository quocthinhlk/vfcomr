import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  FlatList,
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
  listChurchPlantingProjections,
  ChurchPlantingProjectionItem,
} from '../services/churchPlantingProjection.service';
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
import {EditSvgIcon} from '../../../shared/components/icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../config/api';
import {COLORS} from '../../../shared/constants/colors';
import SearchInput from '../../../shared/components/SearchInput';

export const ChurchPlantingProjectionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const L = getListStyles(C, theme);
  const {t} = useTranslation();
  const [items, setItems] = useState<ChurchPlantingProjectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedProjection, setSelectedProjection] =
    useState<ChurchPlantingProjectionItem | null>(null);
  const [churchId, setChurchId] = useState<number | null>(null);
  const [churchName, setChurchName] = useState<string>('');
  const [query, setQuery] = useState('');

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
        const res = await listChurchPlantingProjections(id, true);
        console.log('ChurchPlantingProjections API Response:', res);
        const allProjections = res?.data?.items ?? [];
        console.log('ChurchPlantingProjections parsed:', allProjections);
        
        // Filter by search query
        const filtered = query.trim()
          ? allProjections.filter((p: ChurchPlantingProjectionItem) =>
              p.proposed_church_name?.toLowerCase().includes(query.trim().toLowerCase()) ||
              p.town?.toLowerCase().includes(query.trim().toLowerCase()) ||
              p.proposed_leader_name?.toLowerCase().includes(query.trim().toLowerCase())
            )
          : allProjections;
        
        setItems(filtered);
        await fetchChurchInfo(id);
      } catch (e) {
        console.error('Error fetching church planting projections:', e);
        Alert.alert(t('error') || 'Error', t('failedToLoadProjections') || 'Failed to load church planting projections');
      } finally {
        setLoading(false);
      }
    },
    [loading, t, fetchChurchInfo, query],
  );

  useEffect(() => {
    fetchData(true);
  }, [query]);

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

  const handleView = (item: ChurchPlantingProjectionItem) => {
    navigation.navigate('ChurchPlantingProjectionDetail', {projectionId: item.id});
  };

  const handleEdit = (item: ChurchPlantingProjectionItem) => {
    navigation.navigate('EditChurchPlantingProjection', {projectionId: item.id});
  };

  const handleDelete = (item: ChurchPlantingProjectionItem) => {
    navigation.navigate('DeleteChurchPlantingProjection', {projectionId: item.id});
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const renderItem = ({item}: {item: ChurchPlantingProjectionItem}) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => handleView(item)}
      onLongPress={() => {
        setSelectedProjection(item);
        setActionsVisible(true);
      }}
      delayLongPress={300}>
      <View style={L.itemCard as any}>
        <View style={L.itemRow as any}>
          <View style={styles.itemCol}>
            <Text style={[styles.name, {color: C.textPrimary}]}>
              {item.proposed_church_name}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, {color: C.textSecondary}]}>
                {item.town} • {item.proposed_leader_name}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, {color: C.textSecondary}]}>
                {t('startDatePreparation') || 'Start Date Preparation'}:{' '}
                {formatDate(item.start_date_preparation)}
              </Text>
            </View>
          </View>
          <View style={styles.itemColRight}>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.editBtn]}
                onPress={() => handleEdit(item)}>
                <EditSvgIcon width={fs(15)} height={fs(15)} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const keyExtractor = (item: ChurchPlantingProjectionItem) => String(item.id);

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={{flex: 1, backgroundColor: C.background}}>
        <View style={[styles.container, {backgroundColor: C.background}]}>
          <Header
            title={t('churchPlantingProjections') || 'Church Planting Projections'}
          />

          {churchName ? (
            <View style={styles.churchNameContainer}>
              <Text style={[styles.churchNameText, {color: C.textPrimary}]}>
                {t('churchPlantingProjections') || 'Church Planting Projections'} {t('for') || 'for'} {churchName}
              </Text>
            </View>
          ) : null}

          <View style={styles.headerRow}>
            <AddNewHeaderButton
              name="AddChurchPlantingProjection"
              text={t('addNew') || 'Add New'}
              style={{
                backgroundColor: C.surface,
                borderWidth: 1,
                borderColor: COLORS.mainColor,
              }}
              textStyle={{color: COLORS.mainColor}}
            />
          </View>

          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('search') || 'Search...'}
          />

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
            title={
              selectedProjection?.proposed_church_name ||
              t('churchPlantingProjection') ||
              'Church Planting Projection'
            }
            onRequestClose={() => {
              setActionsVisible(false);
              setSelectedProjection(null);
            }}
            actions={((): ActionItem[] => {
              const list: ActionItem[] = [];
              list.push({
                label: t('view') || 'View',
                icon: 'view',
                onPress: () => {
                  if (selectedProjection) {
                    navigation.navigate('ChurchPlantingProjectionDetail', {
                      projectionId: selectedProjection.id,
                    });
                  }
                  setActionsVisible(false);
                  setSelectedProjection(null);
                },
              });
              list.push({
                label: t('edit') || 'Edit',
                icon: 'edit',
                onPress: () => {
                  if (selectedProjection) {
                    navigation.navigate('EditChurchPlantingProjection', {
                      projectionId: selectedProjection.id,
                    });
                  }
                  setActionsVisible(false);
                  setSelectedProjection(null);
                },
              });
              list.push({
                label: t('delete') || 'Delete',
                icon: 'delete',
                type: 'danger',
                onPress: () => {
                  if (selectedProjection) {
                    navigation.navigate('DeleteChurchPlantingProjection', {
                      projectionId: selectedProjection.id,
                    });
                  }
                  setActionsVisible(false);
                  setSelectedProjection(null);
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
    marginTop: ms(8),
    marginBottom: ms(4),
  },
  churchNameText: {
    fontSize: fs(14),
    fontWeight: '500',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: ms(8),
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
    marginTop: ms(2),
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
    backgroundColor: COLORS.successColor,
  },
});

export default ChurchPlantingProjectionsScreen;

