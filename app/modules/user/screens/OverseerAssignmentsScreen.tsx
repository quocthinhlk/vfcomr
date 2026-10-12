import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useRoute} from '@react-navigation/native';
import {ScreenContainer} from '../../../shared/components/crud';
import {MultiSelectSheet, MultiSelectOption} from '../../../shared/components/MultiSelectSheet';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChatIcon,
  ChurchIcon,
  CloseIcon,
  GlobeIcon,
  NetworkIcon,
  UiIconProps,
  UsersIcon,
} from '../../../shared/components/icons/UiIcons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useUiTokens} from '../../../shared/styles/uiTokens';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {fs, ms, rs, ws} from '../../../shared/utils/scale';
import type {TranslationKey} from '../../../shared/translations/types';
import {
  addAssignments,
  addExclusion,
  AssignedItem,
  AssignmentType,
  ExclusionType,
  getOverseerAssignments,
  loadAssignOptions,
  OverseerAssignments,
  removeAssignment,
  removeExclusion,
  searchOverseerOptions,
  updateSubOverseerOrder,
} from '../services/overseerAssignment.service';

const blankAvatar = require('../../../assets/icons/avatar_blank.png');

/** One card: what the overseer oversees (allow) or is kept out of (exclude). */
type Section = {
  key: string;
  kind: 'allow' | 'exclude';
  type: AssignmentType;
  labelKey: TranslationKey;
  Icon: React.FC<UiIconProps>;
};

const SECTION: Record<string, Section> = {
  net: {key: 'net', kind: 'allow', type: 'church_network', labelKey: 'churchNetworks', Icon: NetworkIcon},
  geo: {key: 'geo', kind: 'allow', type: 'geographical_region', labelKey: 'geographicalRegions', Icon: GlobeIcon},
  geoEx: {key: 'geoEx', kind: 'exclude', type: 'geographical_region', labelKey: 'geographicalRegions', Icon: GlobeIcon},
  cr: {key: 'cr', kind: 'allow', type: 'church_region', labelKey: 'churchApostolicRegions', Icon: ChurchIcon},
  crEx: {key: 'crEx', kind: 'exclude', type: 'church_region', labelKey: 'churchApostolicRegions', Icon: ChurchIcon},
  lang: {key: 'lang', kind: 'allow', type: 'language_region', labelKey: 'languageRegions', Icon: ChatIcon},
  ov: {key: 'ov', kind: 'allow', type: 'overseer', labelKey: 'overseersOnDashboard', Icon: UsersIcon},
};

// Same order as the web page; each region card also holds its exclusion list.
const GROUPS: {allow: Section; exclude?: Section}[] = [
  {allow: SECTION.net},
  {allow: SECTION.geo, exclude: SECTION.geoEx},
  {allow: SECTION.cr, exclude: SECTION.crEx},
  {allow: SECTION.lang},
  {allow: SECTION.ov},
];

/**
 * Oversight assignments of one overseer (GET/POST/DELETE overseer-assignments,
 * exclusions, sub-overseer sort order). Route params: `userId`, `name`.
 */
