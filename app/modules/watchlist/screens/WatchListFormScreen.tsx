import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {SaveButton} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {COLORS} from '../../../shared/constants/colors';
import {FORM_INPUT_HEIGHT} from '../../../shared/styles/form';
import {fs, ms, rs} from '../../../shared/utils/scale';
import ChurchMultiSelectModal from '../components/ChurchMultiSelectModal';
import {
  createWatchList,
  getWatchList,
  updateWatchList,
  WatchListSortBy,
} from '../services/watchList.service';

const SORT_OPTIONS: WatchListSortBy[] = ['country_id', 'id', 'name'];

export const WatchListFormScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const watchListId = Number(route.params?.watchListId) || null;
  const C = useThemedColors();
  const {t} = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const [name, setName] = useState('');
  const [sortBy, setSortBy] = useState<WatchListSortBy>('country_id');
  const [sortList, setSortList] = useState('');
  const [churches, setChurches] = useState<Record<number, string>>({});
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading] = useState(Boolean(watchListId));
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);

  useEffect(() => {
    if (!watchListId) {
      return;
    }
    (async () => {
      try {
        const response = await getWatchList(watchListId);
        const item = response.data;
        setName(item.name ?? '');
        setSortBy(
          SORT_OPTIONS.includes(item.sort_by as WatchListSortBy)
            ? (item.sort_by as WatchListSortBy)
            : 'country_id',
        );
        setSortList(item.sortlist ?? '');
        setChurches(
          (item.churches ?? []).reduce<Record<number, string>>((result, church) => {
            result[church.church_id] = church.church_name;
            return result;
          }, {}),
        );
      } catch (error) {
        Alert.alert(
          tRef.current('error'),
          error instanceof Error
            ? error.message
            : tRef.current('failedToLoadWatchList'),
        );
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [navigation, watchListId]);

  const sortLabel = (value: WatchListSortBy) => {
    if (value === 'country_id') {
      return t('sortByCountry');
    }
    if (value === 'id') {
      return t('sortByChurchId');
    }
    return t('sortByName');
  };

  const save = async () => {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        sort_by: sortBy,
        sortlist: sortList.trim(),
        church_ids: Object.keys(churches).map(Number),
      };
      const response = watchListId
        ? await updateWatchList(watchListId, payload)
        : await createWatchList(payload);
      Alert.alert(t('success'), response.message, [
        {text: t('done'), onPress: () => navigation.goBack()},
      ]);
    } catch (error) {
      Alert.alert(
        t('error'),
        error instanceof Error ? error.message : t('saveFailed'),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, {backgroundColor: C.background}]}>
        <View style={[styles.container, {backgroundColor: C.background}]}>
          <Header title={t('editWatchList')} />
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.mainColor} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header
          title={watchListId ? t('editWatchList') : t('createWatchList')}
        />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, {color: C.textPrimary}]}>
            {t('watchListName')}
          </Text>
          <TextInput
            value={name}
            onChangeText={value => {
              setName(value);
              if (value.trim()) {
                setNameError(false);
              }
            }}
            placeholder={t('watchListName')}
            placeholderTextColor={C.textSecondary}
            style={[
              styles.input,
              nameError && styles.inputError,
              {
                color: C.inputText,
                backgroundColor: C.inputBg,
                borderColor: nameError ? COLORS.danger : C.inputBorder,
              },
            ]}
          />
          {nameError ? (
            <Text style={styles.errorText}>{t('required')}</Text>
          ) : null}

          <Text style={[styles.label, {color: C.textPrimary}]}>
            {t('sortBy')}
          </Text>
          <View style={styles.options}>
            {SORT_OPTIONS.map(option => {
              const selected = option === sortBy;
              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => setSortBy(option)}
                  style={[
                    styles.option,
                    {
                      backgroundColor: selected
                        ? COLORS.mainColor
                        : C.inputBg,
                      borderColor: selected
                        ? COLORS.mainColor
                        : C.inputBorder,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.optionText,
                      {color: selected ? COLORS.white : C.inputText},
                    ]}>
                    {sortLabel(option)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, {color: C.textPrimary}]}>
            {t('sortList')}
          </Text>
          <TextInput
            value={sortList}
            onChangeText={setSortList}
            placeholder={t('sortListOptional')}
            placeholderTextColor={C.textSecondary}
            style={[
              styles.input,
              {
                color: C.inputText,
                backgroundColor: C.inputBg,
                borderColor: C.inputBorder,
              },
            ]}
          />

          <View style={styles.churchHeader}>
            <Text style={[styles.label, {color: C.textPrimary}]}>
              {t('selectedChurches')} ({Object.keys(churches).length})
            </Text>
            <TouchableOpacity
              onPress={() => setPickerVisible(true)}
              style={styles.selectButton}>
              <Text style={styles.selectButtonText}>{t('selectChurches')}</Text>
            </TouchableOpacity>
          </View>

          {Object.entries(churches).map(([id, churchName]) => (
            <View
              key={id}
              style={[
                styles.churchRow,
                {backgroundColor: C.surface, borderColor: C.border},
              ]}>
              <Text style={[styles.churchName, {color: C.textPrimary}]}>
                {churchName}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setChurches(current => {
                    const next = {...current};
                    delete next[Number(id)];
                    return next;
                  })
                }>
                <Text style={styles.remove}>×</Text>
              </TouchableOpacity>
            </View>
          ))}

          <SaveButton
            label={saving ? t('saving') : t('save')}
            onPress={save}
            disabled={saving}
            style={styles.saveButton}
          />
        </ScrollView>
      </View>
      <ChurchMultiSelectModal
        visible={pickerVisible}
        selected={churches}
        onClose={() => setPickerVisible(false)}
        onDone={next => {
          setChurches(next);
          setPickerVisible(false);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1},
  container: {flex: 1, paddingHorizontal: ms(16)},
  content: {paddingTop: ms(16), paddingBottom: ms(36)},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  label: {fontSize: fs(12), fontWeight: '700', marginBottom: ms(6)},
  input: {
    height: FORM_INPUT_HEIGHT,
    borderWidth: 1,
    borderRadius: rs(5),
    paddingHorizontal: ms(10),
    fontSize: fs(12),
    marginBottom: ms(16),
  },
  inputError: {
    marginBottom: ms(4),
  },
  errorText: {
    color: COLORS.danger,
    fontSize: fs(12),
    marginBottom: ms(12),
  },
  options: {flexDirection: 'row', gap: ms(7), marginBottom: ms(16)},
  option: {
    flex: 1,
    minHeight: FORM_INPUT_HEIGHT,
    borderWidth: 1,
    borderRadius: rs(5),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(4),
  },
  optionText: {fontSize: fs(10), fontWeight: '600', textAlign: 'center'},
  churchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(8),
  },
  selectButton: {
    backgroundColor: COLORS.mainColor,
    paddingHorizontal: ms(10),
    paddingVertical: ms(7),
    borderRadius: rs(4),
  },
  selectButtonText: {color: COLORS.white, fontSize: fs(10), fontWeight: '600'},
  churchRow: {
    minHeight: FORM_INPUT_HEIGHT,
    borderWidth: 1,
    borderRadius: rs(5),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(10),
    marginBottom: ms(7),
  },
  churchName: {flex: 1, fontSize: fs(11), paddingRight: ms(8)},
  remove: {fontSize: fs(22), color: COLORS.dangerColor, fontWeight: '600'},
  saveButton: {marginTop: ms(18)},
});

export default WatchListFormScreen;
