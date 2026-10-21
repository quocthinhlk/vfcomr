import React, {useCallback, useEffect, useRef, useState} from 'react';
import {FlatList, Image, RefreshControl, StyleSheet, TouchableOpacity, View} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useNavigation} from '@react-navigation/native';
import {COLORS} from '../../../shared/constants/colors';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs, ws} from '../../../shared/utils/scale';
import {
  ListEmptyState,
  ListToolbar,
  ScreenContainer,
  listContentStyle,
} from '../../../shared/components/crud';
import {AdminOverseerSummary, getMyOverseers} from '../services/adminDashboard.service';

const blankAvatar = require('../../../assets/icons/avatar_blank.png');

/** One overseer: photo, name, title · role, email. */
const OverseerRow = React.memo(function OverseerRow({
  overseer,
  onPress,
}: {
  overseer: AdminOverseerSummary;
  onPress: () => void;
}) {
  const C = useThemedColors();
  const [photoFailed, setPhotoFailed] = useState(false);
  const {profile} = overseer;
  const photo = String(profile.photo_url ?? '').trim();
  const meta = [profile.title, profile.role_name].filter(Boolean).join(' · ');
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={profile.name}
      style={[styles.card, {backgroundColor: C.surface, borderColor: C.surfaceBorder}]}>
      <Image
        source={photo && !photoFailed ? {uri: photo} : blankAvatar}
        onError={() => setPhotoFailed(true)}
        style={styles.avatar}
        accessibilityIgnoresInvertColors
      />
      <View style={styles.text}>
        <Text style={[styles.name, {color: C.textPrimary}]} numberOfLines={2}>
          {profile.name}
          <Text style={[styles.id, {color: C.textSecondary}]}>{`  #${profile.id}`}</Text>
        </Text>
        {meta ? (
          <Text style={[styles.meta, {color: C.textSecondary}]} numberOfLines={2}>
            {meta}
          </Text>
        ) : null}
        {profile.email ? (
          <Text style={[styles.meta, {color: C.textSecondary}]} numberOfLines={1}>
            {profile.email}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

/**
 * Admin: My Dashboard > My Overseers (GET dashboard/overseer-assignments/my-overseers).
 * Tapping one opens the admin Dashboard with that overseer selected.
 */
export default function MyOverseersScreen() {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  const [overseers, setOverseers] = useState<AdminOverseerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const list = await getMyOverseers();
      if (mountedRef.current) {
        setOverseers(list);
        setLoadError(null);
      }
    } catch (e) {
      console.error('[MyOverseers] load failed', e);
      if (mountedRef.current) {
        setLoadError(e);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ScreenContainer
      title={t('myOverseers')}
      showMenu
      loading={loading}
      error={overseers.length === 0 ? loadError : null}
      onRetry={() => {
        setLoading(true);
        load();
      }}>
      <ListToolbar countText={`${overseers.length} ${t('overseers').toLowerCase()}`} />
      <FlatList
        data={overseers}
        keyExtractor={item => String(item.profile.id)}
        renderItem={({item}) => (
          <OverseerRow
            overseer={item}
            onPress={() => navigation.navigate('Dashboard', {overseerId: item.profile.id})}
          />
        )}
        style={styles.list}
        contentContainerStyle={listContentStyle}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.mainColor]}
            tintColor={COLORS.mainColor}
          />
        }
        ListEmptyComponent={!loading ? <ListEmptyState /> : null}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {flex: 1},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(12),
    paddingVertical: ms(10),
    paddingHorizontal: ms(12),
    borderWidth: 1,
    borderRadius: rs(12),
    marginBottom: ms(8),
  },
  avatar: {
    width: ws(48),
    height: ws(48),
    borderRadius: ws(24),
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: fs(15),
    fontWeight: '700',
  },
  id: {
    fontSize: fs(11),
    fontWeight: '500',
  },
  meta: {
    marginTop: ms(2),
    fontSize: fs(12),
    lineHeight: fs(17),
  },
});
