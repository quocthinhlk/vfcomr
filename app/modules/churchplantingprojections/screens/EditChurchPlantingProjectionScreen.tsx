import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {formStyles} from '../../../shared/styles/form';
import {
  updateChurchPlantingProjection,
  getChurchPlantingProjectionById,
} from '../services/churchPlantingProjection.service';
import {
  SaveButton,
  CancelButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs, hs, ws} from '../../../shared/utils/scale';
import AppInput from '../../../shared/components/AppInput';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import DateTripleDropdown from '../../../shared/components/DateTripleDropdown';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../config/api';

export const EditChurchPlantingProjectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const projectionId: number | undefined = route.params?.projectionId;
  const [town, setTown] = useState('');
  const [countryId, setCountryId] = useState<number | null>(null);
  const [proposedChurchName, setProposedChurchName] = useState('');
  const [proposedLeaderName, setProposedLeaderName] = useState('');
  const [population, setPopulation] = useState<string>('');
  const [startDatePreparation, setStartDatePreparation] = useState<Date | null>(null);
  const [startDatePioneering, setStartDatePioneering] = useState<Date | null>(null);
  const [distanceToTown, setDistanceToTown] = useState('');
  const [distanceToTownUnit, setDistanceToTownUnit] = useState<string>('km');
  const [submitting, setSubmitting] = useState(false);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [churchId, setChurchId] = useState<number | null>(null);
  const [churchName, setChurchName] = useState<string>('');
  const [userId, setUserId] = useState<number | null>(null);
  const [countryOptions, setCountryOptions] = useState<Array<{label: string; value: number}>>(
    [],
  );
  const [countryPage, setCountryPage] = useState(1);
  const [countryHasNext, setCountryHasNext] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const {t} = useTranslation();
  const C = useThemedColors();

  const clearInvalid = (key: string) =>
    setInvalid(prev => ({...prev, [key]: false}));

  const distanceUnitOptions = [
    {label: 'km', value: 'km'},
    {label: 'miles', value: 'miles'},
  ];

  const loadCountries = async (page: number = 1, name: string = '') => {
    try {
      const res = await api.get('countries', {
        params: {page, limit: 20, name, sort_by: 'name', sort_desc: false},
      });
      const data = res?.data?.data;
      if (page === 1) {
        setCountryOptions(
          (data?.items || []).map((item: any) => ({
            label: item.name,
            value: item.id,
          })),
        );
      } else {
        setCountryOptions(prev => [
          ...prev,
          ...(data?.items || []).map((item: any) => ({
            label: item.name,
            value: item.id,
          })),
        ]);
      }
      setCountryHasNext(data?.has_next || false);
      setCountryPage(page);
    } catch (e) {
      console.error('Error loading countries:', e);
    }
  };

  useEffect(() => {
    let mounted = true;
    if (projectionId) {
      getChurchPlantingProjectionById(projectionId)
        .then(res => {
          if (!mounted) {
            return;
          }
          const projection = res?.data;
          if (projection) {
            setTown(projection.town || '');
            setCountryId(projection.country_id);
            setProposedChurchName(projection.proposed_church_name || '');
            setProposedLeaderName(projection.proposed_leader_name || '');
            setPopulation(projection.population ? String(projection.population) : '');
            setStartDatePreparation(
              projection.start_date_preparation
                ? new Date(projection.start_date_preparation)
                : null,
            );
            setStartDatePioneering(
              projection.start_date_pioneering
                ? new Date(projection.start_date_pioneering)
                : null,
            );
            setDistanceToTown(projection.distance_to_town || '');
            setDistanceToTownUnit(projection.distance_to_town_unit || 'km');
            setChurchId(projection.church_id);
            setUserId(projection.user_id);
            // Fetch church name
            if (projection.church_id) {
              api
                .get(`churches/${projection.church_id}`)
                .then(churchRes => {
                  const churchData = churchRes?.data?.data;
                  if (churchData?.name && mounted) {
                    setChurchName(churchData.name);
                  }
                })
                .catch(() => {});
            }
            // Load countries and set selected
            loadCountries(1).then(() => {
              // Ensure selected country is in options
              if (projection.country_id && mounted) {
                const found = countryOptions.find(opt => opt.value === projection.country_id);
                if (!found) {
                  // Try to fetch the specific country
                  api
                    .get(`countries/${projection.country_id}`)
                    .then(countryRes => {
                      const countryData = countryRes?.data?.data;
                      if (countryData && mounted) {
                        setCountryOptions(prev => [
                          {label: countryData.name, value: countryData.id},
                          ...prev,
                        ]);
                      }
                    })
                    .catch(() => {});
                }
              }
            });
          }
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
  }, [projectionId]);

  const formatDateForAPI = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const onSave = async () => {
    if (!projectionId) return;

    const newInvalid: Record<string, boolean> = {};
    newInvalid.town = !town.trim();
    newInvalid.countryId = !countryId;
    newInvalid.proposedChurchName = !proposedChurchName.trim();
    newInvalid.proposedLeaderName = !proposedLeaderName.trim();
    newInvalid.startDatePreparation = !startDatePreparation;
    newInvalid.startDatePioneering = !startDatePioneering;
    newInvalid.distanceToTown = !distanceToTown.trim();

    setInvalid(newInvalid);

    if (newInvalid.town || newInvalid.countryId || newInvalid.proposedChurchName || 
        newInvalid.proposedLeaderName || newInvalid.startDatePreparation || 
        newInvalid.startDatePioneering || newInvalid.distanceToTown) {
      return;
    }

    try {
      setSubmitting(true);
      const prepDate = formatDateForAPI(startDatePreparation);
      const pioneerDate = formatDateForAPI(startDatePioneering);
      await updateChurchPlantingProjection(projectionId, {
        church_id: churchId!,
        town: town.trim(),
        country_id: countryId as number,
        proposed_church_name: proposedChurchName.trim(),
        proposed_leader_name: proposedLeaderName.trim(),
        population: population ? parseInt(population, 10) : null,
        start_date_preparation: prepDate,
        start_date_preparation_original: prepDate,
        start_date_pioneering: pioneerDate,
        start_date_pioneering_original: pioneerDate,
        distance_to_town: distanceToTown.trim(),
        distance_to_town_unit: distanceToTownUnit,
        user_id: userId || undefined,
      });
      Alert.alert(
        t('success') || 'Success',
        `${t('edit') || 'Edit'} ${t('churchPlantingProjection') || 'Church Planting Projection'} ${t('success') || 'success'}`,
      );
      returnAfterEdit(navigation);
    } catch (e: any) {
      Alert.alert(
        t('error') || 'Error',
        e?.message || t('failedToUpdateProjection') || 'Failed to update Church Planting Projection',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
        edges={['top', 'bottom', 'left', 'right']}>
        <View style={{flex: 1, backgroundColor: C.background}}>
          <View style={styles.container}>
            <Header
              title={`${t('update') || 'Update'} ${t('churchPlantingProjection') || 'Church Planting Projection'}`}
              showMenu={false}
            />
            <Text style={[styles.loading, {color: C.textPrimary}]}>
              {t('loading') || 'Loading'}...
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={{flex: 1, backgroundColor: C.background}}>
        <View style={styles.container}>
          <Header
            title={`${t('update') || 'Update'} ${t('churchPlantingProjection') || 'Church Planting Projection'}`}
            showMenu={false}
          />
          
          {churchName ? (
            <View style={styles.churchNameContainer}>
              <Text style={[styles.churchNameText, {color: C.textPrimary}]}>
                {t('update') || 'Update'} {t('churchPlantingProjection') || 'Church Planting Projection'} {t('for') || 'for'} {churchName}
              </Text>
            </View>
          ) : null}
          
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={
              Platform.OS === 'ios'
                ? hs(64)
                : (StatusBar.currentHeight || 0) + hs(50)
            }
            style={{flex: 1}}>
            <ScrollView

              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled">
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text
                    style={[
                      formStyles.label,
                      {color: C.textSecondary, marginBottom: ms(4)},
                    ]}>
                    {t('town') || 'Town'}{' '}
                    <Text style={{color: '#c00000'}}>*</Text>
                  </Text>
                  <AppInput
                    value={town}
                    onChangeText={(text) => {
                      setTown(text);
                      clearInvalid('town');
                    }}
                    placeholder={t('town') || 'Town'}
                    error={!!invalid.town}
                  />
                </View>

                <View style={styles.field}>
                  <Text
                    style={[
                      formStyles.label,
                      {color: C.textSecondary, marginBottom: ms(4)},
                    ]}>
                    {t('country') || 'Country'}{' '}
                    <Text style={{color: '#c00000'}}>*</Text>
                  </Text>
                  <ElementDropdown
                    data={countryOptions.map(opt => ({label: opt.label, value: opt.value}))}
                    value={countryId as any}
                    onChange={v => {
                      setCountryId(v as number);
                      clearInvalid('countryId');
                    }}
                    placeholder={t('selectCountry') || 'Select Country'}
                    error={!!invalid.countryId}
                    containerStyle={
                      {
                        backgroundColor: C.inputBg,
                        borderColor: invalid.countryId ? '#db2d2d' : C.inputBorder,
                      } as any
                    }
                    onFocus={async () => {
                      if (countryOptions.length === 0) {
                        await loadCountries(1);
                      }
                    }}
                    onSearchText={async text => {
                      setCountryQuery(text);
                      await loadCountries(1, text);
                    }}
                    onEndReached={async () => {
                      if (countryHasNext) {
                        await loadCountries(countryPage + 1, countryQuery);
                      }
                    }}
                  />
                </View>

                <View style={styles.field}>
                  <Text
                    style={[
                      formStyles.label,
                      {color: C.textSecondary, marginBottom: ms(4)},
                    ]}>
                    {t('proposedChurchName') || 'Proposed Church Name'}{' '}
                    <Text style={{color: '#c00000'}}>*</Text>
                  </Text>
                  <AppInput
                    value={proposedChurchName}
                    onChangeText={(text) => {
                      setProposedChurchName(text);
                      clearInvalid('proposedChurchName');
                    }}
                    placeholder={t('proposedChurchName') || 'Proposed Church Name'}
                    error={!!invalid.proposedChurchName}
                  />
                </View>

                <View style={styles.field}>
                  <Text
                    style={[
                      formStyles.label,
                      {color: C.textSecondary, marginBottom: ms(4)},
                    ]}>
                    {t('proposedLeaderName') || 'Proposed Leader Name'}{' '}
                    <Text style={{color: '#c00000'}}>*</Text>
                  </Text>
                  <AppInput
                    value={proposedLeaderName}
                    onChangeText={(text) => {
                      setProposedLeaderName(text);
                      clearInvalid('proposedLeaderName');
                    }}
                    placeholder={t('proposedLeaderName') || 'Proposed Leader Name'}
                    error={!!invalid.proposedLeaderName}
                  />
                </View>

                <View style={styles.field}>
                  <Text
                    style={[
                      formStyles.label,
                      {color: C.textSecondary, marginBottom: ms(4)},
                    ]}>
                    {t('population') || 'Population'}
                  </Text>
                  <AppInput
                    value={population}
                    onChangeText={setPopulation}
                    placeholder={t('population') || 'Population'}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.field}>
                  <Text
                    style={[
                      formStyles.label,
                      {color: C.textSecondary, marginBottom: ms(4)},
                    ]}>
                    {t('startDatePreparation') || 'Start Date Preparation'}{' '}
                    <Text style={{color: '#c00000'}}>*</Text>
                  </Text>
                  <DateTripleDropdown
                    value={startDatePreparation}
                    onChange={(date) => {
                      setStartDatePreparation(date);
                      clearInvalid('startDatePreparation');
                    }}
                    yearRange={50}
                    startYear={new Date().getFullYear()}
                    error={!!invalid.startDatePreparation}
                  />
                </View>

                <View style={styles.field}>
                  <Text
                    style={[
                      formStyles.label,
                      {color: C.textSecondary, marginBottom: ms(4)},
                    ]}>
                    {t('startDatePioneering') || 'Start Date Pioneering'}{' '}
                    <Text style={{color: '#c00000'}}>*</Text>
                  </Text>
                  <DateTripleDropdown
                    value={startDatePioneering}
                    onChange={(date) => {
                      setStartDatePioneering(date);
                      clearInvalid('startDatePioneering');
                    }}
                    yearRange={50}
                    startYear={new Date().getFullYear()}
                    error={!!invalid.startDatePioneering}
                  />
                </View>

                <View style={styles.field}>
                  <Text
                    style={[
                      formStyles.label,
                      {color: C.textSecondary, marginBottom: ms(4)},
                    ]}>
                    {t('distanceToTown') || 'Distance to Town'}{' '}
                    <Text style={{color: '#c00000'}}>*</Text>
                  </Text>
                  <View style={{flexDirection: 'row', gap: ms(8)}}>
                    <View style={{flex: 2}}>
                      <AppInput
                        value={distanceToTown}
                        onChangeText={(text) => {
                          setDistanceToTown(text);
                          clearInvalid('distanceToTown');
                        }}
                        placeholder={t('distance') || 'Distance'}
                        keyboardType="numeric"
                        error={!!invalid.distanceToTown}
                      />
                    </View>
                    <View style={{flex: 1}}>
                      <ElementDropdown
                        data={distanceUnitOptions}
                        value={distanceToTownUnit as any}
                        onChange={v => setDistanceToTownUnit(v as string)}
                        placeholder={t('unit') || 'Unit'}
                        containerStyle={
                          {
                            backgroundColor: C.inputBg,
                            borderColor: C.inputBorder,
                          } as any
                        }
                      />
                    </View>
                  </View>
                </View>

                <View style={formStyles.buttonRow}>
                  <CancelButton
                    label={t('cancel') || 'Cancel'}
                    onPress={() => navigation.goBack()}
                    disabled={submitting}
                  />
                  <SaveButton
                    label={t('save') || 'Save'}
                    onPress={onSave}
                    disabled={submitting}
                  />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
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
  churchNameContainer: {
    marginTop: ms(8),
    marginBottom: ms(12),
  },
  churchNameText: {
    fontSize: fs(14),
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: ms(24),
  },
  form: {
    marginTop: ms(8),
    gap: ms(16),
  },
  field: {
    marginBottom: ms(8),
  },
  loading: {
    textAlign: 'center',
    marginTop: ms(40),
    fontSize: fs(14),
  },
});

export default EditChurchPlantingProjectionScreen;

