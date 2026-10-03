import React, {useState} from 'react';
import {View, Alert, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {createChurchNetwork} from '../services/churchnetwork.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {
  ChurchNetworkForm,
  networkStyles,
} from '../components/ChurchNetworkUI';

export const AddChurchNetworkScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pastorLocked, setPastorLocked] = useState(false);
  const [nameError, setNameError] = useState('');
  const {t} = useTranslation();
  const C = useThemedColors();

  const onNameChange = (value: string) => {
    setName(value);
    if (nameError && value.trim()) {
      setNameError('');
    }
  };

  const onSave = async () => {
    if (!name.trim()) {
      setNameError(t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      await createChurchNetwork({ name: name.trim(), pastor_credential_locked: pastorLocked });
      Alert.alert(t('success') || 'Success', `${t('add')} ${t('churchNetwork')} ${t('success')}`);
      navigation.navigate('ChurchNetworks', { reload: true });
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', e?.message || 'Failed to create church network');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[networkStyles.screen, {backgroundColor: C.background}]}>
        <Header title={`${t('addNew')} ${t('churchNetwork')}`} showMenu={false} />
        <ScrollView
          contentContainerStyle={networkStyles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <ChurchNetworkForm
            name={name}
            onNameChange={onNameChange}
            locked={pastorLocked}
            onLockedChange={setPastorLocked}
            nameError={nameError}
            submitting={submitting}
            onSave={onSave}
            onCancel={() => navigation.goBack()}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default AddChurchNetworkScreen;
