import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, KeyboardAvoidingView, Platform, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layout, Text, Input, Button } from '@ui-kitten/components';
import { Header } from '../../../shared/components/Header';
import { globalStyles } from '../../../shared/styles/global';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import api from '../../../config/api';
import { useThemedColors } from '../../../shared/styles/theme';

export default function BibleVerseScreen() {
  const { t } = useTranslation();
  const C = useThemedColors();
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [verseHeading, setVerseHeading] = useState<string>('');
  const [verseBody, setVerseBody] = useState<string>('');

  const loadVerse = useCallback(async () => {
    if (loading) return;
    try {
      setLoading(true);
      const res = await api.get('verses/show');
      const d = res?.data?.data || {};
      setVerseHeading(d?.verse_heading || '');
      setVerseBody(d?.verse_body || '');
    } catch (e: any) {
      Alert.alert(t('error'), e?.response?.data?.message || e?.message || 'Failed to load verse');
    } finally {
      setLoading(false);
    }
  }, [loading, t]);

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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : ((StatusBar.currentHeight || 0) + 50)}
          style={{ flex: 1 }}
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 16, paddingTop: 10 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
            <View style={{ gap: 12 }}>

              <Text category="label" style={{ marginBottom: 4, color: C.textSecondary }}>Verse Heading</Text>
              <Input value={verseHeading} onChangeText={setVerseHeading} autoCapitalize="sentences" />

              <Text category="label" style={{ marginTop: 8, marginBottom: 4, color: C.textSecondary }}>Verse Body</Text>
              <Input value={verseBody} onChangeText={setVerseBody} multiline textStyle={{ minHeight: 140 }} autoCapitalize="sentences" />

              <Button onPress={handleSave} disabled={saving} style={[globalStyles.button, { marginTop: 12 }]}>{t('save')}</Button>

              {loading ? <Text style={{ marginTop: 8, color: C.textPrimary }}>{t('loading')}...</Text> : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Layout>
    </SafeAreaView>
  );
}


