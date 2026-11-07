import React, {useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {createFAQ} from '../services/faq.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useSubmitOnce} from '../../../shared/hooks/useSubmitOnce';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {
  getApiErrorMessage,
  getApiValidationErrors,
} from '../../../shared/utils/apiErrorHandler';
import {buildFaqTags, faqFieldErrors, FAQField} from '../utils/faq.utils';

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
  // The API's messages per field (e.g. a rejected language).
  const [serverErrors, setServerErrors] = useState<Partial<Record<FAQField, string>>>({});
  const clearInvalid = (field: keyof FAQFormInvalid) => {
    setInvalid(current => (current[field] ? {...current, [field]: false} : current));
    setServerErrors(current => (current[field] ? {...current, [field]: undefined} : current));
  };
  // Counts Saves that found errors, so the form scrolls to the first one.
  const [saveAttempt, setSaveAttempt] = useState(0);
  // One save at a time: a fast double tap created / saved the FAQ twice.
  const submitOnce = useSubmitOnce();
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

  // Field errors from the API (POST says question_header, PATCH
  // QuestionHeader) go under the field; anything else as an alert with the
  // API's message (was a fixed English text).
  const handleSaveError = (e: unknown) => {
    const fields = faqFieldErrors(getApiValidationErrors(e));
    if (Object.keys(fields).length) {
      setServerErrors(fields);
      setInvalid(current => ({
        ...current,
        ...Object.fromEntries(Object.keys(fields).map(k => [k, true])),
      }));
      setSaveAttempt(n => n + 1);
      return;
    }
    Alert.alert(t('error') || 'Error', getApiErrorMessage(e, t));
  };

  const onSave = submitOnce(async () => {
    const nextInvalid = validateFAQForm({questionHeader, answer, languageId});
    setInvalid(nextInvalid);
    if (hasFAQFormErrors(nextInvalid) || !languageId) {
      setSaveAttempt(n => n + 1);
      return;
    }

    // Trimmed, without empty or repeated tags ("qa" and "QA" were both saved).
    const validTags = buildFaqTags(tags);

    try {
      setSubmitting(true);
      await createFAQ({
        question_header: questionHeader.trim(),
        answer,
        language_id: languageId,
        tags: validTags,
      });
      markDataChanged('faqs');
      Alert.alert(t('success') || 'Success', `${t('add') || 'Add'} ${t('faq') || 'FAQ'} ${t('success') || 'success'}`);
      // React Navigation 7's navigate pushes a second list on top, so Back
      // reopened the filled form. Back to the list below, or replace this
      // form with the list (opened from the menu).
      const params = {reload: true};
      const routes: {name: string}[] = navigation.getState?.()?.routes ?? [];
      if (routes.some(r => r.name === 'FAQs') && navigation.popTo) {
        navigation.popTo('FAQs', params);
      } else if (navigation.replace) {
        navigation.replace('FAQs', params);
      } else {
        navigation.navigate('FAQs', params);
      }
    } catch (e: any) {
      handleSaveError(e);
    } finally {
      setSubmitting(false);
    }
  });

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
          serverErrors={serverErrors}
          saveAttempt={saveAttempt}
          onClearInvalid={clearInvalid}
        />
      </FAQFormScroll>
    </ScreenContainer>
  );
};

export default AddFAQScreen;
