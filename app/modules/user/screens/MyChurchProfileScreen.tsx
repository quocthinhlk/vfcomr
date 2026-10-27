import React, {useCallback, useEffect, useRef, useState} from 'react';
import {FlatList} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import api from '../../../config/api';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {
  ListEmptyState,
  ListLoadState,
  ScreenContainer,
  listContentStyle,
} from '../../../shared/components/crud';
import ActionSheetModal, {ActionItem} from '../../../shared/components/ActionSheetModal';
import {ChurchListCard} from '../../church/components/ChurchListCard';
import {getChurchDetail, type ChurchListItem} from '../../church/services/church.service';
import {getUserById} from '../services/user.service';

type ChurchRef = {id: number; name: string};

/** Full church row (photo, city, pastor, badges) for ChurchListCard; falls back to the name only. */
async function loadChurchCard(ref: ChurchRef): Promise<ChurchListItem> {
  const base = {
    id: ref.id,
    name: ref.name,
    short_name: '',
    is_mother_church: false,
    city: null,
    photo: null,
    date_of_birth: null,
    pastor_name: null,
    country_name: null,
    disabled: false,
    created: '',
    modified: '',
  } as ChurchListItem;
  try {
    const d = await getChurchDetail(ref.id);
    if (!d) {
      return base;
    }
    return {
      ...base,
      ...d,
      name: d.name || ref.name,
      city: d.city ?? d.city_name ?? null,
    } as ChurchListItem;
  } catch {
    return base;
  }
}

/** `from_churches` of the signed-in user (same source as UserScreen's fromChurchNames). */
async function loadMyChurches(): Promise<ChurchRef[]> {
  const me = await api.get('users/me');
  const myId = Number(me?.data?.data?.id);
  if (!Number.isFinite(myId) || myId <= 0) {
    return [];
  }
  const res: any = await getUserById(myId, true);
  // Same unwrapping as UserScreen: the user may sit at res, res.data or res.data.data.
  const u = [res, res?.data, res?.data?.data].find(
    o => o && typeof o === 'object' && ('from_churches' in o || 'fromChurches' in o),
  );
  const list = u?.from_churches ?? u?.fromChurches ?? [];
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map((c: any) => ({id: Number(c?.id), name: String(c?.name || '').trim()}))
    .filter((c: ChurchRef) => Number.isFinite(c.id) && c.id > 0);
}

/**
 * Overseer menu → My Dashboard → My Church Profile. One church opens its
 * Church Detail (with Edit) directly; several churches are listed to pick from.
 */
export default function MyChurchProfileScreen() {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  const [churches, setChurches] = useState<ChurchListItem[]>([]);
  const [selected, setSelected] = useState<ChurchListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);

  // Answers that arrive after Back must not replace or update a closed screen.
  const aliveRef = useRef(true);
  useEffect(
    () => () => {
      aliveRef.current = false;
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await loadMyChurches();
      if (!aliveRef.current) {
        return;
      }
      if (list.length === 1) {
        // Nothing to choose: go straight to the church (Back returns past this screen).
        navigation.replace('ChurchDetail', {id: list[0].id});
        return;
      }
      const cards = await Promise.all(list.map(loadChurchCard));
      if (aliveRef.current) {
        setChurches(cards);
      }
    } catch (e) {
      if (aliveRef.current) {
        setLoadError(e);
      }
    } finally {
      if (aliveRef.current) {
        setLoading(false);
      }
    }
  }, [navigation]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScreenContainer title={t('myChurchProfile')} loading={loading && churches.length === 0}>
      <FlatList
        data={churches}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={listContentStyle}
        renderItem={({item}) => (
          <ChurchListCard
            item={item}
            onPress={() => navigation.navigate('ChurchDetail', {id: item.id})}
            onMorePress={() => setSelected(item)}
            moreAccessibilityLabel={`${item.name}: ${t('churchDetail')}, ${t('editChurch')}`}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <ListLoadState error={loadError} onRetry={load}>
              <ListEmptyState hint={t('myChurchProfileEmpty')} />
            </ListLoadState>
          ) : null
        }
      />

      {/* Same "…" actions as the Churches list. */}
      <ActionSheetModal
        visible={!!selected}
        title={selected?.name}
        onRequestClose={() => setSelected(null)}
        actions={((): ActionItem[] => {
          if (!selected) {
            return [];
          }
          const id = selected.id;
          const go = (routeName: string) => () => {
            setSelected(null);
            navigation.navigate(routeName, {id});
          };
          return [
            {label: t('churchDetail'), icon: 'view', onPress: go('ChurchDetail')},
            {label: t('editChurch'), icon: 'edit', onPress: go('EditChurch')},
          ];
        })()}
      />
    </ScreenContainer>
  );
}
