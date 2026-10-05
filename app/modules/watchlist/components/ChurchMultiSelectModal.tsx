import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  initialWindowMetrics,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {getChurchesList, ChurchListItem} from '../../church/services/church.service';
import SearchInput from '../../../shared/components/SearchInput';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {COLORS} from '../../../shared/constants/colors';
import {fs, ms, rs, ws} from '../../../shared/utils/scale';

interface Props {
  visible: boolean;
  selected: Record<number, string>;
  onClose: () => void;
  onDone: (selected: Record<number, string>) => void;
}

export const ChurchMultiSelectModal: React.FC<Props> = ({
  visible,
  selected,
  onClose,
  onDone,
}) => {
  const C = useThemedColors();
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, initialWindowMetrics?.insets.top ?? 0);
  const bottomInset = Math.max(
    insets.bottom,
    initialWindowMetrics?.insets.bottom ?? 0,
  );
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ChurchListItem[]>([]);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    if (visible) {
      setDraft(selected);
      setQuery('');
    }
  }, [selected, visible]);

  const loadChurches = useCallback(async () => {
    if (!visible) {
      return;
    }
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const data = await getChurchesList({
        page: 1,
        limit: 50,
        sort_by: 'name',
        sort_desc: false,
        search: query.trim() || undefined,
        disabled: false,
      });
      if (requestId !== requestRef.current) {
        return;
      }
      setItems(data?.items ?? []);
      setLoadError(null);
    } catch (error) {
      console.error('Error loading churches for watch list:', error);
      if (requestId !== requestRef.current) {
        return;
      }
      setItems([]);
      setLoadError(error);
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, [query, visible]);

  useEffect(() => {
    loadChurches();
  }, [loadChurches]);

  const toggle = (church: ChurchListItem) => {
    setDraft(current => {
      const next = {...current};
      if (next[church.id]) {
        delete next[church.id];
      } else {
        next[church.id] = church.name;
      }
      return next;
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.safeArea,
          {
            backgroundColor: C.background,
            paddingTop: topInset,
            paddingBottom: bottomInset,
          },
        ]}>
        <View style={[styles.header, {borderBottomColor: C.border}]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, {color: C.textSecondary}]}>
              {t('cancel')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, {color: C.textPrimary}]}>
            {t('selectChurches')}
          </Text>
          <TouchableOpacity
            onPress={() => onDone(draft)}
            style={styles.headerButton}>
            <Text style={[styles.headerButtonText, {color: COLORS.mainColor}]}>
              {t('done')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('searchChurches')}
          />
          <Text style={[styles.count, {color: C.textSecondary}]}>
            {t('selectedChurches')}: {Object.keys(draft).length}
          </Text>
          <FlatList
            data={items}
            keyExtractor={item => String(item.id)}
            keyboardShouldPersistTaps="handled"
            onRefresh={loadChurches}
            refreshing={loading}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator color={COLORS.mainColor} />
              ) : loadError ? (
                <ApiErrorState error={loadError} onRetry={loadChurches} />
              ) : (
                <Text style={[styles.empty, {color: C.textSecondary}]}>
                  {t('noChurchesFound')}
                </Text>
              )
            }
            renderItem={({item}) => {
              const checked = Boolean(draft[item.id]);
              return (
                <TouchableOpacity
                  onPress={() => toggle(item)}
                  style={[
                    styles.row,
                    {
                      backgroundColor: checked ? C.bgSelectedOption : C.surface,
                      borderColor: checked ? COLORS.mainColor : C.border,
                    },
                  ]}>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: checked ? COLORS.mainColor : C.inputBorder,
                        backgroundColor: checked ? COLORS.mainColor : C.inputBg,
                      },
                    ]}>
                    {checked && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.churchName, {color: C.textPrimary}]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
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
  headerButton: {
    minWidth: ws(64),
    paddingVertical: ms(8),
  },
  headerButtonText: {fontSize: fs(13), fontWeight: '600'},
  title: {fontSize: fs(14), fontWeight: '700'},
  content: {flex: 1, padding: ms(16)},
  count: {fontSize: fs(11), marginBottom: ms(10)},
  row: {
    minHeight: ws(48),
    borderWidth: 1,
    borderRadius: rs(8),
    marginBottom: ms(8),
    padding: ms(10),
    flexDirection: 'row',
    alignItems: 'center',
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
  churchName: {flex: 1, fontSize: fs(12)},
  empty: {textAlign: 'center', marginTop: ms(30)},
  listContent: {flexGrow: 1},
});

export default ChurchMultiSelectModal;
