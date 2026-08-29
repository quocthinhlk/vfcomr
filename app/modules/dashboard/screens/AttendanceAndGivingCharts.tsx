import React, {useEffect, useMemo, useState} from 'react';
import {Image, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs, ms, rs} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';
import {ChurchAttendanceChartPanel} from '../components/ChurchAttendanceChartPanel';
import {ChurchGivingChartPanel} from '../components/ChurchGivingChartPanel';
import {useDashboardChartChurchId} from '../hooks/useDashboardChartChurchId';
import {getChurchGivingGraph} from '../services/churchGivingChart.service';

const TIP_ICON = require('../../../assets/images/icon/tip.png');
const LINE_CHART_ICON = require('../../../assets/images/icon/line-chart.png');
const BOLD_ARROW_ICON = require('../../../assets/images/icon/bold-arrow.png');

export default function AttendanceAndGivingChartsScreen() {
  const C = useThemedColors();
  const {t} = useTranslation();
  const route = useRoute<any>();
  const [show24Months, setShow24Months] = useState(false);
  const routeChurchId =
    typeof route?.params?.churchId === 'number' ? route.params.churchId : undefined;
  const {churchId, refreshKey} = useDashboardChartChurchId(routeChurchId);
  const [churchName, setChurchName] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadChurchName = async () => {
      try {
        const result = await getChurchGivingGraph({churchId});
        if (cancelled) {
          return;
        }
        const preferred =
          result?.data?.find(item => item.church_id === churchId) ??
          result?.data?.find(item => item.church_id !== 0) ??
          null;
        setChurchName(preferred?.church_name?.trim() ?? '');
      } catch {
        if (!cancelled) {
          setChurchName('');
        }
      }
    };

    loadChurchName();

    return () => {
      cancelled = true;
    };
  }, [churchId, refreshKey]);

  const toggleLabel = useMemo(() => {
    return show24Months ? t('returnToLast12Months') : t('showLast24Months');
  }, [show24Months, t]);

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('attendanceAndGivingCharts')} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.landscapeTip,
              {
                backgroundColor: C.surface,
                borderColor: C.inputBorder,
              },
            ]}>
            <View style={styles.landscapeTipRow}>
              <Image
                source={TIP_ICON}
                style={[styles.landscapeTipIcon, {tintColor: C.textSecondary}]}
              />
              <Text style={[styles.landscapeTipText, {color: C.textSecondary}]}>
                {t('chartsLandscapeTip')}
              </Text>
            </View>
          </View>
          {churchName ? (
            <Text style={[styles.churchName, {color: C.textPrimary}]}>
              {churchName}
            </Text>
          ) : null}
          <TouchableOpacity
            onPress={() => setShow24Months(prev => !prev)}
            activeOpacity={0.6}
            style={styles.toggleLink}>
            <Image
              source={LINE_CHART_ICON}
              style={[styles.toggleLinkIcon, {tintColor: COLORS.mainColor}]}
            />
            <Text style={[styles.toggleLinkText, {color: COLORS.mainColor}]}>
              {toggleLabel}
            </Text>
            <Image
              source={BOLD_ARROW_ICON}
              style={[
                styles.toggleLinkArrow,
                {tintColor: COLORS.mainColor},
                show24Months ? styles.toggleLinkArrowDown : null,
              ]}
            />
          </TouchableOpacity>
          {show24Months ? (
            <>
              <View style={[styles.chartContainer, {backgroundColor: C.surface}]}>
                <ChurchAttendanceChartPanel
                  churchId={churchId}
                  refreshKey={refreshKey}
                  period="2y"
                  displayWeeks={104}
                  titleKey="attendanceLast24Months"
                  containerStyle={{backgroundColor: C.surface}}
                />
              </View>
              <View style={styles.sectionGap} />
              <View style={[styles.chartContainer, {backgroundColor: C.surface}]}>
                <ChurchGivingChartPanel
                  churchId={churchId}
                  refreshKey={refreshKey}
                  period="2y"
                  displayWeeks={104}
                  titleKey="givingLast24Months"
                  containerStyle={{backgroundColor: C.surface}}
                />
              </View>
            </>
          ) : (
            <>
              <View style={[styles.chartContainer, {backgroundColor: C.surface}]}>
                <ChurchAttendanceChartPanel
                  churchId={churchId}
                  refreshKey={refreshKey}
                  containerStyle={{backgroundColor: C.surface}}
                />
              </View>
              <View style={styles.sectionGap} />
              <View style={[styles.chartContainer, {backgroundColor: C.surface}]}>
                <ChurchGivingChartPanel 
                  churchId={churchId} 
                  refreshKey={refreshKey}
                  containerStyle={{backgroundColor: C.surface}} 
                />
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: ms(12),
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: ms(8),
    paddingBottom: ms(24),
  },
  landscapeTip: {
    marginBottom: ms(12),
    paddingHorizontal: ms(10),
    paddingVertical: ms(8),
    borderRadius: rs(8),
    borderWidth: StyleSheet.hairlineWidth,
  },
  landscapeTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  landscapeTipIcon: {
    width: ms(14),
    height: ms(14),
    resizeMode: 'contain',
    marginRight: ms(6),
    marginTop: ms(1),
  },
  landscapeTipText: {
    fontSize: fs(12),
    lineHeight: fs(18),
    fontStyle: 'italic',
    flex: 1,
  },
  churchName: {
    fontSize: fs(13),
    fontWeight: '700',
    lineHeight: fs(20),
    marginBottom: ms(8),
  },
  toggleLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: ms(12),
    paddingVertical: ms(2),
  },
  toggleLinkIcon: {
    width: ms(16),
    height: ms(16),
    marginRight: ms(8),
    resizeMode: 'contain',
  },
  toggleLinkText: {
    fontSize: fs(12),
    lineHeight: fs(18),
    fontWeight: '600',
    marginRight: ms(6),
  },
  toggleLinkArrow: {
    width: ms(12),
    height: ms(12),
    resizeMode: 'contain',
  },
  toggleLinkArrowDown: {
    transform: [{rotate: '90deg'}],
  },
  sectionGap: {
    height: ms(20),
  },
  sectionGapSmall: {
    height: ms(14),
  },
  chartContainer: {
    borderRadius: rs(8),
    padding: ms(12),
    marginBottom: ms(12),
  },
});
