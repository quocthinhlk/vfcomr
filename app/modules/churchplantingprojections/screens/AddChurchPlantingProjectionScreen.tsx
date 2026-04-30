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
import {useNavigation} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {formStyles} from '../../../shared/styles/form';
import {createChurchPlantingProjection} from '../services/churchPlantingProjection.service';
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

export const AddChurchPlantingProjectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
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
  const [churchId, setChurchId] = useState<number | null>(null);
  const [churchName, setChurchName] = useState<string>('');
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
    (async () => {
      try {
        const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
        if (!savedChurchId) {
          Alert.alert(t('error') || 'Error', t('churchIdNotFound') || 'Church ID not found');
          navigation.goBack();
          return;
        }
        const id = parseInt(savedChurchId, 10);
        if (isNaN(id)) {
          Alert.alert(t('error') || 'Error', t('invalidChurchId') || 'Invalid Church ID');
          navigation.goBack();
          return;
        }
        setChurchId(id);
        // Fetch church name
        const res = await api.get(`churches/${id}`);
        const churchData = res?.data?.data;
        if (churchData?.name && mounted) {
          setChurchName(churchData.name);
        }
        // Load countries
        await loadCountries(1);
      } catch (e) {
        console.error('Error fetching church info:', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigation, t]);

  const formatDateForAPI = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const onSave = async () => {
    if (!churchId) {
      Alert.alert(t('error') || 'Error', t('churchIdNotFound') || 'Church ID not found');
      return;
    }

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
      await createChurchPlantingProjection({
        church_id: churchId,
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
      });
      Alert.alert(
        t('success') || 'Success',
        `${t('add') || 'Add'} ${t('churchPlantingProjection') || 'Church Planting Projection'} ${t('success') || 'success'}`,
      );
      navigation.navigate('ChurchPlantingProjections', {reload: true});
    } catch (e: any) {
      Alert.alert(
        t('error') || 'Error',
        e?.message || t('failedToCreateProjection') || 'Failed to create Church Planting Projection',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={{flex: 1, backgroundColor: C.background}}>
        <View style={styles.container}>
          <Header
            title={`${t('create') || 'Create'} ${t('churchPlantingProjection') || 'Church Planting Projection'}`}
            showMenu={false}
          />
          
          {churchName ? (
            <View style={styles.churchNameContainer}>
              <Text style={[styles.churchNameText, {color: C.textPrimary}]}>
                {t('create') || 'Create'} {t('churchPlantingProjection') || 'Church Planting Projection'} {t('for') || 'for'} {churchName}
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
              showsVerticalScrollIndicator={false}
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
});

export default AddChurchPlantingProjectionScreen;

