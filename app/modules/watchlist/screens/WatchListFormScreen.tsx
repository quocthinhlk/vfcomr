import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {SaveButton} from '../../../shared/components/ActionButtons';
import AppInput from '../../../shared/components/AppInput';
import {FormField, ScreenContainer} from '../../../shared/components/crud';
import {useUiTokens} from '../../../shared/styles/uiTokens';
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
  const T = useUiTokens();
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

  return (
    <ScreenContainer
      title={watchListId ? t('editWatchList') : t('createWatchList')}
      showMenu
      scroll
      loading={loading}>
          <FormField
            label={t('watchListName')}
            required
            error={nameError ? t('required') : undefined}>
            <AppInput
              value={name}
              onChangeText={value => {
                setName(value);
                if (value.trim()) {
                  setNameError(false);
                }
              }}
              placeholder={t('watchListName')}
              error={nameError}
            />
          </FormField>

          <FormField label={t('sortBy')}>
          <View style={styles.options}>
            {SORT_OPTIONS.map(option => {
              const selected = option === sortBy;
              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => setSortBy(option)}
                  accessibilityRole="radio"
                  accessibilityState={{selected}}
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
          </FormField>

          <FormField label={t('sortList')}>
            <AppInput
              value={sortList}
              onChangeText={setSortList}
              placeholder={t('sortListOptional')}
            />
          </FormField>

          <View style={styles.churchHeader}>
            <Text style={[styles.label, styles.labelFlush, {color: C.textPrimary}]}>
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
                {backgroundColor: C.surface, borderColor: C.surfaceBorder},
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
                }
                accessibilityRole="button"
                accessibilityLabel={`${t('remove')} ${churchName}`}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Text style={[styles.remove, {color: T.dangerText}]}>×</Text>
              </TouchableOpacity>
            </View>
          ))}

          <SaveButton
            label={saving ? t('saving') : t('save')}
            onPress={save}
            disabled={saving}
            style={styles.saveButton}
          />
      <ChurchMultiSelectModal
        visible={pickerVisible}
        selected={churches}
        onClose={() => setPickerVisible(false)}
        onDone={next => {
          setChurches(next);
          setPickerVisible(false);
        }}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  label: {fontSize: fs(13), fontWeight: '600', marginBottom: ms(8)},
  labelFlush: {marginBottom: 0},
  options: {flexDirection: 'row', gap: ms(8)},
  option: {
    flex: 1,
    minHeight: FORM_INPUT_HEIGHT,
    borderWidth: 1,
    borderRadius: rs(8),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(4),
  },
  optionText: {fontSize: fs(12), fontWeight: '600', textAlign: 'center'},
  churchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(8),
  },
  selectButton: {
    backgroundColor: COLORS.mainColor,
    paddingHorizontal: ms(12),
    paddingVertical: ms(8),
    borderRadius: rs(8),
  },
  selectButtonText: {color: COLORS.white, fontSize: fs(12), fontWeight: '600'},
  churchRow: {
    minHeight: FORM_INPUT_HEIGHT,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: rs(8),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(12),
    marginBottom: ms(8),
  },
  churchName: {flex: 1, fontSize: fs(13), paddingRight: ms(8)},
  remove: {fontSize: fs(22), fontWeight: '600'},
  saveButton: {marginTop: ms(16)},
});

export default WatchListFormScreen;