export default function OverseerAssignmentsScreen() {
  const route = useRoute<any>();
  const userId: number = Number(route.params?.userId);
  const {t} = useTranslation();
  const C = useThemedColors();
  const T = useUiTokens();

  const [data, setData] = useState<OverseerAssignments | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [picker, setPicker] = useState<Section | null>(null);
  // Local order of sub-overseers until "Update sort order" is pressed.
  const [overseerOrder, setOverseerOrder] = useState<AssignedItem[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const next = await getOverseerAssignments(userId);
      if (mountedRef.current) {
        setData(next);
        setOverseerOrder(next.allowed.overseer);
      }
    } catch (e) {
      if (mountedRef.current) {
        setLoadError(e);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const itemsOf = (section: Section): AssignedItem[] => {
    if (!data) {
      return [];
    }
    if (section.kind === 'exclude') {
      return data.excluded[section.type as ExclusionType] ?? [];
    }
    return section.type === 'overseer' ? overseerOrder : data.allowed[section.type] ?? [];
  };

  const titleOf = (section: Section) =>
    `${section.kind === 'exclude' ? t('exclusionList') : t('overseeing')}: ${t(section.labelKey)}`;

  const orderChanged = useMemo(() => {
    const saved = data?.allowed.overseer ?? [];
    return overseerOrder.some((o, i) => o.id !== saved[i]?.id);
  }, [overseerOrder, data]);

  const confirmRemove = (section: Section, item: AssignedItem) => {
    // Removing an exclusion needs the exclusion record's own id, which the API
    // does not return yet; never fall back to the region id.
    if (section.kind === 'exclude' && !item.exclusionId) {
      Alert.alert(t('remove'), t('exclusionRemoveUnavailable'));
      return;
    }
    Alert.alert(t('remove'), t('removeAssignmentConfirm').replace('{name}', item.name), [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('remove'),
        style: 'destructive',
        onPress: async () => {
          const key = `${section.key}-${item.id}`;
          setRemovingKey(key);
          try {
            if (section.kind === 'exclude') {
              await removeExclusion(userId, section.type as ExclusionType, item.exclusionId!);
            } else {
              await removeAssignment(userId, section.type, item.id);
            }
            await load();
          } catch (e) {
            Alert.alert(t('error'), getApiErrorMessage(e, t));
          } finally {
            if (mountedRef.current) {
              setRemovingKey(null);
            }
          }
        },
      },
    ]);
  };

  const moveOverseer = (index: number, direction: -1 | 1) => {
    setOverseerOrder(prev => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) {
        return prev;
      }
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const saveOrder = async () => {
    setSavingOrder(true);
    try {
      await updateSubOverseerOrder(
        userId,
        overseerOrder.map(o => o.id),
      );
      Alert.alert(t('success'), t('sortOrderUpdated'));
      await load();
    } catch (e) {
      Alert.alert(t('error'), getApiErrorMessage(e, t));
    } finally {
      if (mountedRef.current) {
        setSavingOrder(false);
      }
    }
  };

  // Picker plumbing: options per section, then add (or exclude) the chosen ones.
  const loadPickerOptions = useCallback(
    (search: string): Promise<MultiSelectOption[]> => {
      if (!picker) {
        return Promise.resolve([]);
      }
      return picker.type === 'overseer'
        ? searchOverseerOptions(search).then(list => list.filter(o => o.id !== userId))
        : loadAssignOptions(picker.type);
    },
    [picker, userId],
  );

  const savePicked = async (ids: number[]) => {
    if (!picker) {
      return;
    }
    if (picker.kind === 'exclude') {
      // The exclusions API takes one region per request.
      for (const id of ids) {
        await addExclusion(userId, picker.type as ExclusionType, id);
      }
    } else {
      await addAssignments(userId, picker.type, ids);
    }
    await load();
  };

  // Removable value: name + #id, with its own ✕ target (labels never wrap).
  const renderChip = (section: Section, item: AssignedItem) => {
    const exclude = section.kind === 'exclude';
    const busy = removingKey === `${section.key}-${item.id}`;
    return (
      <View
        key={item.id}
        style={[styles.chip, {backgroundColor: exclude ? T.dangerTint : T.neutralTint}]}>
        <Text
          style={[styles.chipText, {color: exclude ? T.dangerText : C.textPrimary}]}
          numberOfLines={1}
          accessibilityLabel={`${item.name}, #${item.id}`}>
          {item.name}
          <Text style={[styles.chipId, {color: C.textSecondary}]}>{`  #${item.id}`}</Text>
        </Text>
        <TouchableOpacity
          onPress={() => confirmRemove(section, item)}
          disabled={!!removingKey}
          hitSlop={{top: 10, bottom: 10, left: 6, right: 10}}
          style={styles.chipRemove}
          accessibilityRole="button"
          accessibilityLabel={`${t('remove')} ${item.name}`}>
          {busy ? (
            <ActivityIndicator size="small" color={T.dangerText} />
          ) : (
            <CloseIcon color={exclude ? T.dangerText : C.textSecondary} size={ws(13)} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const addButton = (section: Section, label: string, danger = false) => (
    <Pressable
      onPress={() => setPicker(section)}
      hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${titleOf(section)}`}
      style={({pressed}) => [
        styles.addButton,
        {backgroundColor: pressed ? T.pressedBg : danger ? T.dangerTint : T.brandTint},
      ]}>
      <Text style={[styles.addText, {color: danger ? T.dangerText : T.brandText}]}>{`+ ${label}`}</Text>
    </Pressable>
  );

  // Sub-overseers keep rows: their order is shown on the dashboard.
  const renderOverseerRows = (section: Section, items: AssignedItem[]) => (
    <View>
      {items.map((item, index) => {
        const busy = removingKey === `${section.key}-${item.id}`;
        const sortable = items.length > 1;
        return (
          <View
            key={item.id}
            style={[styles.row, index > 0 && {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border}]}>
            {sortable ? (
              <View style={styles.sortButtons}>
                <TouchableOpacity
                  onPress={() => moveOverseer(index, -1)}
                  disabled={index === 0 || savingOrder}
                  style={[styles.sortButton, index === 0 && styles.dim]}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}: ${t('moveUp')}`}>
                  <ArrowUpIcon color={T.brandText} size={ws(15)} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moveOverseer(index, 1)}
                  disabled={index === items.length - 1 || savingOrder}
                  style={[styles.sortButton, index === items.length - 1 && styles.dim]}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}: ${t('moveDown')}`}>
                  <ArrowDownIcon color={T.brandText} size={ws(15)} />
                </TouchableOpacity>
              </View>
            ) : null}
            <Text style={[styles.rowName, {color: C.textPrimary}]}>
              {item.name}
              <Text style={[styles.chipId, {color: C.textSecondary}]}>{`  #${item.id}`}</Text>
            </Text>
            <TouchableOpacity
              onPress={() => confirmRemove(section, item)}
              disabled={!!removingKey}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              style={styles.rowRemove}
              accessibilityRole="button"
              accessibilityLabel={`${t('remove')} ${item.name}`}>
              {busy ? (
                <ActivityIndicator size="small" color={T.dangerText} />
              ) : (
                <CloseIcon color={C.textSecondary} size={ws(15)} />
              )}
            </TouchableOpacity>
          </View>
        );
      })}
      {orderChanged ? (
        <Pressable
          onPress={saveOrder}
          disabled={savingOrder}
          accessibilityRole="button"
          style={({pressed}) => [styles.saveOrder, {backgroundColor: T.brandText}, (pressed || savingOrder) && styles.pressed]}>
          {savingOrder ? (
            <ActivityIndicator size="small" color={T.sheetBg} />
          ) : (
            <Text style={[styles.saveOrderText, {color: T.sheetBg}]}>{t('updateSortOrder')}</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );

  const renderGroup = ({allow, exclude}: {allow: Section; exclude?: Section}) => {
    const items = itemsOf(allow);
    const excluded = exclude ? itemsOf(exclude) : [];
    return (
      <View
        key={allow.key}
        style={[styles.card, {backgroundColor: C.surface, borderColor: C.surfaceBorder}]}>
        <View style={styles.cardHeader}>
          <allow.Icon color={T.brandText} size={ws(18)} />
          <Text style={[styles.cardTitle, {color: C.textPrimary}]} accessibilityRole="header">
            {t(allow.labelKey)}
            <Text style={[styles.cardCount, {color: C.textSecondary}]}>{`  ${items.length}`}</Text>
          </Text>
          {addButton(allow, t('add'))}
        </View>

        {items.length === 0 ? (
          <Text style={[styles.empty, {color: C.textSecondary}]}>{t('nothingAssigned')}</Text>
        ) : allow.type === 'overseer' ? (
          renderOverseerRows(allow, items)
        ) : (
          <View style={styles.chips}>{items.map(item => renderChip(allow, item))}</View>
        )}

        {exclude ? (
          <View style={[styles.excludeBlock, {borderTopColor: C.border}]}>
            <View style={styles.excludeHeader}>
              <Text style={[styles.excludeLabel, {color: T.dangerText}]}>
                {t('exclusionList')}
                <Text style={[styles.cardCount, {color: C.textSecondary}]}>{`  ${excluded.length}`}</Text>
              </Text>
              {addButton(exclude, t('exclude'), true)}
            </View>
            {excluded.length === 0 ? (
              <Text style={[styles.empty, {color: C.textSecondary}]}>{t('noExclusions')}</Text>
            ) : (
              <View style={styles.chips}>{excluded.map(item => renderChip(exclude, item))}</View>
            )}
          </View>
        ) : null}
      </View>
    );
  };

  const user = data?.user;
  const photo = String(user?.photo_url ?? '').trim();
  const subtitle = [user?.title, user?.role_name ? `[${user.role_name}]` : '']
    .filter(Boolean)
    .join('  ');

  return (
    <ScreenContainer
      title={t('oversightAssignments')}
      loading={loading}
      error={!data ? loadError : null}
      onRetry={load}>
      {/* No pull-to-refresh: on iOS it opened this screen scrolled past the
          overseer card, and every change already reloads the data. */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.userCard, {backgroundColor: C.surface, borderColor: C.surfaceBorder}]}>
          <Image
            source={photo && !photoFailed ? {uri: photo} : blankAvatar}
            onError={() => setPhotoFailed(true)}
            style={styles.avatar}
            accessibilityIgnoresInvertColors
          />
          <View style={styles.userText}>
            <Text style={[styles.userName, {color: C.textPrimary}]}>
              {user?.name || route.params?.name || `#${userId}`}
              <Text style={[styles.chipId, {color: C.textSecondary}]}>{`  #${userId}`}</Text>
            </Text>
            {subtitle ? (
              <Text style={[styles.userMeta, {color: C.textSecondary}]}>{subtitle}</Text>
            ) : null}
          </View>
        </View>

        {GROUPS.map(renderGroup)}
      </ScrollView>

      <MultiSelectSheet
        visible={!!picker}
        title={picker ? `${picker.kind === 'exclude' ? t('exclude') : t('add')}: ${t(picker.labelKey)}` : ''}
        note={t('noDuplicatesNote')}
        loadOptions={loadPickerOptions}
        remoteSearch={picker?.type === 'overseer'}
        excludeIds={picker ? itemsOf(picker).map(i => i.id) : []}
        saveLabel={t('save')}
        onSave={savePicked}
        onClose={() => setPicker(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: ms(8),
    paddingBottom: ms(28),
    gap: ms(10),
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(12),
    paddingVertical: ms(10),
    paddingHorizontal: ms(12),
    borderWidth: 1,
    borderRadius: rs(12),
  },
  avatar: {
    width: ws(44),
    height: ws(44),
    borderRadius: ws(22),
  },
  userText: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: fs(16),
    fontWeight: '700',
  },
  userMeta: {
    marginTop: ms(2),
    fontSize: fs(12),
    lineHeight: fs(17),
  },
  card: {
    borderWidth: 1,
    borderRadius: rs(12),
    paddingHorizontal: ms(12),
    paddingTop: ms(10),
    paddingBottom: ms(12),
    gap: ms(8),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
    minHeight: 36,
  },
  cardTitle: {
    flex: 1,
    fontSize: fs(15),
    fontWeight: '700',
  },
  cardCount: {
    fontSize: fs(13),
    fontWeight: '600',
  },
  addButton: {
    minHeight: 32,
    paddingHorizontal: ms(12),
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontSize: fs(13),
    fontWeight: '600',
  },
  empty: {
    fontSize: fs(13),
  },
  // Removable values wrap onto more lines instead of being clipped.
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(6),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    minHeight: 32,
    paddingLeft: ms(12),
    borderRadius: 16,
  },
  chipText: {
    flexShrink: 1,
    fontSize: fs(13),
    fontWeight: '600',
  },
  chipId: {
    fontSize: fs(11),
    fontWeight: '500',
  },
  chipRemove: {
    width: 30,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  excludeBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: ms(10),
    gap: ms(8),
  },
  excludeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
  },
  excludeLabel: {
    flex: 1,
    fontSize: fs(13),
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
    minHeight: 44,
  },
  sortButtons: {
    flexDirection: 'row',
  },
  sortButton: {
    width: 30,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: {
    opacity: 0.3,
  },
  rowName: {
    flex: 1,
    fontSize: fs(14),
    fontWeight: '600',
  },
  rowRemove: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveOrder: {
    alignSelf: 'flex-end',
    minHeight: 36,
    marginTop: ms(6),
    paddingHorizontal: ms(14),
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveOrderText: {
    fontSize: fs(13),
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
