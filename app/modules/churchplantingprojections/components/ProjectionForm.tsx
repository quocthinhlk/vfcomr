import React, {useRef, useState} from 'react';
import {KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View} from 'react-native';
import {Text} from '@ui-kitten/components';
import {FormActions, FormField} from '../../../shared/components/crud';
import AppInput from '../../../shared/components/AppInput';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import DateTripleDropdown from '../../../shared/components/DateTripleDropdown';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useKeepFocusedInputVisible} from '../../../shared/hooks/useKeepFocusedInputVisible';
import {fs, ms} from '../../../shared/utils/scale';
import {
  ProjectionFormField,
  ProjectionFormValues,
  sanitizeDistance,
  sanitizePopulation,
} from '../utils/projection.utils';
import type {CountryOption} from '../hooks/useCountryOptions';

const DISTANCE_UNITS = [
  {label: 'km', value: 'km'},
  {label: 'miles', value: 'miles'},
];

/** Same order as the form, to scroll to the first invalid field. */
const FIELD_ORDER: ProjectionFormField[] = [
  'town',
  'countryId',
  'proposedChurchName',
  'proposedLeaderName',
  'population',
  'startDatePreparation',
  'startDatePioneering',
  'distanceToTown',
];

type Props = {
  heading?: string;
  values: ProjectionFormValues;
  onChange: <K extends ProjectionFormField>(key: K, value: ProjectionFormValues[K]) => void;
  invalid: Partial<Record<ProjectionFormField, boolean>>;
  /** Start dates are required when creating only (as on the web). */
  datesRequired: boolean;
  countries: {
    data: CountryOption[];
    search: (text: string) => void;
    loadMore: () => void;
    select: (id: number | null) => void;
  };
  submitting: boolean;
  onCancel: () => void;
  onSave: () => void;
  /** Set by the screen after a failed validation: scroll to that field. */
  scrollToFieldRef?: React.MutableRefObject<((key: ProjectionFormField) => void) | null>;
};

