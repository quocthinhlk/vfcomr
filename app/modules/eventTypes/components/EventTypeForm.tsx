import React from 'react';
import AppInput from '../../../shared/components/AppInput';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import ColorPicker from '../../../shared/components/ColorPicker';
import {FORM_INPUT_HEIGHT} from '../../../shared/styles/form';
import {FormActions, FormField} from '../../../shared/components/crud';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import type {EventMeetingType} from '../services/eventType.service';
import {
  COLOUR_SWATCHES,
  EVENT_TYPE_NAME_MAX,
  EventTypeFormError,
  EventTypeFormErrors,
  EventTypeFormValues,
} from '../utils/eventType.utils';

type Props = {
  values: EventTypeFormValues;
  errors: EventTypeFormErrors;
  onChange: <K extends keyof EventTypeFormValues>(key: K, value: EventTypeFormValues[K]) => void;
  submitting: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export const EventTypeForm: React.FC<Props> = ({
  values,
  errors,
  onChange,
  submitting,
  onSave,
  onCancel,
}) => {
  const {t} = useTranslation();
  const message = (error?: EventTypeFormError) => {
    switch (error) {
      case 'required':
        return t('required');
      case 'tooLong':
        return t('countryNameTooLong').replace('{max}', String(EVENT_TYPE_NAME_MAX));
      case 'invalidColor':
        return t('eventTypeInvalidColour');
      case 'duplicate':
        return t('eventTypeNameExists');
      default:
        return undefined;
    }
  };
  const meetingTypeOptions = [
    {label: t('eventAttendance') || 'Attendance', value: 'attendance'},
    {label: t('eventMeetingWith') || 'Meeting With', value: 'meeting_with'},
  ];

  return (
    <>
      <FormField
        label={t('eventTypeName') || 'Event Type Name'}
        required
        error={message(errors.name)}>
        <AppInput
          value={values.name}
          onChangeText={text => onChange('name', text)}
          placeholder={t('eventTypeName') || 'Event Type Name'}
          error={!!errors.name}
          editable={!submitting}
          maxLength={EVENT_TYPE_NAME_MAX}
          autoCapitalize="sentences"
          accessibilityLabel={`${t('eventTypeName') || 'Event Type Name'}, ${t('required')}`}
        />
      </FormField>
      <FormField
        label={t('textColour') || 'Text Colour'}
        required
        error={message(errors.color)}>
        <ColorPicker
          value={values.color}
          onChange={val => onChange('color', val)}
          height={FORM_INPUT_HEIGHT}
          error={!!errors.color}
          swatches={COLOUR_SWATCHES}
          accessibilityLabel={t('textColour') || 'Text Colour'}
        />
      </FormField>
      <FormField
        label={t('reportCellColour') || 'Report Cell Colour'}
        required
        error={message(errors.cellColor)}>
        <ColorPicker
          value={values.cellColor}
          onChange={val => onChange('cellColor', val)}
          height={FORM_INPUT_HEIGHT}
          error={!!errors.cellColor}
          swatches={COLOUR_SWATCHES}
          accessibilityLabel={t('reportCellColour') || 'Report Cell Colour'}
        />
      </FormField>
      <FormField
        label={t('meetingType') || 'Meeting Type'}
        required
        error={message(errors.meetingType)}>
        <ElementDropdown
          data={meetingTypeOptions}
          value={values.meetingType}
          onChange={v => onChange('meetingType', (v as EventMeetingType) || null)}
          placeholder={t('meetingType') || 'Meeting Type'}
          error={!!errors.meetingType}
          search={false}
        />
      </FormField>
      <FormActions onCancel={onCancel} onSave={onSave} submitting={submitting} />
    </>
  );
};

export default EventTypeForm;
