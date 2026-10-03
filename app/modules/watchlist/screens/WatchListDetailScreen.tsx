import React, {useCallback, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {DeleteButton} from '../../../shared/components/ActionButtons';
import {globalStyles} from '../../../shared/styles/global';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {COLORS} from '../../../shared/constants/colors';
import {fs, ms, rs} from '../../../shared/utils/scale';
import ChurchMultiSelectModal from '../components/ChurchMultiSelectModal';
import {
  addChurchesToWatchList,
  deleteWatchList,
  getWatchList,
  removeChurchFromWatchList,
  WatchListItem,
} from '../services/watchList.service';

export const WatchListDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const watchListId = Number(route.params?.watchListId);
  const C = useThemedColors();
  const {t} = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const [item, setItem] = useState<WatchListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [mutating, setMutating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getWatchList(watchListId);
      setItem(response.data);
    } catch (error) {
      Alert.alert(
        tRef.current('error'),
        error instanceof Error
          ? error.message
          : tRef.current('failedToLoadWatchList'),
      );
    } finally {
      setLoading(false);
    }
  }, [watchListId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const selectedChurches = (item?.churches ?? []).reduce<Record<number, string>>(
    (result, church) => {
      result[church.church_id] = church.church_name;
      return result;
    },
    {},
  );

  const addSelectedChurches = async (next: Record<number, string>) => {
    setPickerVisible(false);
    const currentIds = new Set((item?.churches ?? []).map(church => church.church_id));
    const newIds = Object.keys(next)
      .map(Number)
      .filter(id => !currentIds.has(id));
    if (newIds.length === 0) {
      return;
    }
    setMutating(true);
    try {
      await addChurchesToWatchList(watchListId, newIds);
      await load();
    } catch (error) {
      Alert.alert(
        t('error'),
        error instanceof Error ? error.message : t('addChurchesFailed'),
      );
    } finally {
      setMutating(false);
    }
  };

  const confirmRemove = (churchId: number, churchName: string) => {
    Alert.alert(
      t('removeChurch'),
      t('removeChurchConfirm').replace('{name}', churchName),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('remove'),
          style: 'destructive',
          onPress: async () => {
            setMutating(true);
            try {
              await removeChurchFromWatchList(watchListId, churchId);
              setItem(current =>
                current
                  ? {
                      ...current,
                      churches: current.churches.filter(
                        church => church.church_id !== churchId,
                      ),
                    }
                  : current,
              );
            } catch (error) {
              Alert.alert(
                t('error'),
                error instanceof Error ? error.message : t('removeChurchFailed'),
              );
            } finally {
              setMutating(false);
            }
          },
        },
      ],
    );
  };

  const sortLabel = (value?: string) => {
    if (value === 'country_id') {
      return t('sortByCountry');
    }
    if (value === 'id') {
      return t('sortByChurchId');
    }
    if (value === 'name') {
      return t('sortByName');
    }
    return '';
  };

  const confirmDelete = () => {
    if (!item) {
      return;
    }
    Alert.alert(
      t('deleteWatchList'),
      t('deleteWatchListConfirm').replace('{name}', item.name),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            setMutating(true);
            try {
              await deleteWatchList(item.id);
              navigation.goBack();
            } catch (error) {
              Alert.alert(
                t('error'),
                error instanceof Error ? error.message : t('deleteFailed'),
              );
              setMutating(false);
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
        <Header title={t('watchListDetail')} />
        {loading && !item ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.mainColor} />
          </View>
        ) : item ? (
          <>
            <View
              style={[
                styles.summary,
                {backgroundColor: C.surface, borderColor: C.border},
              ]}>
              <Text style={[styles.name, {color: C.textPrimary}]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.meta, {color: C.textSecondary}]} numberOfLines={1}>
                {sortLabel(item.sort_by)
                  ? `${sortLabel(item.sort_by)} · ${item.churches.length} ${t('churches')}`
                  : `${item.churches.length} ${t('churches')}`}
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('WatchListForm', {
                      watchListId: item.id,
                    })
                  }
                  hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
                  <Text style={[styles.actionText, {color: COLORS.mainColor}]}>
                    {t('edit')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPickerVisible(true)}
                  disabled={mutating}
                  hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
                  <Text style={[styles.actionText, {color: COLORS.mainColor}]}>
                    {t('addChurches')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
              {t('churchesInWatchList')}
            </Text>
            <FlatList
              data={item.churches}
              keyExtractor={church => String(church.church_id)}
              contentContainerStyle={styles.listContent}
              ListFooterComponent={
                <DeleteButton
                  label={t('delete')}
                  onPress={confirmDelete}
                  disabled={mutating}
                  fullWidth
                  style={styles.deleteButton}
                />
              }
              ListEmptyComponent={
                <Text style={[styles.empty, {color: C.textSecondary}]}>
                  {t('noChurchesFound')}
                </Text>
              }
              renderItem={({item: church}) => (
                <View
                  style={[
                    styles.churchRow,
                    {backgroundColor: C.surface, borderColor: C.border},
                  ]}>
                  <Text style={[styles.churchName, {color: C.textPrimary}]}>
                    {church.church_name}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      confirmRemove(church.church_id, church.church_name)
                    }
                    disabled={mutating}>
                    <Text style={styles.removeText}>{t('remove')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </>
        ) : null}
      </View>
      <ChurchMultiSelectModal
        visible={pickerVisible}
        selected={selectedChurches}
        onClose={() => setPickerVisible(false)}
        onDone={addSelectedChurches}
      />
      {mutating && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={COLORS.white} />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, paddingHorizontal: ms(16)},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  summary: {
    borderWidth: 1,
    borderRadius: rs(10),
    paddingHorizontal: ms(12),
    paddingVertical: ms(10),
    marginTop: ms(8),
    marginBottom: ms(12),
  },
  name: {fontSize: fs(15), fontWeight: '700'},
  meta: {fontSize: fs(12), marginTop: ms(2)},
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(16),
    marginTop: ms(8),
  },
  actionText: {fontSize: fs(13), fontWeight: '600'},
  sectionTitle: {fontSize: fs(13), fontWeight: '700', marginBottom: ms(9)},
  churchRow: {
    minHeight: ms(48),
    borderWidth: 1,
    borderRadius: rs(8),
    padding: ms(11),
    marginBottom: ms(8),
    flexDirection: 'row',
    alignItems: 'center',
  },
  churchName: {flex: 1, fontSize: fs(12), paddingRight: ms(8)},
  removeText: {color: COLORS.dangerColor, fontSize: fs(11), fontWeight: '700'},
  empty: {textAlign: 'center', marginTop: ms(30)},
  listContent: {paddingBottom: ms(28)},
  deleteButton: {marginTop: ms(12)},
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default WatchListDetailScreen;
