import React from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {ms} from '../../../shared/utils/scale';
import {ChurchAttendanceChartPanel} from '../components/ChurchAttendanceChartPanel';
import {useDashboardChartChurchId} from '../hooks/useDashboardChartChurchId';

export default function ChurchAttendanceChartScreen() {
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
        <Header title={t('churchAttendanceChart')} />
        <ChurchAttendanceChartPanel
          churchId={churchId}
          refreshKey={refreshKey}
          scrollable
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: ms(12),
  },
});
