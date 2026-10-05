import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, KeyboardAvoidingView, Platform, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layout, Text } from '@ui-kitten/components';
import { Header } from '../../../shared/components/Header';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import { globalStyles } from '../../../shared/styles/global';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import api from '../../../config/api';
import { useThemedColors } from '../../../shared/styles/theme';
import { fs, ms, hs } from '../../../shared/utils/scale';
import AppInput from '../../../shared/components/AppInput';
import { SaveButton } from '../../../shared/components/ActionButtons';
import { formStyles } from '../../../shared/styles/form';

export default function BibleVerseScreen() {
  const { t } = useTranslation();
  const C = useThemedColors();
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [verseHeading, setVerseHeading] = useState<string>('');
  const [verseBody, setVerseBody] = useState<string>('');
  const [loadError, setLoadError] = useState<unknown>(null);

  const loadVerse = useCallback(async () => {
    if (loading) return;
    try {
      setLoading(true);
      const res = await api.get('verses/show');
      const d = res?.data?.data || {};
      setVerseHeading(d?.verse_heading || '');
      setVerseBody(d?.verse_body || '');
      setLoadError(null);
    } catch (e: any) {
      // Show a recoverable error instead of a blank form that would overwrite the verse on save.
      console.error('Failed to load verse:', e);
      setLoadError(e);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    let mounted = true;
    (async () => { if (mounted) await loadVerse(); })();
    return () => { mounted = false; };
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('verses/change', {
        verse_heading: verseHeading,
        verse_body: verseBody,
      });
      Alert.alert(t('success'), t('profileUpdatedSuccess'));
    } catch (e: any) {
      Alert.alert(t('error'), e?.response?.data?.message || e?.message || 'Failed to save verse');
    } finally {
      setSaving(false);
    }
  };
  return (
    <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}>
      <Layout style={[globalStyles.layout, { backgroundColor: C.background }]}>
        <Header title={t('bibleVerse')} />
        {loadError ? (
          <ApiErrorState error={loadError} onRetry={loadVerse} />
        ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? hs(64) : ((StatusBar.currentHeight || 0) + hs(50))}
          style={{ flex: 1 }}
        >
          <ScrollView

            contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: ms(16), paddingTop: ms(10) }}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets>
            <View style={{ gap: ms(12) }}>
              <Text
                category="label"
                style={[formStyles.label, { marginBottom: ms(4), color: C.textSecondary }]}>
                Verse Heading
              </Text>
              <AppInput
                value={verseHeading}
                onChangeText={setVerseHeading}
                autoCapitalize="sentences"
              />

              <Text
                category="label"
                style={[formStyles.label, { marginTop: ms(8), marginBottom: ms(4), color: C.textSecondary }]}>
                Verse Body
              </Text>
              <AppInput
                value={verseBody}
                onChangeText={setVerseBody}
                multiline
                style={{ height: undefined, minHeight: hs(140), textAlignVertical: 'top', paddingTop: ms(8) }}
                autoCapitalize="sentences"
              />

              <SaveButton
                label={t('save')}
                onPress={handleSave}
                disabled={saving}
                style={{ marginTop: ms(12) }}
              />

              {loading ? (
                <Text style={{ marginTop: ms(8), color: C.textPrimary, fontSize: fs(14) }}>
                  {t('loading')}...
                </Text>
              ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        )}
      </Layout>
    </SafeAreaView>
  );
}


