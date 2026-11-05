import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  deleteCountry,
  getCountryById,
  getCountryUsage,
} from '../services/country.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useSubmitOnce} from '../../../shared/hooks/useSubmitOnce';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {returnToList} from '../../../shared/utils/returnToList';
import {
  DeleteConfirmView,
  ScreenContainer,
} from '../../../shared/components/crud';

export const DeleteCountryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const countryId: number | undefined = route.params?.countryId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!countryId);
  const [loadError, setLoadError] = useState<unknown>(null);
  // The API deletes a country that churches / cities still use and leaves
  // them pointing at a missing country, so it is blocked here.
  const [usage, setUsage] = useState({churches: 0, cities: 0});
  const [deleteError, setDeleteError] = useState('');
  const submitOnce = useSubmitOnce();
  const inUse = usage.churches > 0 || usage.cities > 0;
  const mountedRef = useRef(true);
  const {t} = useTranslation();

  // Don't ask to confirm deleting a record we couldn't load (e.g. offline).
  const load = useCallback(async () => {
    if (!countryId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [res, used] = await Promise.all([
        getCountryById(countryId),
        getCountryUsage(countryId),
      ]);
      if (mountedRef.current) {
        setName(res?.data?.name?.trim() || `#${countryId}`);
        setUsage(used);
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
  }, [countryId]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const onConfirm = submitOnce(async () => {
    if (!countryId || inUse) {
      return;
    }
    try {
      setSubmitting(true);
      setDeleteError('');
      await deleteCountry(countryId);
      markDataChanged('countries');
      Alert.alert(t('success') || 'Success', `${t('delete')} ${t('country')} ${t('success')}`);
      returnToList(navigation);
    } catch (e) {
      // In the page, with the API's reason (was a fixed English text).
      if (mountedRef.current) {
        setDeleteError(getApiErrorMessage(e, t));
      }
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  });

  return (
    <ScreenContainer
      title={`${t('delete')} ${t('country')}`}
      scroll
      loading={loading}
      error={loadError}
      onRetry={load}>
      <DeleteConfirmView
        name={name}
        onCancel={() => navigation.goBack()}
        onConfirm={onConfirm}
        submitting={submitting}
        disabled={!countryId || inUse}
        errorMessage={
          inUse
            ? t('countryInUse')
                .replace('{churches}', String(usage.churches))
                .replace('{cities}', String(usage.cities))
            : deleteError || undefined
        }
      />
    </ScreenContainer>
  );
};

export default DeleteCountryScreen;
