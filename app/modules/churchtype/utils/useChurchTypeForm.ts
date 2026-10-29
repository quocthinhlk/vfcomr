import {useRef, useState} from 'react';
import {Alert} from 'react-native';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {listChurchTypes} from '../services/churchtype.service';
import {
  ChurchTypeNameError,
  MAX_CHURCH_TYPE_NAME_LENGTH,
  normalizeChurchTypeName,
  validateChurchTypeName,
} from './churchType.utils';

/**
 * Name field + Save for the add / edit church type forms: validates (blank,
 * too long, duplicate of another type), saves once even on a double tap, shows
 * the API's own error, and marks the list for reload.
 */
export function useChurchTypeForm(options: {
  /** The record being edited (ignored when checking for a duplicate name). */
  selfId?: number;
  save: (name: string) => Promise<unknown>;
  successMessage: string;
  onSaved: () => void;
}) {
  const {t} = useTranslation();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const messageFor = (error: ChurchTypeNameError) =>
    error === 'required'
      ? t('fieldIsRequired').replace('{field}', t('name'))
      : error === 'tooLong'
        ? t('churchTypeNameTooLong').replace('{max}', String(MAX_CHURCH_TYPE_NAME_LENGTH))
        : t('churchTypeNameExists');

  const onNameChange = (value: string) => {
    setName(value);
    if (nameError) {
      setNameError('');
    }
  };

  const onSave = async () => {
    if (submittingRef.current) {
      return;
    }
    const localError = validateChurchTypeName(name, [], options.selfId);
    if (localError) {
      setNameError(messageFor(localError));
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      // The API accepts duplicate names, so compare with the latest list.
      // If that list can't be loaded, the save still goes ahead.
      const existing = await listChurchTypes().catch(() => []);
      const duplicate = validateChurchTypeName(name, existing, options.selfId);
      if (duplicate) {
        setNameError(messageFor(duplicate));
        return;
      }
      await options.save(normalizeChurchTypeName(name));
      markDataChanged('churchTypes');
      Alert.alert(t('success'), options.successMessage);
      options.onSaved();
    } catch (e) {
      Alert.alert(t('error'), getApiErrorMessage(e, t));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return {name, setName, nameError, onNameChange, onSave, submitting};
}
