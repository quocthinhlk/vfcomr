import React, {useState} from 'react';
import {View, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, StatusBar} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {formStyles} from '../../../shared/styles/form';
import {createEventType} from '../services/eventType.service';
import {
  SaveButton,
  CancelButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs, hs, ws} from '../../../shared/utils/scale';
import AppInput from '../../../shared/components/AppInput';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import ColorPicker from '../../../shared/components/ColorPicker';
import {FORM_INPUT_HEIGHT} from '../../../shared/styles/form';

export const AddEventTypeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [cellColor, setCellColor] = useState('');
  const [meetingType, setMeetingType] = useState<'Pastors List' | 'Attendance' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const {t} = useTranslation();
  const C = useThemedColors();

  const clearInvalid = (key: string) =>
    setInvalid(prev => ({...prev, [key]: false}));

  const meetingTypeOptions = [
    {label: 'Pastors List', value: 'Pastors List' as const},
    {label: 'Attendance', value: 'Attendance' as const},
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
        meeting_type: meetingType as 'Pastors List' | 'Attendance',
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
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={{flex: 1, backgroundColor: C.background}}>
        <View style={styles.container}>
          <Header
            title={`${t('addNew') || 'Add New'} ${t('eventType') || 'Event Type'}`}
            showMenu={false}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? hs(64) : ((StatusBar.currentHeight || 0) + hs(50))}
            style={{flex: 1}}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled">
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text
                    style={[formStyles.label, {color: C.textSecondary, marginBottom: ms(4)}]}>
                    {t('eventTypeName') || 'Event Type Name'} <Text style={{color: '#c00000'}}>*</Text>
                  </Text>
                  <AppInput
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      clearInvalid('name');
                    }}
                    placeholder={t('eventTypeName') || 'Event Type Name'}
                    error={!!invalid.name}
                  />
                </View>

                <View style={styles.field}>
                  <Text
                    style={[formStyles.label, {color: C.textSecondary, marginBottom: ms(4)}]}>
                    {t('textColour') || 'Text Colour'} <Text style={{color: '#c00000'}}>*</Text>
                  </Text>
                  <ColorPicker
                    value={color}
                    onChange={(val) => {
                      setColor(val);
                      clearInvalid('color');
                    }}
                    height={FORM_INPUT_HEIGHT}
                    error={!!invalid.color}
                  />
                </View>

                <View style={styles.field}>
                  <Text
                    style={[formStyles.label, {color: C.textSecondary, marginBottom: ms(4)}]}>
                    {t('reportCellColour') || 'Report Cell Colour'} <Text style={{color: '#c00000'}}>*</Text>
                  </Text>
                  <ColorPicker
                    value={cellColor}
                    onChange={(val) => {
                      setCellColor(val);
                      clearInvalid('cellColor');
                    }}
                    height={FORM_INPUT_HEIGHT}
                    error={!!invalid.cellColor}
                  />
                </View>

                <View style={styles.field}>
                  <Text
                    style={[formStyles.label, {color: C.textSecondary, marginBottom: ms(4)}]}>
                    {t('meetingType') || 'Meeting Type'} <Text style={{color: '#c00000'}}>*</Text>
                  </Text>
                  <ElementDropdown
                    data={meetingTypeOptions}
                    value={meetingType as any}
                    onChange={v => {
                      setMeetingType(v as 'Pastors List' | 'Attendance');
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
  scrollContent: {
    paddingBottom: ms(24),
  },
  form: {
    marginTop: ms(16),
    gap: ms(16),
  },
  field: {
    marginBottom: ms(8),
  },
});

export default AddEventTypeScreen;



