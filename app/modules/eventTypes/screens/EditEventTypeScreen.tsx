import React, {useState, useEffect} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {updateEventType, getEventTypeById, EventMeetingType, resolveEventMeetingType} from '../services/eventType.service';
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

export const EditEventTypeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const eventTypeId: number | undefined = route.params?.eventTypeId;
  const [name, setName] = useState('');
  const [color, setColor] = useState('#808080');
  const [cellColor, setCellColor] = useState('#D9D9D9');
  const [meetingType, setMeetingType] = useState<EventMeetingType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const {t} = useTranslation();
  const C = useThemedColors();

  const clearInvalid = (key: string) =>
    setInvalid(prev => ({...prev, [key]: false}));

  const meetingTypeOptions = [
    {label: t('eventAttendance') || 'Attendance', value: 'attendance' as const},
    {label: t('eventMeetingWith') || 'Meeting With', value: 'meeting_with' as const},
  ];

  useEffect(() => {
    let mounted = true;
    if (eventTypeId) {
      getEventTypeById(eventTypeId)
        .then(res => {
          if (!mounted) {
            return;
          }
          const eventType = res?.data;
          if (eventType) {
            setName(eventType.name || '');
            setColor(eventType.color || '#808080');
            setCellColor(eventType.cell_color || '#D9D9D9');
            setMeetingType(resolveEventMeetingType(eventType.meeting_type));
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
  }, [eventTypeId]);

  const onSave = async () => {
    if (!eventTypeId) return;
    
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
      await updateEventType(eventTypeId, {
        name: name.trim(),
        color: color.trim(),
        cell_color: cellColor.trim(),
        meeting_type: meetingType as EventMeetingType,
      });
      Alert.alert(t('success') || 'Success', `${t('edit') || 'Edit'} ${t('eventType') || 'Event Type'} ${t('success') || 'success'}`);
      returnAfterEdit(navigation);
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', e?.message || 'Failed to update Event Type');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      title={`${t('edit') || 'Edit'} ${t('eventType') || 'Event Type'}`}
      scroll
      loading={loading}>
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

export default EditEventTypeScreen;
