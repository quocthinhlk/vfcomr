import React, {useEffect, useState} from 'react';
import {View, Alert, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {
  getChurchNetworkById,
  updateChurchNetwork,
} from '../services/churchnetwork.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {
  CenteredLoader,
  ChurchNetworkForm,
  networkStyles,
} from '../components/ChurchNetworkUI';

export const EditChurchNetworkScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchNetworkId: number | undefined = route.params?.churchNetworkId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pastorLocked, setPastorLocked] = useState(false);
  const [loading, setLoading] = useState(!!churchNetworkId);
  const [nameError, setNameError] = useState('');
  const {t} = useTranslation();
  const C = useThemedColors();

  useEffect(() => {
    let mounted = true;
    if (churchNetworkId) {
      getChurchNetworkById(churchNetworkId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setName(res?.data?.name || '');
          setPastorLocked(!!res?.data?.pastor_credential_locked);
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) {
            setLoading(false);
          }
        });
    }
    return () => {
      mounted = false;
    };
  }, [churchNetworkId]);

  const onNameChange = (value: string) => {
    setName(value);
    if (nameError && value.trim()) {
      setNameError('');
    }
  };

  const onSave = async () => {
    if (!churchNetworkId) return;
    if (!name.trim()) {
      setNameError(t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      await updateChurchNetwork(churchNetworkId, { name: name.trim(), pastor_credential_locked: pastorLocked });
      Alert.alert(t('success') || 'Success', `${t('edit')} ${t('churchNetwork')} ${t('success')}`);
      returnAfterEdit(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[networkStyles.screen, {backgroundColor: C.background}]}>
        <Header title={`${t('edit')} ${t('churchNetwork')}`} showMenu={false} />
        {loading ? (
          <CenteredLoader />
        ) : (
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
        )}
      </View>
    </SafeAreaView>
  );
};

export default EditChurchNetworkScreen;
