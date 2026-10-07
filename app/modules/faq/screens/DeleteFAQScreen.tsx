import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  deleteFAQ,
  getFAQById,
} from '../services/faq.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useSuperAdminGuard} from '../hooks/useSuperAdminGuard';
import {returnToList} from '../../../shared/utils/returnToList';
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
  const [loading, setLoading] = useState(!!faqId);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);

  const {isAdmin, checkingRole, roleError, checkRole} = useSuperAdminGuard(
    t('accessDenied') || 'Access denied. Only administrators can delete FAQs.',
  );

  // Don't ask to confirm deleting a record we couldn't load (e.g. offline).
  const load = useCallback(async () => {
    if (!faqId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getFAQById(faqId);
      if (mountedRef.current) {
        setQuestionHeader(res?.data?.question_header || 'this FAQ');
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
  }, [faqId]);

  useEffect(() => {
    mountedRef.current = true;
    if (isAdmin) {
      load();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [isAdmin, load]);

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

  if (roleError) {
    return <ScreenContainer title={title} error={roleError} onRetry={checkRole} />;
  }

  if (!isAdmin) {
    return null; // Will redirect in useEffect
  }

  return (
    <ScreenContainer
      title={title}
      scroll
      loading={loading}
      error={loadError}
      onRetry={load}>
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
