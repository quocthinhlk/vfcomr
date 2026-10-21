import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {COLORS} from '../../../shared/constants/colors';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs, ws} from '../../../shared/utils/scale';
import {FormActions, FormField, ScreenContainer} from '../../../shared/components/crud';
import type {TranslationKey} from '../../../shared/translations/types';
import {
  getPushReportOptions,
  getUserPushReport,
  PUSH_REPORT_STATUS_REMOVE,
  PushReportConfig,
  PushReportOption,
  PushReportOptions,
  saveUserPushReport,
} from '../services/pushReport.service';

type FieldKey = 'report_type' | 'frequency' | 'day_of_month' | 'scope' | 'status';
type FormValues = Record<FieldKey, string>;

// Same groups and order as the old web form (Users/addPushReportConf/{id}).
const GROUPS: {key: FieldKey; labelKey: TranslationKey; options: keyof PushReportOptions}[] = [
  {key: 'report_type', labelKey: 'reportType', options: 'report_types'},
  {key: 'frequency', labelKey: 'frequency', options: 'frequencies'},
  {key: 'day_of_month', labelKey: 'dayOfMonth', options: 'days_of_month'},
  {key: 'scope', labelKey: 'changeScope', options: 'scopes'},
  {key: 'status', labelKey: 'status', options: 'statuses'},
];

const EMPTY: FormValues = {report_type: '', frequency: '', day_of_month: '', scope: '', status: ''};

const toForm = (config: PushReportConfig | null): FormValues =>
  config
    ? {
        report_type: String(config.report_type ?? ''),
        frequency: String(config.frequency ?? ''),
        day_of_month: String(config.day_of_month ?? ''),
        scope: String(config.scope ?? ''),
        status: String(config.status ?? ''),
      }
    : EMPTY;

/** Push Mail: one user's push report settings. Route params: `userId`, `name`. */
export default function PushReportConfigScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const userId = Number(route.params?.userId);
  const name: string = route.params?.name ?? '';
  const {t} = useTranslation();
  const C = useThemedColors();

  const [options, setOptions] = useState<PushReportOptions | null>(null);
  const [config, setConfig] = useState<PushReportConfig | null>(null);
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [missing, setMissing] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [nextOptions, nextConfig] = await Promise.all([
        getPushReportOptions(),
        getUserPushReport(userId),
      ]);
      if (mountedRef.current) {
        setOptions(nextOptions);
        setConfig(nextConfig);
        setValues(toForm(nextConfig));
      }
    } catch (e) {
      console.error('[PushReportConfig] load failed', {userId, error: e});
      if (mountedRef.current) {
        setLoadError(e);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const pick = (key: FieldKey, value: string) => {
    setValues(prev => ({...prev, [key]: value}));
    setMissing(prev => ({...prev, [key]: false}));
  };

  const submit = async () => {
    const payload = {
      report_type: values.report_type,
      frequency: Number(values.frequency),
      day_of_month: Number(values.day_of_month),
      scope: values.scope,
      status: Number(values.status),
    };
    setSubmitting(true);
    try {
      await saveUserPushReport(userId, payload);
      const removed = values.status === PUSH_REPORT_STATUS_REMOVE;
      Alert.alert(t('success'), removed ? t('pushReportRemoved') : t('pushReportSaved'));
      navigation.goBack();
    } catch (e: any) {
      const status = e?.response?.status ?? e?.status;
      console.error('[PushReportConfig] save failed', {
        userId,
        payload,
        status,
        response: e?.response?.data,
        message: e?.message,
      });
      Alert.alert(status ? `${t('error')} ${status}` : t('error'), String(e?.message ?? ''));
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  const onSave = () => {
    const nextMissing: Partial<Record<FieldKey, boolean>> = {};
    GROUPS.forEach(group => {
      nextMissing[group.key] = !values[group.key];
    });
    setMissing(nextMissing);
    if (Object.values(nextMissing).some(Boolean)) {
      Alert.alert(t('error'), t('pushReportChooseAll'));
      return;
    }
    // "Remove" deletes the user's settings: confirm first.
    if (values.status === PUSH_REPORT_STATUS_REMOVE) {
      Alert.alert(t('remove'), t('pushReportRemoveConfirm').replace('{name}', name || `#${userId}`), [
        {text: t('cancel'), style: 'cancel'},
        {text: t('remove'), style: 'destructive', onPress: submit},
      ]);
      return;
    }
    submit();
  };

  const renderRadio = (key: FieldKey, option: PushReportOption) => {
    const selected = values[key] === option.value;
    return (
      <TouchableOpacity
        key={option.value}
        onPress={() => pick(key, option.value)}
        disabled={submitting}
        accessibilityRole="radio"
        accessibilityState={{selected}}
        accessibilityLabel={option.label}
        style={styles.radioRow}>
        <View
          style={[
            styles.radioOuter,
            {borderColor: selected ? COLORS.mainColor : C.inputBorder},
          ]}>
          {selected ? <View style={[styles.radioInner, {backgroundColor: COLORS.mainColor}]} /> : null}
        </View>
        <Text style={[styles.radioLabel, {color: C.textPrimary}]}>{option.label}</Text>
      </TouchableOpacity>
    );
  };

  const title = t('pushReportsTo').replace('{name}', name || `#${userId}`);

  return (
    <ScreenContainer
      title={t('pushMail')}
      loading={loading}
      error={!options ? loadError : null}
      onRetry={load}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.heading, {color: C.textPrimary}]}>{title}</Text>
        <Text style={[styles.note, {color: C.textSecondary}]}>
          {config
            ? `${config.status_label || ''}${
                config.execution_date ? `  ·  ${t('nextSendDate')}: ${config.execution_date}` : ''
              }`
            : t('pushReportNotConfigured')}
        </Text>

        {options
          ? GROUPS.map(group => (
              <FormField key={group.key} label={t(group.labelKey)} required>
                <View
                  style={[
                    styles.group,
                    {
                      backgroundColor: C.surface,
                      borderColor: missing[group.key] ? COLORS.dangerColor : C.border,
                    },
                  ]}
                  accessibilityRole="radiogroup">
                  {options[group.options].map(option => renderRadio(group.key, option))}
                </View>
              </FormField>
            ))
          : null}

        <FormActions onCancel={() => navigation.goBack()} onSave={onSave} submitting={submitting} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: ms(12),
    paddingBottom: ms(32),
  },
  heading: {
    fontSize: fs(17),
    fontWeight: '700',
  },
  note: {
    fontSize: fs(12),
    marginTop: ms(4),
    marginBottom: ms(12),
  },
  group: {
    borderWidth: 1,
    borderRadius: rs(10),
    paddingVertical: ms(4),
    paddingHorizontal: ms(10),
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(10),
    minHeight: 40,
  },
  radioOuter: {
    width: ws(20),
    height: ws(20),
    borderRadius: ws(10),
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: ws(10),
    height: ws(10),
    borderRadius: ws(5),
  },
  radioLabel: {
    flex: 1,
    fontSize: fs(14),
  },
});
