import React, {useEffect, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {deleteCountry, getCountryById} from '../services/country.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
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
  const {t} = useTranslation();

  useEffect(() => {
    let mounted = true;
    if (countryId) {
      getCountryById(countryId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setName(res?.data?.name || 'this country');
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [countryId]);

  const onConfirm = async () => {
    if (!countryId) return;
    try {
      setSubmitting(true);
      await deleteCountry(countryId);
      Alert.alert(t('success') || 'Success', `${t('delete')} ${t('country')} ${t('success')}`);
      returnToList(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to delete country');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer title={`${t('delete')} ${t('country')}`} scroll>
      <DeleteConfirmView
        name={name}
        onCancel={() => navigation.goBack()}
        onConfirm={onConfirm}
        submitting={submitting}
        disabled={!countryId}
      />
    </ScreenContainer>
  );
};

export default DeleteCountryScreen;
