import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {
  getChurchTypeById,
  updateChurchType,
} from '../services/churchtype.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import AppInput from '../../../shared/components/AppInput';
import {
  FormActions,
  FormField,
  ScreenContainer,
} from '../../../shared/components/crud';

export const EditChurchTypeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchTypeId: number | undefined = route.params?.churchTypeId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!churchTypeId);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);
  const [nameError, setNameError] = useState('');
  const {t} = useTranslation();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Named so the error state's "Try again" can re-run it.
  const load = useCallback(async () => {
    if (!churchTypeId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getChurchTypeById(churchTypeId);
      if (!mountedRef.current) {
        return;
      }
      setName(res?.data?.name || '');
    } catch (e) {
      // Without the record the form would be blank: show a retryable error.
      if (mountedRef.current) {
        setLoadError(e);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [churchTypeId]);

  useEffect(() => {
    load();
  }, [load]);

  const onNameChange = (value: string) => {
    setName(value);
    if (nameError && value.trim()) {
      setNameError('');
    }
  };

  const onSave = async () => {
    if (!churchTypeId) return;
    if (!name.trim()) {
      setNameError(t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      await updateChurchType(churchTypeId, { name: name.trim() });
      Alert.alert(t('success') || 'Success', `${t('edit')} ${t('churchType')} ${t('success')}`);
      returnAfterEdit(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to update church type');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer title={`${t('edit')} ${t('churchType')}`} scroll loading={loading} error={loadError} onRetry={load}>
      <FormField label={t('name')} required error={nameError}>
        <AppInput
          value={name}
          onChangeText={onNameChange}
          placeholder={t('churchType')}
          error={!!nameError}
          editable={!submitting}
          returnKeyType="done"
          accessibilityLabel={`${t('name')}, ${t('required')}`}
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

export default EditChurchTypeScreen;
