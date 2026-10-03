import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import SearchInput from '../../../shared/components/SearchInput';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {useThemedColors} from '../../../shared/styles/theme';
import {getListStyles} from '../../../shared/styles/list';
import {COLORS} from '../../../shared/constants/colors';
import {fs, ms, rs, ws} from '../../../shared/utils/scale';

export type ReportPickerOption = {id: string; label: string};

type Props = {
  visible: boolean;
  title: string;
  options: ReportPickerOption[];
  selectedIds: string[];
  multiple?: boolean;
  remote?: boolean;
  loading?: boolean;
  emptyLabel?: string;
  onSearch?: (query: string) => void;
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
};

export const ReportPickerModal = ({
  visible,
  title,
  options,
  selectedIds,
  multiple = false,
  remote = false,
  loading = false,
  emptyLabel,
  onSearch,
  onClose,
  onConfirm,
}: Props) => {
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const listStyles = getListStyles(C, theme);
  const {t} = useTranslation();
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setDraft(selectedIds);
      setQuery('');
    }
    // Reset only when the modal opens. Including selectedIds would clear a multi-select in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const visibleOptions = useMemo(() => {
    if (remote) {
      return options;
    }
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return options;
    }
    return options.filter(option => option.label.toLowerCase().includes(needle));
  }, [options, query, remote]);

  const choose = (id: string) => {
    if (!multiple) {
      onConfirm([id]);
      return;
    }
    setDraft(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, {backgroundColor: C.background}]}>
        <View style={[styles.header, {borderBottomColor: C.border}]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, {color: C.textSecondary}]}>{t('cancel')}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, {color: C.textPrimary}]} numberOfLines={1}>
            {title}
          </Text>
          {multiple ? (
            <TouchableOpacity onPress={() => onConfirm(draft)} style={styles.headerButton}>
              <Text style={[styles.headerButtonText, {color: COLORS.mainColor, textAlign: 'right'}]}>
                {t('done')}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButton} />
          )}
        </View>
        <View style={styles.content}>
          <SearchInput
            value={query}
            onChangeText={text => {
              setQuery(text);
              if (remote) {
                onSearch?.(text);
              }
            }}
            placeholder={t('search')}
          />
          <FlatList
            data={visibleOptions}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator color={COLORS.mainColor} style={styles.empty} />
              ) : (
                <Text style={[styles.emptyText, {color: C.textSecondary}]}>
                  {emptyLabel || t('noUsersFound')}
                </Text>
              )
            }
            contentContainerStyle={styles.listContent}
            renderItem={({item}) => {
              const checked = draft.includes(item.id);
              return (
                <TouchableOpacity
                  onPress={() => choose(item.id)}
                  style={[
                    listStyles.itemCard as any,
                    checked && {backgroundColor: C.bgSelectedOption},
                  ]}>
                  <View style={styles.itemRow}>
                    {multiple ? (
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: checked ? COLORS.mainColor : C.inputBorder,
                            backgroundColor: checked ? COLORS.mainColor : C.inputBg,
                          },
                        ]}>
                        {checked ? <Text style={styles.checkmark}>✓</Text> : null}
                      </View>
                    ) : null}
                    <Text style={[styles.name, {color: C.textPrimary}]} numberOfLines={2}>
                      {item.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1},
  header: {
    height: ws(50),
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(12),
  },
  headerButton: {minWidth: ws(64), paddingVertical: ms(8)},
  headerButtonText: {fontSize: fs(13), fontWeight: '600'},
  title: {flex: 1, textAlign: 'center', fontSize: fs(14), fontWeight: '700'},
  content: {flex: 1, paddingHorizontal: ms(16), paddingTop: ms(6)},
  listContent: {paddingBottom: ms(24)},
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    flex: 1,
    fontSize: fs(14),
    fontWeight: '700',
  },
  checkbox: {
    width: ws(21),
    height: ws(21),
    borderRadius: rs(4),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ms(10),
  },
  checkmark: {color: COLORS.white, fontSize: fs(13), fontWeight: '700'},
  label: {flex: 1, fontSize: fs(14)},
  empty: {marginTop: ms(30)},
  emptyText: {textAlign: 'center', marginTop: ms(30), fontSize: fs(14)},
});
