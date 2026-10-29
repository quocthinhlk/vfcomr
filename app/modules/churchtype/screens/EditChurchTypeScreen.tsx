import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {getChurchTypeById, updateChurchType} from '../services/churchtype.service';
import {MAX_CHURCH_TYPE_NAME_LENGTH} from '../utils/churchType.utils';
import {useChurchTypeForm} from '../utils/useChurchTypeForm';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import AppInput from '../../../shared/components/AppInput';
import {FormActions, FormField, ScreenContainer} from '../../../shared/components/crud';

export const EditChurchTypeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchTypeId = Number(route.params?.churchTypeId) || undefined;
  const {t} = useTranslation();
  const [loading, setLoading] = useState(!!churchTypeId);
  // No id, or the record couldn't be loaded: a retryable error, never a
  // blank form whose Save would do nothing (or clear the name).
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);

  const form = useChurchTypeForm({
    selfId: churchTypeId,
    save: value => updateChurchType(churchTypeId as number, {name: value}),
    successMessage: t('churchTypeUpdated'),
    onSaved: () => returnAfterEdit(navigation),
  });
  const {setName} = form;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!churchTypeId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getChurchTypeById(churchTypeId);
      if (mountedRef.current) {
        setName(res?.data?.name || '');
      }
    } catch (e) {
      if (mountedRef.current) {
        setLoadError(e);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [churchTypeId, setName]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScreenContainer
      title={`${t('edit')} ${t('churchType')}`}
      scroll
      loading={loading}
      error={loadError}
      errorMessage={churchTypeId ? undefined : t('churchTypeNotFound')}
      onRetry={churchTypeId ? load : undefined}>
      <FormField label={t('name')} required error={form.nameError}>
        <AppInput
          value={form.name}
          onChangeText={form.onNameChange}
          placeholder={t('churchType')}
          error={!!form.nameError}
          editable={!form.submitting}
          maxLength={MAX_CHURCH_TYPE_NAME_LENGTH}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={form.onSave}
          accessibilityLabel={`${t('name')}, ${t('required')}`}
        />
      </FormField>
      <FormActions onCancel={() => navigation.goBack()} onSave={form.onSave} submitting={form.submitting} />
    </ScreenContainer>
  );
};

export default EditChurchTypeScreen;
