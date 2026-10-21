import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Image, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs, ws} from '../../../shared/utils/scale';
import {ListEmptyState, ScreenContainer} from '../../../shared/components/crud';
import {AdminOverseerSection} from '../components/AdminOverseerSection';
import {
  AdminOverseerSummary,
  buildOverseerChartData,
  getCachedMyOverseer,
  getMyOverseers,
} from '../services/adminDashboard.service';
import {provideOverseerChartData} from '../services/overseerIndicators.service';

const blankAvatar = require('../../../assets/icons/avatar_blank.png');
const chevron = require('../../../../app/assets/images/icon-down.png');

// Same chart entries as the admin dashboard's overseer block.
const CHARTS = [
  {
    routeName: 'OverseerChurchAttendanceChart',
    labelKey: 'attendanceChart',
    icon: require('../../../../app/assets/images/icon/line-chart.png'),
  },
  {
    routeName: 'PastoralVisitsChart',
    labelKey: 'pastoralVisits',
    icon: require('../../../../app/assets/images/icon/visit.png'),
  },
  {
    routeName: 'OverseerChurchesPlantedLast10Years',
    labelKey: 'churchesPlantedLast10Years',
    icon: require('../../../../app/assets/images/icon/replay-10.png'),
  },
] as const;

/**
 * One overseer from My Overseers (Overseer role): profile, indicators and charts.
 * Uses the list already loaded by My Overseers; reloads it only if missing.
 * Route params: `overseerId`.
 */
export default function MyOverseerDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const overseerId = Number(route.params?.overseerId);
  const {t} = useTranslation();
  const C = useThemedColors();
  const [overseer, setOverseer] = useState<AdminOverseerSummary | null>(
    () => getCachedMyOverseer(overseerId) ?? null,
  );
  const [loading, setLoading] = useState(!overseer);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await getMyOverseers();
      if (mountedRef.current) {
        setOverseer(list.find(o => o.profile.id === overseerId) ?? null);
      }
    } catch (e) {
      console.error('[MyOverseerDetail] load failed', {overseerId, error: e});
      if (mountedRef.current) {
        setLoadError(e);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [overseerId]);

  useEffect(() => {
    mountedRef.current = true;
    if (!getCachedMyOverseer(overseerId)) {
      load();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [load, overseerId]);

  const openChart = (routeName: string) => {
    if (!overseer) {
      return;
    }
    const {indicators, header} = buildOverseerChartData(overseer);
    provideOverseerChartData(overseer.profile.id, indicators as any, header);
    navigation.navigate(routeName, {overseerId: overseer.profile.id});
  };

  const profile = overseer?.profile;
  const photo = String(profile?.photo_url ?? '').trim();
  const meta = [profile?.title, profile?.role_name].filter(Boolean).join(' · ');

  return (
    <ScreenContainer
      title={t('myOverseers')}
      loading={loading}
      error={!overseer ? loadError : null}
      onRetry={load}>
      {!overseer || !profile ? (
        <ListEmptyState />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, {backgroundColor: C.surface, borderColor: C.surfaceBorder}]}>
            <Image
              source={photo && !photoFailed ? {uri: photo} : blankAvatar}
              onError={() => setPhotoFailed(true)}
              style={styles.avatar}
              accessibilityIgnoresInvertColors
            />
            <View style={styles.text}>
              <Text style={[styles.name, {color: C.textPrimary}]}>
                {profile.name}
                <Text style={[styles.id, {color: C.textSecondary}]}>{`  #${profile.id}`}</Text>
              </Text>
              {meta ? <Text style={[styles.meta, {color: C.textSecondary}]}>{meta}</Text> : null}
              {profile.email ? (
                <Text style={[styles.meta, {color: C.textSecondary}]}>{profile.email}</Text>
              ) : null}
            </View>
          </View>

          <AdminOverseerSection overseer={overseer} />

          <View>
            {CHARTS.map(chart => (
              <TouchableOpacity
                key={chart.routeName}
                onPress={() => openChart(chart.routeName)}
                activeOpacity={0.7}
                accessibilityRole="button"
                style={[styles.chartRow, {borderBottomColor: C.border}]}>
                <Image source={chart.icon} style={styles.chartIcon} />
                <Text style={[styles.chartLabel, {color: C.textPrimary}]}>{t(chart.labelKey)}</Text>
                <Image source={chevron} style={styles.chevron} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: ms(8),
    paddingBottom: ms(28),
    gap: ms(10),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(12),
    paddingVertical: ms(10),
    paddingHorizontal: ms(12),
    borderWidth: 1,
    borderRadius: rs(12),
  },
  avatar: {
    width: ws(52),
    height: ws(52),
    borderRadius: ws(26),
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: fs(16),
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
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ms(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chartIcon: {
    width: ws(23),
    height: ws(23),
    marginRight: ms(12),
    resizeMode: 'contain',
  },
  chartLabel: {
    flex: 1,
    fontSize: fs(14),
  },
  chevron: {
    width: ws(15),
    height: ws(15),
    transform: [{rotate: '-90deg'}],
  },
});
