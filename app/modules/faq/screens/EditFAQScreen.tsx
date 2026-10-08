import React, {useState, useEffect, useCallback, useRef} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {updateFAQ, getFAQById} from '../services/faq.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useSuperAdminGuard} from '../hooks/useSuperAdminGuard';
import {useFaqLanguageOptions} from '../hooks/useFaqLanguageOptions';
import {ScreenContainer} from '../../../shared/components/crud';
import {
  FAQForm,
  FAQFormInvalid,
  FAQFormScroll,
  hasFAQFormErrors,
  validateFAQForm,
} from '../components/FAQForm';

export const EditFAQScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const faqId: number | undefined = route.params?.faqId;
  const [questionHeader, setQuestionHeader] = useState('');
  const [answer, setAnswer] = useState('');
  const [languageId, setLanguageId] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);
  const [invalid, setInvalid] = useState<FAQFormInvalid>({});
  const clearInvalid = (field: keyof FAQFormInvalid) =>
    setInvalid(current => (current[field] ? {...current, [field]: false} : current));
  const [loading, setLoading] = useState(true);
  const {t} = useTranslation();

  const {languageOptions, languagesLoading, languagesError, loadLanguages} =
    useFaqLanguageOptions();

  const {isAdmin, checkingRole, roleError, checkRole} = useSuperAdminGuard(
    t('accessDenied') || 'Access denied. Only administrators can edit FAQs.',
  );

  const [loadError, setLoadError] = useState<unknown>(null);
  const requestRef = useRef(0);

  const loadFaq = useCallback(async () => {
    const requestId = ++requestRef.current;
    if (!faqId) {
      setLoading(false);
      return;
    }
    try {
      const res = await getFAQById(faqId);
      if (requestId !== requestRef.current) {
        return;
      }
      const faq = res?.data;
      if (faq) {
        setQuestionHeader(faq.question_header || '');
        // Edited as HTML in the rich editor; untouched answers are saved back as-is.
        setAnswer(faq.answer || '');
        setLanguageId(faq.language_id || null);
        if (faq.tags && faq.tags.length > 0) {
          setTags(faq.tags.map(tag => tag.tag_name || ''));
        } else {
          setTags(['']);
        }
      }
      setLoadError(null);
    } catch (e) {
      if (requestId === requestRef.current) {
        console.error('Error fetching FAQ:', e);
        // Never show a blank form the user could save over real data.
        setLoadError(e);
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, [faqId]);

  useEffect(() => {
    loadFaq();
    return () => {
      requestRef.current += 1;
    };
  }, [loadFaq]);

  const handleAddTag = () => {
    setTags([...tags, '']);
  };

  const handleRemoveTag = (index: number) => {
    if (tags.length > 1) {
      setTags(tags.filter((_, i) => i !== index));
    }
  };

  const handleTagChange = (index: number, value: string) => {
    const newTags = [...tags];
    newTags[index] = value;
    setTags(newTags);
  };

  const onSave = async () => {
    if (!faqId || loadError) return;
    const nextInvalid = validateFAQForm({questionHeader, answer, languageId});
    setInvalid(nextInvalid);
    if (hasFAQFormErrors(nextInvalid) || !languageId) {
      return;
    }

    const validTags = tags.filter(tag => tag.trim()).map(tag => ({tag_name: tag.trim()}));

    try {
      setSubmitting(true);
      await updateFAQ(faqId, {
        question_header: questionHeader.trim(),
        answer,
        language_id: languageId,
        tags: validTags,
      });
      Alert.alert(t('success') || 'Success', `${t('edit') || 'Edit'} ${t('faq') || 'FAQ'} ${t('success') || 'success'}`);
      returnAfterEdit(navigation);
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', e?.message || 'Failed to update FAQ');
    } finally {
      setSubmitting(false);
    }
  };

  const title = `${t('edit') || 'Edit'} ${t('faq') || 'FAQ'}`;

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
      loading={loading || languagesLoading}
      error={loadError || languagesError}
      onRetry={() =>
        Promise.all([
          loadError ? loadFaq() : undefined,
          languagesError ? loadLanguages() : undefined,
        ])
      }>
      <FAQFormScroll>
        <FAQForm
          questionHeader={questionHeader}
          onQuestionHeaderChange={setQuestionHeader}
          answer={answer}
          onAnswerChange={setAnswer}
          languageId={languageId}
          onLanguageChange={setLanguageId}
          languageOptions={languageOptions}
          tags={tags}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          onTagChange={handleTagChange}
          submitting={submitting}
          onSave={onSave}
          onCancel={() => navigation.goBack()}
          invalid={invalid}
          onClearInvalid={clearInvalid}
        />
      </FAQFormScroll>
    </ScreenContainer>
  );
};

export default EditFAQScreen;
