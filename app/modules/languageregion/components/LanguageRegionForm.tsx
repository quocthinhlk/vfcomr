import React from 'react';
import AppInput from '../../../shared/components/AppInput';
import ElementDropdown, {
  ElementDropdownItem,
} from '../../../shared/components/ElementDropdown';
import {
  FormActions,
  FormDivider,
  FormField,
  FormSwitchRow,
} from '../../../shared/components/crud';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {LANGUAGE_REGION_NAME_MAX} from '../services/languageregion.service';
import type {RegionNameError} from '../utils/languageRegion.utils';

export type LanguageRegionFormValues = {
  name: string;
  parentId: number | null;
  disabled: boolean;
};

type Props = {
  values: LanguageRegionFormValues;
  onChange: <K extends keyof LanguageRegionFormValues>(
    key: K,
    value: LanguageRegionFormValues[K],
  ) => void;
  nameError: RegionNameError | null;
  parentOptions: ElementDropdownItem[];
  submitting: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export const LanguageRegionForm: React.FC<Props> = ({
  values,
  onChange,
  nameError,
  parentOptions,
  submitting,
  onSave,
  onCancel,
}) => {
  const {t} = useTranslation();
  const message =
    nameError === 'required'
      ? t('fieldIsRequired').replace('{field}', t('name'))
      : nameError === 'tooLong'
        ? t('countryNameTooLong').replace('{max}', String(LANGUAGE_REGION_NAME_MAX))
        : nameError === 'duplicate'
          ? t('languageRegionNameExists')
          : undefined;
  return (
    <>
      {/* Errors under the field (was an "Validation" alert, nothing marked). */}
      <FormField label={t('name')} required error={message}>
        <AppInput
          value={values.name}
          onChangeText={text => onChange('name', text)}
          placeholder={t('languageRegion')}
          error={!!nameError}
          editable={!submitting}
          maxLength={LANGUAGE_REGION_NAME_MAX}
          autoCapitalize="words"
          returnKeyType="done"
          accessibilityLabel={`${t('name')}, ${t('required')}`}
        />
      </FormField>
      <FormField label={t('parentRegion')}>
        <ElementDropdown
          data={parentOptions}
          value={values.parentId}
          onChange={v => onChange('parentId', v == null ? null : Number(v) || null)}
          placeholder={t('parentRegion')}
        />
      </FormField>
      <FormDivider />
      <FormSwitchRow
        label={t('disabled')}
        value={values.disabled}
        onValueChange={v => onChange('disabled', v)}
        disabled={submitting}
      />
      <FormActions onCancel={onCancel} onSave={onSave} submitting={submitting} />
    </>
  );
};

export default LanguageRegionForm;
