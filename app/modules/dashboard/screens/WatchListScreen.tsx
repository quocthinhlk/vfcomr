import React, {useCallback, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import { globalStyles } from '../../../shared/styles/global';
import AddNewHeaderButton from '../../../shared/components/AddNewHeaderButton';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {getListStyles} from '../../../shared/styles/list';
import {COLORS} from '../../../shared/constants/colors';
import {fs, ms} from '../../../shared/utils/scale';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import {
  deleteWatchList,
  listWatchLists,
  WatchListItem,
} from '../services/watchList.service';

export const WatchListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const L = getListStyles(C, theme);
  const {t} = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const [items, setItems] = useState<WatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WatchListItem | null>(null);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      const response = await listWatchLists();
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading watch lists:', error);
      Alert.alert(
        tRef.current('error'),
        error instanceof Error
          ? error.message
          : tRef.current('failedToLoadWatchLists'),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const confirmDelete = (item: WatchListItem) => {
    Alert.alert(
      t('deleteWatchList'),
      t('deleteWatchListConfirm').replace('{name}', item.name),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWatchList(item.id);
              setItems(current => current.filter(value => value.id !== item.id));
            } catch (error) {
              Alert.alert(
                t('error'),
                error instanceof Error ? error.message : t('deleteFailed'),
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('watchLists')} />
        <View style={styles.addRow}>
          <AddNewHeaderButton
            name="WatchListForm"
            text={t('createWatchList')}
            style={{
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: COLORS.mainColor,
            }}
            textStyle={{color: COLORS.mainColor}}
          />
        </View>

        {loading && items.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.mainColor} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={items.length === 0 ? styles.emptyList : undefined}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load(false);
                }}
                tintColor={COLORS.mainColor}
              />
            }
            ListEmptyComponent={
              <Text style={[styles.empty, {color: C.textSecondary}]}>
                {t('noWatchLists')}
              </Text>
            }
            renderItem={({item}) => (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate('WatchListDetail', {watchListId: item.id})
                }
                onLongPress={() => setSelectedItem(item)}
                delayLongPress={300}>
                <View style={L.itemCard as any}>
                  <Text style={[styles.name, {color: C.textPrimary}]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.meta, {color: C.textSecondary}]}>
                    {t('churches')}: {item.churches?.length ?? 0}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
        <ActionSheetModal
          visible={selectedItem != null}
          title={selectedItem?.name || t('watchLists')}
          onRequestClose={() => setSelectedItem(null)}
          actions={((): ActionItem[] => {
            if (!selectedItem) {
              return [];
            }
            const item = selectedItem;
            return [
              {
                label: t('edit'),
                onPress: () => {
                  setSelectedItem(null);
                  navigation.navigate('WatchListForm', {watchListId: item.id});
                },
              },
              {
                label: t('delete'),
                type: 'danger',
                onPress: () => {
                  setSelectedItem(null);
                  confirmDelete(item);
                },
              },
            ];
          })()}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, paddingHorizontal: ms(16)},
  addRow: {
    alignItems: 'flex-end',
    marginTop: ms(8),
    marginBottom: ms(10),
  },
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyList: {flexGrow: 1, justifyContent: 'center'},
  empty: {textAlign: 'center', fontSize: fs(12)},
  name: {fontSize: fs(14), fontWeight: '700', marginBottom: ms(5)},
  meta: {fontSize: fs(11)},
});