export const ProjectionForm: React.FC<Props> = ({
  heading,
  values,
  onChange,
  invalid,
  datesRequired,
  countries,
  submitting,
  onCancel,
  onSave,
  scrollToFieldRef,
}) => {
  const {t} = useTranslation();
  const C = useThemedColors();
  const scrollRef = useRef<ScrollView>(null);
  // Android 15+ (edge-to-edge): keep the focused field above the keyboard.
  useKeepFocusedInputVisible(scrollRef);
  const [fieldY, setFieldY] = useState<Partial<Record<ProjectionFormField, number>>>({});
  const onFieldLayout = (key: ProjectionFormField) => (e: any) => {
    const y = e?.nativeEvent?.layout?.y ?? 0;
    setFieldY(prev => (prev[key] === y ? prev : {...prev, [key]: y}));
  };
  if (scrollToFieldRef) {
    scrollToFieldRef.current = (key: ProjectionFormField) => {
      const y = fieldY[key];
      if (y != null) {
        scrollRef.current?.scrollTo({y: Math.max(0, y - ms(20)), animated: true});
      }
    };
  }

  const requiredText = t('required');
  const err = (key: ProjectionFormField) => (invalid[key] ? requiredText : undefined);

  return (
    <KeyboardAvoidingView
      // Padding on Android too (edge-to-edge no longer resizes the window), with
      // offset 0 there: the old status bar + 50 offset left a blank band above
      // the keyboard and hid the field being typed in.
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      style={styles.flex}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        {heading ? (
          <Text style={[styles.heading, {color: C.textPrimary}]}>{heading}</Text>
        ) : null}

        <View onLayout={onFieldLayout('town')}>
          <FormField label={t('town') || 'Town'} required error={err('town')}>
            <AppInput
              value={values.town}
              onChangeText={text => onChange('town', text)}
              placeholder={t('town') || 'Town'}
              error={!!invalid.town}
              maxLength={255}
              returnKeyType="next"
            />
          </FormField>
        </View>

        <View onLayout={onFieldLayout('countryId')}>
          <FormField label={t('country') || 'Country'} required error={err('countryId')}>
            <ElementDropdown
              data={countries.data}
              value={values.countryId}
              onChange={v => {
                const id = v == null ? null : Number(v);
                countries.select(id);
                onChange('countryId', id);
              }}
              placeholder={t('selectCountry') || 'Select Country'}
              error={!!invalid.countryId}
              onSearchText={countries.search}
              onEndReached={countries.loadMore}
            />
          </FormField>
        </View>

        <View onLayout={onFieldLayout('proposedChurchName')}>
          <FormField
            label={t('proposedChurchName') || 'Proposed Church Name'}
            required
            error={err('proposedChurchName')}>
            <AppInput
              value={values.proposedChurchName}
              onChangeText={text => onChange('proposedChurchName', text)}
              placeholder={t('proposedChurchName') || 'Proposed Church Name'}
              error={!!invalid.proposedChurchName}
              maxLength={255}
            />
          </FormField>
        </View>

        <View onLayout={onFieldLayout('proposedLeaderName')}>
          <FormField
            label={t('proposedLeaderName') || 'Proposed Leader Name'}
            required
            error={err('proposedLeaderName')}>
            <AppInput
              value={values.proposedLeaderName}
              onChangeText={text => onChange('proposedLeaderName', text)}
              placeholder={t('proposedLeaderName') || 'Proposed Leader Name'}
              error={!!invalid.proposedLeaderName}
              maxLength={255}
            />
          </FormField>
        </View>

        <View onLayout={onFieldLayout('population')}>
          <FormField label={t('population') || 'Population'}>
            <AppInput
              value={values.population}
              onChangeText={text => onChange('population', sanitizePopulation(text))}
              placeholder={t('population') || 'Population'}
              // number-pad: no "," "." "-" keys on Android's numeric keyboard.
              keyboardType="number-pad"
            />
          </FormField>
        </View>

        <View onLayout={onFieldLayout('startDatePreparation')}>
          <FormField
            label={t('startDatePreparation') || 'Start Date Preparation'}
            required={datesRequired}
            error={err('startDatePreparation')}>
            <DateTripleDropdown
              value={values.startDatePreparation}
              onChange={date => onChange('startDatePreparation', date)}
              yearRange={50}
              startYear={new Date().getFullYear()}
              error={!!invalid.startDatePreparation}
            />
          </FormField>
        </View>

        <View onLayout={onFieldLayout('startDatePioneering')}>
          <FormField
            label={t('startDatePioneering') || 'Start Date Pioneering'}
            required={datesRequired}
            error={err('startDatePioneering')}>
            <DateTripleDropdown
              value={values.startDatePioneering}
              onChange={date => onChange('startDatePioneering', date)}
              yearRange={50}
              startYear={new Date().getFullYear()}
              error={!!invalid.startDatePioneering}
            />
          </FormField>
        </View>

        <View onLayout={onFieldLayout('distanceToTown')}>
          <FormField label={t('distanceToTown') || 'Distance to Town'}>
            <View style={styles.row}>
              <View style={styles.distance}>
                <AppInput
                  value={values.distanceToTown}
                  onChangeText={text => onChange('distanceToTown', sanitizeDistance(text))}
                  placeholder={t('distance') || 'Distance'}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.unit}>
                <ElementDropdown
                  data={DISTANCE_UNITS}
                  value={values.distanceToTownUnit}
                  // The unit always has a value: ignore the clear (×) button.
                  onChange={v => v && onChange('distanceToTownUnit', String(v))}
                  placeholder={t('unit') || 'Unit'}
                  search={false}
                />
              </View>
            </View>
          </FormField>
        </View>

        <FormActions onCancel={onCancel} onSave={onSave} submitting={submitting} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export const firstInvalidField = (
  invalid: Partial<Record<ProjectionFormField, boolean>>,
): ProjectionFormField | undefined => FIELD_ORDER.find(key => invalid[key]);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  heading: {
    marginBottom: ms(12),
    fontSize: fs(14),
    fontWeight: '500',
  },
  scrollContent: {
    paddingTop: ms(8),
    paddingBottom: ms(24),
  },
  row: {
    flexDirection: 'row',
    gap: ms(8),
  },
  distance: {
    flex: 2,
  },
  unit: {
    flex: 1,
  },
});

export default ProjectionForm;
