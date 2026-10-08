import React, {useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {createFAQ} from '../services/faq.service';
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

export const AddFAQScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [questionHeader, setQuestionHeader] = useState('');
  const [answer, setAnswer] = useState('');
  const [languageId, setLanguageId] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);
  const [invalid, setInvalid] = useState<FAQFormInvalid>({});
  const clearInvalid = (field: keyof FAQFormInvalid) =>
    setInvalid(current => (current[field] ? {...current, [field]: false} : current));
  const {t} = useTranslation();

  const {isAdmin, checkingRole, roleError, checkRole} = useSuperAdminGuard(
    t('accessDenied') || 'Access denied. Only administrators can add FAQs.',
  );
  const {languageOptions, languagesLoading, languagesError, loadLanguages} =
    useFaqLanguageOptions();


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
    const nextInvalid = validateFAQForm({questionHeader, answer, languageId});
    setInvalid(nextInvalid);
    if (hasFAQFormErrors(nextInvalid) || !languageId) {
      return;
    }

    const validTags = tags.filter(tag => tag.trim()).map(tag => ({tag_name: tag.trim()}));

    try {
      setSubmitting(true);
      await createFAQ({
        question_header: questionHeader.trim(),
        answer,
        language_id: languageId,
        tags: validTags,
      });
      Alert.alert(t('success') || 'Success', `${t('add') || 'Add'} ${t('faq') || 'FAQ'} ${t('success') || 'success'}`);
      navigation.navigate('FAQs', {reload: true});
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', e?.message || 'Failed to create FAQ');
    } finally {
      setSubmitting(false);
    }
  };

  const title = `${t('addNew') || 'Add New'} ${t('faq') || 'FAQ'}`;

  if (checkingRole) {
    return <ScreenContainer title={title} loading />;
  }

  if (roleError) {
    return <ScreenContainer title={title} error={roleError} onRetry={checkRole} />;
  }

  if (!isAdmin) {
    return null; // Redirected by useSuperAdminGuard
  }

  return (
    <ScreenContainer
      title={title}
      loading={languagesLoading}
      error={languagesError}
      onRetry={loadLanguages}>
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

export default AddFAQScreen;
