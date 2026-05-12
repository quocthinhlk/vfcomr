import React, {useEffect, useState} from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {getEventTypeById} from '../services/eventType.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs, hs} from '../../../shared/utils/scale';
import {EventTypeItem} from '../services/eventType.service';

export const EventTypeDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const eventTypeId: number | undefined = route.params?.eventTypeId;
  const [eventType, setEventType] = useState<EventTypeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const {t} = useTranslation();
  const C = useThemedColors();

  useEffect(() => {
    let mounted = true;
    if (eventTypeId) {
      getEventTypeById(eventTypeId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setEventType(res?.data || null);
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) {
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [eventTypeId]);

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={{flex: 1, backgroundColor: C.background}}>
        <View style={styles.container}>
          <Header title={t('eventTypeDetail') || 'Event Type Detail'} showMenu={false} />
          {loading ? (
            <Text style={[styles.loading, {color: C.textPrimary}]}>
              {t('loading') || 'Loading'}...
            </Text>
          ) : !eventType ? (
            <Text style={[styles.loading, {color: C.textPrimary}]}>
              {t('noDataFound') || 'No data found'}
            </Text>
          ) : (
            <ScrollView

              contentContainerStyle={styles.scrollContent}>
              <View style={styles.content}>
                <View style={[styles.detailCard, styles.cardShadow, {backgroundColor: C.surface, borderColor: C.surfaceBorder}]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.label, {color: C.textSecondary}]}>
                      {t('name') || 'Name'}
                    </Text>
                    <Text style={[styles.value, {color: C.textPrimary}]}>
                      {eventType.name}
                    </Text>
                  </View>
                </View>

                <View style={[styles.detailCard, styles.cardShadow, {backgroundColor: C.surface, borderColor: C.surfaceBorder}]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.label, {color: C.textSecondary}]}>
                      {t('textColour') || 'Text Colour'}
                    </Text>
                    <View style={styles.colorRow}>
                      <View style={[styles.colorBox, {backgroundColor: eventType.color, borderColor: C.inputBorder}]} />
                      <Text style={[styles.colorValue, {color: C.textPrimary}]}>
                        {eventType.color}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.detailCard, styles.cardShadow, {backgroundColor: C.surface, borderColor: C.surfaceBorder}]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.label, {color: C.textSecondary}]}>
                      {t('reportCellColour') || 'Report Cell Colour'}
                    </Text>
                    <View style={styles.colorRow}>
                      <View style={[styles.colorBox, {backgroundColor: eventType.cell_color, borderColor: C.inputBorder}]} />
                      <Text style={[styles.colorValue, {color: C.textPrimary}]}>
                        {eventType.cell_color}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.detailCard, styles.cardShadow, {backgroundColor: C.surface, borderColor: C.surfaceBorder}]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.label, {color: C.textSecondary}]}>
                      {t('meetingType') || 'Meeting Type'}
                    </Text>
                    <Text style={[styles.value, {color: C.textPrimary}]}>
                      {eventType.meeting_type}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: ms(16),
    paddingRight: ms(16),
  },
  scrollContent: {
    paddingBottom: ms(24),
  },
  content: {
    marginTop: ms(16),
    gap: ms(16),
  },
  detailCard: {
    padding: ms(16),
    borderRadius: rs(12),
    borderWidth: 1,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: rs(6),
    shadowOffset: {width: 0, height: hs(3)},
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: ms(12),
  },
  label: {
    fontSize: fs(14),
    fontWeight: '600',
    flexShrink: 0,
  },
  value: {
    fontSize: fs(14),
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    flexShrink: 1,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(12),
    flex: 1,
    justifyContent: 'flex-end',
  },
  colorBox: {
    width: ms(32),
    height: ms(32),
    borderRadius: rs(6),
    borderWidth: 1,
    flexShrink: 0,
  },
  colorValue: {
    fontSize: fs(14),
    fontWeight: '500',
    fontFamily: 'monospace',
    minWidth: ms(70),
  },
  loading: {
    textAlign: 'center',
    marginTop: ms(40),
    fontSize: fs(14),
  },
});

export default EventTypeDetailScreen;

