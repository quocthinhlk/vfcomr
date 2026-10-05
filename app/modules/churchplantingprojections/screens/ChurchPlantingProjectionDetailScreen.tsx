import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  getChurchPlantingProjectionById,
  getStepsChartByProjectionId,
  ChurchPlantingProjectionItem,
  StepsChartItem,
} from '../services/churchPlantingProjection.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs, ws, hs} from '../../../shared/utils/scale';
import {SaveButton} from '../../../shared/components/ActionButtons';
import {
  DetailActions,
  DetailCard,
  DetailRow,
  ListEmptyState,
  ScreenContainer,
} from '../../../shared/components/crud';
import api from '../../../config/api';

export const ChurchPlantingProjectionDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const projectionId: number | undefined = route.params?.projectionId;
  const [projection, setProjection] = useState<ChurchPlantingProjectionItem | null>(null);
  const [stepsChart, setStepsChart] = useState<StepsChartItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [churchName, setChurchName] = useState<string>('');
  const {t} = useTranslation();
  const C = useThemedColors();

  const [loadError, setLoadError] = useState<unknown>(null);
  const requestRef = useRef(0);

  const loadProjection = useCallback(async () => {
    const requestId = ++requestRef.current;
    const isCurrent = () => requestId === requestRef.current;
    if (!projectionId) {
      setLoading(false);
      return;
    }
    try {
      const [projectionRes, stepsRes] = await Promise.all([
        getChurchPlantingProjectionById(projectionId),
        getStepsChartByProjectionId(projectionId),
      ]);
      if (!isCurrent()) {
        return;
      }
      const projectionData = projectionRes?.data || null;
      setProjection(projectionData);
      setStepsChart(stepsRes?.data || null);
      setLoadError(null);

      // Fetch church name
      if (projectionData?.church_id) {
        api
          .get(`churches/${projectionData.church_id}`)
          .then(churchRes => {
            const churchData = churchRes?.data?.data;
            if (churchData?.name && isCurrent()) {
              setChurchName(churchData.name);
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      if (isCurrent()) {
        console.error('Error fetching church planting projection:', e);
        setLoadError(e);
      }
    } finally {
      if (isCurrent()) {
        setLoading(false);
      }
    }
  }, [projectionId]);

  useEffect(() => {
    loadProjection();
    return () => {
      requestRef.current += 1;
    };
  }, [loadProjection, route.params?.refetchKey]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const renderStepsTable = () => {
    if (!stepsChart) return null;

    const rows = [
      {title: stepsChart.row1_title, key: 'row1'},
      {title: stepsChart.row2_title, key: 'row2'},
      {title: stepsChart.row3_title, key: 'row3'},
      {title: stepsChart.row4_title, key: 'row4'},
      {title: stepsChart.row5_title, key: 'row5'},
      {title: stepsChart.row6_title, key: 'row6'},
      {title: stepsChart.row7_title, key: 'row7'},
      {title: stepsChart.row8_title, key: 'row8'},
      {title: stepsChart.row9_title, key: 'row9'},
    ];

    const steps = [1, 2, 3, 4, 5, 6];

    return (
      <View style={styles.stepsContainer}>
        <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
          {t('stepsChart') || 'Steps Chart'}
        </Text>
        
        {steps.map(stepNum => {
          const dateProposed = formatDate(
            stepsChart[`step${stepNum}_date_proposed` as keyof StepsChartItem] as string | null,
          );
          
          return (
            <View 
              key={stepNum} 
              style={[
                styles.stepBlock, 
                {backgroundColor: C.surface, borderColor: C.border, shadowColor: '#000'}
              ]}>
              <View style={[styles.stepHeader, {borderBottomColor: C.border, backgroundColor: C.inputBg}]}>
                <Text style={[styles.stepTitle, {color: C.textPrimary}]}>
                  {t('step') || 'Step'} {stepNum}
                </Text>
                {dateProposed && dateProposed !== '-' && (
                  <Text style={[styles.stepDate, {color: C.textSecondary}]}>
                    {t('dateProposed') || 'Date Proposed'}: {dateProposed}
                  </Text>
                )}
              </View>
              
              <View style={styles.stepContent}>
                {rows.map((row, rowIndex) => {
                  const valueKey = `step${stepNum}_${row.key}_value` as keyof StepsChartItem;
                  const completedKey = `step${stepNum}_${row.key}_completed` as keyof StepsChartItem;
                  const value = stepsChart[valueKey] as string | null;
                  const completed = stepsChart[completedKey] as boolean | null;
                  
                  return (
                    <View 
                      key={row.key}
                      style={[
                        styles.stepRow,
                        {borderBottomColor: C.border},
                        rowIndex === rows.length - 1 && {borderBottomWidth: 0}
                      ]}>
                      <Text style={[styles.stepRowTitle, {color: C.textSecondary}]}>
                        {row.title}:
                      </Text>
                      <View style={[
                        styles.stepRowValue,
                        completed && {backgroundColor: C.bgSelectedOption}
                      ]}>
                        <Text style={[
                          styles.stepRowValueText,
                          {color: completed ? C.textPrimary : C.textSecondary}
                        ]}>
                          {value || '-'}
                        </Text>
                        {completed && (
                          <Text style={[styles.completedBadge, {color: C.textPrimary}]}>
                            ✓
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <ScreenContainer
      title={t('churchPlantingProjectionDetail') || 'Church Planting Projection Detail'}
      loading={loading}
      // A failed refetch (after editing) keeps the projection already on screen.
      error={projection ? null : loadError}
      onRetry={loadProjection}
      scroll>
      {churchName ? (
        <Text style={[styles.churchNameText, {color: C.textPrimary}]}>
          {t('churchPlantingProjectionDetail') || 'Church Planting Projection Detail'} {t('for') || 'for'} {churchName}
        </Text>
      ) : null}

      {!projection ? (
        <ListEmptyState />
      ) : (
        <View style={styles.content}>
          {/* Projection Details */}
          <View>
            <DetailCard title={t('projectionDetails') || 'Projection Details'}>
              <DetailRow
                label={t('proposedChurchName') || 'Proposed Church Name'}
                value={projection.proposed_church_name}
              />
              <DetailRow label={t('town') || 'Town'} value={projection.town} />
              <DetailRow
                label={t('proposedLeaderName') || 'Proposed Leader Name'}
                value={projection.proposed_leader_name}
              />
              <DetailRow
                label={t('population') || 'Population'}
                value={projection.population ? projection.population.toLocaleString() : '-'}
              />
              <DetailRow
                label={t('startDatePreparation') || 'Start Date Preparation'}
                value={formatDate(projection.start_date_preparation)}
              />
              <DetailRow
                label={t('startDatePioneering') || 'Start Date Pioneering'}
                value={formatDate(projection.start_date_pioneering)}
              />
              <DetailRow
                label={t('distanceToTown') || 'Distance to Town'}
                value={`${projection.distance_to_town} ${projection.distance_to_town_unit}`}
              />
              <DetailRow
                label={t('stepsCompleted') || 'Steps Completed'}
                value={`${projection.steps_completed.filter(Boolean).length} / ${projection.steps_completed.length}`}
              />
            </DetailCard>
            <DetailActions
              itemName={projection.proposed_church_name}
              onEdit={() =>
                navigation.navigate('EditChurchPlantingProjection', {
                  projectionId: projection.id,
                })
              }
              onDelete={() =>
                navigation.navigate('DeleteChurchPlantingProjection', {
                  projectionId: projection.id,
                })
              }
            />
          </View>

          {/* Steps Chart */}
          {renderStepsTable()}

          {/* Edit Steps Button */}
          <View style={styles.buttonContainer}>
            <SaveButton
              label={t('editSteps') || 'Edit Steps'}
              onPress={() => {
                navigation.navigate('EditStepsChart', {projectionId: projection.id});
              }}
              style={styles.editButton}
            />
          </View>
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  churchNameText: {
    marginBottom: ms(12),
    fontSize: fs(14),
    fontWeight: '500',
  },
  content: {
    gap: ms(16),
  },
  sectionTitle: {
    fontSize: fs(15),
    fontWeight: '700',
    marginBottom: ms(16),
  },
  stepsContainer: {
    marginTop: ms(8),
    gap: ms(16),
  },
  stepBlock: {
    borderRadius: rs(12),
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: rs(8),
    elevation: 3,
  },
  stepHeader: {
    padding: ms(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepTitle: {
    fontSize: fs(16),
    fontWeight: '700',
    marginBottom: ms(4),
  },
  stepDate: {
    fontSize: fs(11),
    marginTop: ms(2),
  },
  stepContent: {
    padding: ms(12),
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: ms(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepRowTitle: {
    fontSize: fs(12),
    fontWeight: '500',
    flex: 1,
  },
  stepRowValue: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
    borderRadius: rs(4),
    minHeight: hs(24),
  },
  stepRowValueText: {
    fontSize: fs(12),
    fontWeight: '500',
    marginRight: ms(4),
  },
  completedBadge: {
    fontSize: fs(14),
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: ms(20),
    marginBottom: ms(24),
    alignItems: 'flex-end',
  },
  editButton: {
    flex: 0,
    alignSelf: 'flex-end',
    minWidth: ws(120),
  },
});

export default ChurchPlantingProjectionDetailScreen;

