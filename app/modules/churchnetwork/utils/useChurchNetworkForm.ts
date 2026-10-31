import {useRef, useState} from 'react';
import {Alert} from 'react-native';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {ChurchNetworkPayload, listChurchNetworks} from '../services/churchnetwork.service';
import {
  ChurchNetworkNameError,
  isDuplicateNameError,
  MAX_CHURCH_NETWORK_NAME_LENGTH,
  normalizeChurchNetworkName,
  validateChurchNetworkName,
} from './churchNetwork.utils';

/**
 * Name + "pastor credential locked" + Save for the add / edit network forms:
 * validates (blank, too long, duplicate), saves once even on a double tap,
 * shows a duplicate the API reports under the name field, shows other API
 * errors, and marks the list for reload.
 */
export function useChurchNetworkForm(options: {
  /** The record being edited (never its own duplicate). */
  selfId?: number;
  save: (payload: ChurchNetworkPayload) => Promise<unknown>;
  successMessage: string;
  onSaved: () => void;
}) {
  const {t} = useTranslation();
  const [name, setName] = useState('');
  const [locked, setLocked] = useState(false);
  const [nameError, setNameError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const messageFor = (error: ChurchNetworkNameError) =>
    error === 'required'
      ? t('fieldIsRequired').replace('{field}', t('name'))
      : error === 'tooLong'
        ? t('churchNetworkNameTooLong').replace('{max}', String(MAX_CHURCH_NETWORK_NAME_LENGTH))
        : t('churchNetworkNameExists');

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
    const localError = validateChurchNetworkName(name, [], options.selfId);
    if (localError) {
      setNameError(messageFor(localError));
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      // Catch a duplicate before sending (if the list can't load, the API
      // still refuses it and that answer is shown the same way).
      const existing = await listChurchNetworks().catch(() => []);
      const duplicate = validateChurchNetworkName(name, existing, options.selfId);
      if (duplicate) {
        setNameError(messageFor(duplicate));
        return;
      }
      await options.save({name: normalizeChurchNetworkName(name), pastor_credential_locked: locked});
      markDataChanged('churchNetworks');
      Alert.alert(t('success'), options.successMessage);
      options.onSaved();
    } catch (e) {
      if (isDuplicateNameError(e)) {
        setNameError(messageFor('duplicate'));
      } else {
        Alert.alert(t('error'), getApiErrorMessage(e, t));
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return {name, setName, locked, setLocked, nameError, onNameChange, onSave, submitting};
}
