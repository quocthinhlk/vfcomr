import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs, ms, rs} from '../../../shared/utils/scale';
import {ChurchAttendanceChartPanel} from '../components/ChurchAttendanceChartPanel';
import {ChurchGivingChartPanel} from '../components/ChurchGivingChartPanel';
import {useDashboardChartChurchId} from '../hooks/useDashboardChartChurchId';

export default function AttendanceAndGivingChartsScreen() {
  const C = useThemedColors();
  const {t} = useTranslation();
  const route = useRoute<any>();
  const routeChurchId =
    typeof route?.params?.churchId === 'number' ? route.params.churchId : undefined;
  const {churchId, refreshKey} = useDashboardChartChurchId(routeChurchId);

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
            <Text style={[styles.landscapeTipText, {color: C.textSecondary}]}>
              {t('chartsLandscapeTip')}
            </Text>
          </View>
          <ChurchAttendanceChartPanel
            churchId={churchId}
            refreshKey={refreshKey}
          />
          <View style={styles.sectionGap} />
          <ChurchGivingChartPanel churchId={churchId} refreshKey={refreshKey} />
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
  landscapeTipText: {
    fontSize: fs(12),
    lineHeight: fs(18),
    fontStyle: 'italic',
  },
  sectionGap: {
    height: ms(20),
  },
});
