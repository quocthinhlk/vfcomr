import React, {useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {createEventType, EventMeetingType} from '../services/eventType.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import AppInput from '../../../shared/components/AppInput';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import ColorPicker from '../../../shared/components/ColorPicker';
import {FORM_INPUT_HEIGHT} from '../../../shared/styles/form';
import {
  FormActions,
  FormField,
  ScreenContainer,
} from '../../../shared/components/crud';

export const AddEventTypeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [cellColor, setCellColor] = useState('');
  const [meetingType, setMeetingType] = useState<EventMeetingType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const {t} = useTranslation();
  const C = useThemedColors();

  const clearInvalid = (key: string) =>
    setInvalid(prev => ({...prev, [key]: false}));

  const meetingTypeOptions = [
    {label: t('eventAttendance') || 'Attendance', value: 'attendance' as const},
    {label: t('eventMeetingWith') || 'Meeting With', value: 'meeting_with' as const},
  ];

  const onSave = async () => {
    const newInvalid: Record<string, boolean> = {};
    newInvalid.name = !name.trim();
    newInvalid.color = !color.trim();
    newInvalid.cellColor = !cellColor.trim();
    newInvalid.meetingType = !meetingType;

    setInvalid(newInvalid);

    if (newInvalid.name || newInvalid.color || newInvalid.cellColor || newInvalid.meetingType) {
      return;
    }

    try {
      setSubmitting(true);
      await createEventType({
        name: name.trim(),
        color: color.trim(),
        cell_color: cellColor.trim(),
        meeting_type: meetingType as EventMeetingType,
      });
      Alert.alert(t('success') || 'Success', `${t('add') || 'Add'} ${t('eventType') || 'Event Type'} ${t('success') || 'success'}`);
      navigation.navigate('EventTypes', {reload: true});
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', e?.message || 'Failed to create Event Type');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      title={`${t('addNew') || 'Add New'} ${t('eventType') || 'Event Type'}`}
      scroll>
      <FormField
        label={t('eventTypeName') || 'Event Type Name'}
        required
        error={invalid.name ? t('required') : undefined}>
        <AppInput
          value={name}
          onChangeText={(text) => {
            setName(text);
            clearInvalid('name');
          }}
          placeholder={t('eventTypeName') || 'Event Type Name'}
          error={!!invalid.name}
          editable={!submitting}
        />
      </FormField>
      <FormField
        label={t('textColour') || 'Text Colour'}
        required
        error={invalid.color ? t('required') : undefined}>
        <ColorPicker
          value={color}
          onChange={(val) => {
            setColor(val);
            clearInvalid('color');
          }}
          height={FORM_INPUT_HEIGHT}
          error={!!invalid.color}
        />
      </FormField>
      <FormField
        label={t('reportCellColour') || 'Report Cell Colour'}
        required
        error={invalid.cellColor ? t('required') : undefined}>
        <ColorPicker
          value={cellColor}
          onChange={(val) => {
            setCellColor(val);
            clearInvalid('cellColor');
          }}
          height={FORM_INPUT_HEIGHT}
          error={!!invalid.cellColor}
        />
      </FormField>
      <FormField
        label={t('meetingType') || 'Meeting Type'}
        required
        error={invalid.meetingType ? t('required') : undefined}>
        <ElementDropdown
          data={meetingTypeOptions}
          value={meetingType as any}
          onChange={v => {
            setMeetingType(v as EventMeetingType);
            clearInvalid('meetingType');
          }}
          placeholder={t('selectOption') || 'Select Meeting Type'}
          error={!!invalid.meetingType}
          containerStyle={
            {
              backgroundColor: C.inputBg,
              borderColor: invalid.meetingType ? '#db2d2d' : C.inputBorder,
            } as any
          }
        />
      </FormField>
      <FormActions
        onCancel={() => navigation.goBack()}
        onSave={onSave}
        submitting={submitting}
      />
    </ScreenContainer>
  );
};

export default AddEventTypeScreen;
