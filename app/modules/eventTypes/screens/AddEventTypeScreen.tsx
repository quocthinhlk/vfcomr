import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {createEventType, listEventTypes} from '../services/eventType.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useSubmitOnce} from '../../../shared/hooks/useSubmitOnce';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {ScreenContainer} from '../../../shared/components/crud';
import EventTypeForm from '../components/EventTypeForm';
import {
  DEFAULT_CELL_COLOUR,
  DEFAULT_TEXT_COLOUR,
  EventTypeFormErrors,
  EventTypeFormValues,
  buildEventTypePayload,
  validateEventTypeForm,
} from '../utils/eventType.utils';

export const AddEventTypeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  // The web's default colours, so a new type is not saved without colours.
  const [values, setValues] = useState<EventTypeFormValues>({
    name: '',
    color: DEFAULT_TEXT_COLOUR,
    cellColor: DEFAULT_CELL_COLOUR,
    meetingType: null,
  });
  const [errors, setErrors] = useState<EventTypeFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  // One save at a time: a fast double tap created the type twice.
  const submitOnce = useSubmitOnce();
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const onChange = useCallback(
    <K extends keyof EventTypeFormValues>(key: K, value: EventTypeFormValues[K]) => {
      setValues(prev => ({...prev, [key]: value}));
      setErrors(prev => (prev[key] ? {...prev, [key]: undefined} : prev));
    },
    [],
  );

  const onSave = submitOnce(async () => {
    const local = validateEventTypeForm(values);
    setErrors(local);
    if (Object.keys(local).length) {
      return;
    }
    try {
      setSubmitting(true);
      // The API saves a second type with the same name.
      const existing = (await listEventTypes())?.data ?? [];
      const withDuplicates = validateEventTypeForm(values, existing);
      if (withDuplicates.name) {
        setErrors(withDuplicates);
        return;
      }
      await createEventType(buildEventTypePayload(values));
      markDataChanged('eventTypes');
      Alert.alert(
        t('success') || 'Success',
        `${t('add') || 'Add'} ${t('eventType') || 'Event Type'} ${t('success') || 'success'}`,
      );
      // React Navigation 7's navigate pushes a second list on top, so Back
      // reopened the filled form.
      const params = {reload: true};
      const routes: {name: string}[] = navigation.getState?.()?.routes ?? [];
      if (routes.some(r => r.name === 'EventTypes') && navigation.popTo) {
        navigation.popTo('EventTypes', params);
      } else if (navigation.replace) {
        navigation.replace('EventTypes', params);
      } else {
        navigation.navigate('EventTypes', params);
      }
    } catch (e) {
      Alert.alert(t('error') || 'Error', getApiErrorMessage(e, t));
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  });

  return (
    <ScreenContainer
      title={`${t('addNew') || 'Add New'} ${t('eventType') || 'Event Type'}`}
      scroll>
      <EventTypeForm
        values={values}
        errors={errors}
        onChange={onChange}
        submitting={submitting}
        onSave={onSave}
        onCancel={() => navigation.goBack()}
      />
    </ScreenContainer>
  );
};

export default AddEventTypeScreen;
