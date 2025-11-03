import React, {useState, useEffect} from 'react';
import {
  ScrollView,
  View,
  Image,
  Alert,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  InteractionManager,
} from 'react-native';
import {
  Input,
  Button,
  Layout,
  Datepicker,
  Text,
  Icon,
  IconElement,
  Select,
  SelectItem,
  IndexPath,
} from '@ui-kitten/components';
import {Formik, FieldArray} from 'formik';
import {globalStyles} from '../../../shared/styles/global';
import {COLORS} from '../../../shared/constants/colors';
// import { useFormOptions } from './utils/addChurch.utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImagePicker from 'react-native-image-crop-picker';
import {useFormikContext} from 'formik';
import * as RNFS from 'react-native-fs';

import * as Yup from 'yup';
import api from '../../../config/api';
import {useNavigation} from '@react-navigation/native';
import WeeklyReportStep1 from './step/WeeklyReportStep1';
import WeeklyReportStep2 from './step/WeeklyReportStep2';
import {WeeklyReportSubmitData} from './utils/weeklyReport.utils';

export default function WeeklyReportScreen() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([]);
  const navigation = useNavigation();

  const handleStep1Next = (weeks: number[]) => {
    setSelectedWeeks(weeks);
    setStep(2);
  };

  const handleStep2Submit = (data: WeeklyReportSubmitData[]) => {
    console.log('Submitted data:', data);
    // TODO: send to API here
    setStep(1);
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <Layout style={{flex: 1, padding: 16}}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton} appearance="hint">
            ❮ Back
          </Text>
        </TouchableOpacity>

        <Text category="label" style={styles.title}>
          Church: Add New Church
        </Text>

        <View style={{flex: 1, marginTop: 8}}>
          {step === 1 ? (
            <WeeklyReportStep1 onNext={handleStep1Next} />
          ) : (
            <WeeklyReportStep2
              weeks={selectedWeeks}
              onBack={() => setStep(1)}
              onSubmit={handleStep2Submit}
            />
          )}
        </View>

      </Layout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginBottom: 12,
    fontSize: 14,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginTop: 4,
  },
  dropdown: {
    borderColor: '#ccc',
    borderRadius: 8,
    height: 48,
  },

  dropdownContainer: {
    borderColor: '#ccc',
  },

  dropdownInput: {
    marginBottom: 0,
    zIndex: 1000,
  },
  label: {
    color: '#8f9bb3',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  filePickerButton: {
    borderRadius: 3,
    borderColor: '#e4e9f3',
    borderWidth: 1,
    padding: 10,
    backgroundColor: '#f8f9fc',
  },

  filePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addChildButton: {
    backgroundColor: COLORS.mainColor,
    borderRadius: 3,
    borderColor: COLORS.mainColor,
    width: 120,
    height: 40,
    fontSize: 10,
    marginTop: 8,
  },
  addChildButtonText: {
    fontSize: 7,
    fontWeight: '500',
  },
});
