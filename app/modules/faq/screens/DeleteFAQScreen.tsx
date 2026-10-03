import React, {useEffect, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  deleteFAQ,
  getFAQById,
} from '../services/faq.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {isSuperAdmin} from '../../../shared/utils/permissions';
import {returnToList} from '../../../shared/utils/returnToList';
import api from '../../../config/api';
import {
  DeleteConfirmView,
  ScreenContainer,
} from '../../../shared/components/crud';

export const DeleteFAQScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const faqId: number | undefined = route.params?.faqId;
  const [questionHeader, setQuestionHeader] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {t} = useTranslation();
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  // Check user role on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('users/me');
        const roleId = res?.data?.data?.role?.id;
        if (typeof roleId === 'number') {
          setUserRoleId(roleId);
          if (!isSuperAdmin(roleId)) {
            // Redirect non-admin users
            Alert.alert(t('error') || 'Error', t('accessDenied') || 'Access denied. Only administrators can delete FAQs.');
            navigation.goBack();
            return;
          }
        }
      } catch (e) {
        console.error('Error fetching user role:', e);
        Alert.alert(t('error') || 'Error', t('failedToVerifyPermissions') || 'Failed to verify permissions.');
        navigation.goBack();
      } finally {
        setCheckingRole(false);
      }
    })();
  }, [navigation, t]);

  useEffect(() => {
    let mounted = true;
    if (faqId && isSuperAdmin(userRoleId)) {
      getFAQById(faqId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setQuestionHeader(res?.data?.question_header || 'this FAQ');
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [faqId, userRoleId]);

  const onConfirm = async () => {
    if (!faqId) return;
    try {
      setSubmitting(true);
      await deleteFAQ(faqId);
      Alert.alert(t('success') || 'Success', `${t('delete') || 'Delete'} ${t('faq') || 'FAQ'} ${t('success') || 'success'}`);
      returnToList(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to delete FAQ');
    } finally {
      setSubmitting(false);
    }
  };

  const title = `${t('delete') || 'Delete'} ${t('faq') || 'FAQ'}`;

  if (checkingRole) {
    return <ScreenContainer title={title} loading />;
  }

  if (!isSuperAdmin(userRoleId)) {
    return null; // Will redirect in useEffect
  }

  return (
    <ScreenContainer title={title} scroll>
      <DeleteConfirmView
        name={questionHeader}
        onCancel={() => navigation.goBack()}
        onConfirm={onConfirm}
        submitting={submitting}
        disabled={!faqId}
      />
    </ScreenContainer>
  );
};

export default DeleteFAQScreen;
