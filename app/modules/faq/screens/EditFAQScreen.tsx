import React, {useState, useEffect, useCallback} from 'react';
import {View, StyleSheet, Alert, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StatusBar} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {formStyles} from '../../../shared/styles/form';
import {updateFAQ, getFAQById} from '../services/faq.service';
import {
  SaveButton,
  CancelButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs, hs, ws} from '../../../shared/utils/scale';
import AppInput from '../../../shared/components/AppInput';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import api from '../../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DeleteSvgIcon} from '../../../shared/components/icons';

interface LanguageOption {
  id: number;
  name: string;
}

export const EditFAQScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const faqId: number | undefined = route.params?.faqId;
  const [questionHeader, setQuestionHeader] = useState('');
  const [answer, setAnswer] = useState('');
  const [languageId, setLanguageId] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const {t} = useTranslation();
  const C = useThemedColors();
  const [languageOptions, setLanguageOptions] = useState<{label: string; value: number}[]>([]);

  const loadLanguages = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const res = await api.get('/languages', {
        params: {page: 1, limit: 100, sort_by: 'name', sort_desc: false},
        headers: {Authorization: `Bearer ${token}`},
      });
      const langItems = res?.data?.data?.items || [];
      setLanguageOptions(
        langItems.map((lang: LanguageOption) => ({
          label: lang.name,
          value: lang.id,
        })),
      );
    } catch (e) {
      console.error('Error loading languages:', e);
    }
  }, []);

  useEffect(() => {
    loadLanguages();
  }, [loadLanguages]);

  useEffect(() => {
    let mounted = true;
    if (faqId) {
      getFAQById(faqId)
        .then(res => {
          if (!mounted) {
            return;
          }
          const faq = res?.data;
          if (faq) {
            setQuestionHeader(faq.question_header || '');
            setAnswer(faq.answer || '');
            setLanguageId(faq.language_id || null);
            if (faq.tags && faq.tags.length > 0) {
              setTags(faq.tags.map(tag => tag.tag_name || ''));
            } else {
              setTags(['']);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) {
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [faqId]);

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
    if (!faqId) return;
    if (!questionHeader.trim()) {
      Alert.alert(t('validation') || 'Validation', t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    if (!answer.trim()) {
      Alert.alert(t('validation') || 'Validation', t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    if (!languageId) {
      Alert.alert(t('validation') || 'Validation', t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }

    const validTags = tags.filter(tag => tag.trim()).map(tag => ({tag_name: tag.trim()}));

    try {
      setSubmitting(true);
      await updateFAQ(faqId, {
        question_header: questionHeader.trim(),
        answer: answer.trim(),
        language_id: languageId,
        tags: validTags,
      });
      Alert.alert(t('success') || 'Success', `${t('edit') || 'Edit'} ${t('faq') || 'FAQ'} ${t('success') || 'success'}`);
      navigation.navigate('FAQs', {reload: true});
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', e?.message || 'Failed to update FAQ');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
        edges={['top', 'bottom', 'left', 'right']}>
        <View style={{flex: 1, backgroundColor: C.background}}>
          <View style={styles.container}>
            <Header
              title={`${t('edit') || 'Edit'} ${t('faq') || 'FAQ'}`}
              showMenu={false}
            />
            <Text style={[styles.loading, {color: C.textPrimary}]}>
              {t('loading') || 'Loading'}...
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={{flex: 1, backgroundColor: C.background}}>
        <View style={styles.container}>
          <Header
            title={`${t('edit') || 'Edit'} ${t('faq') || 'FAQ'}`}
            showMenu={false}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? hs(64) : ((StatusBar.currentHeight || 0) + hs(50))}
            style={{flex: 1}}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled">
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text
                    style={[formStyles.label, {color: C.textSecondary, marginBottom: ms(4)}]}>
                    {t('question') || 'Question'} <Text style={{color: '#c00000'}}>*</Text>
                  </Text>
                  <AppInput
                    value={questionHeader}
                    onChangeText={setQuestionHeader}
                    placeholder={t('question') || 'Question'}
                  />
                </View>

                <View style={styles.field}>
                  <Text
                    style={[formStyles.label, {color: C.textSecondary, marginBottom: ms(4)}]}>
                    {t('answer') || 'Answer'} <Text style={{color: '#c00000'}}>*</Text>
                  </Text>
                  <AppInput
                    value={answer}
                    onChangeText={setAnswer}
                    placeholder={t('answer') || 'Answer (HTML supported)'}
                    multiline
                    style={{height: undefined, minHeight: hs(140), textAlignVertical: 'top', paddingTop: ms(8)}}
                  />
                </View>

                <View style={styles.field}>
                  <Text
                    style={[formStyles.label, {color: C.textSecondary, marginBottom: ms(4)}]}>
                    {t('language') || 'Language'} <Text style={{color: '#c00000'}}>*</Text>
                  </Text>
                  <ElementDropdown
                    data={languageOptions}
                    value={languageId as any}
                    onChange={v => {
                      setLanguageId(v as number);
                    }}
                    placeholder={t('selectOption') || 'Select Language'}
                    containerStyle={
                      {
                        backgroundColor: C.inputBg,
                        borderColor: C.inputBorder,
                      } as any
                    }
                  />
                </View>

                <View style={styles.field}>
                  <View style={styles.tagsHeader}>
                    <Text
                      style={[formStyles.label, {color: C.textSecondary, marginBottom: ms(4)}]}>
                      {t('tags') || 'Tags'}
                    </Text>
                    <TouchableOpacity onPress={handleAddTag} style={styles.addTagButton}>
                      <Text style={[styles.addTagText, {color: C.textPrimary}]}>+ {t('add') || 'Add'}</Text>
                    </TouchableOpacity>
                  </View>
                  {tags.map((tag, index) => (
                    <View key={index} style={styles.tagRow}>
                      <View style={styles.tagInputContainer}>
                        <AppInput
                          value={tag}
                          onChangeText={value => handleTagChange(index, value)}
                          placeholder={`${t('tag') || 'Tag'} ${index + 1}`}
                        />
                      </View>
                      {tags.length > 1 && (
                        <TouchableOpacity
                          onPress={() => handleRemoveTag(index)}
                          style={[styles.removeTagButton, {backgroundColor: C.border}]}>
                          <DeleteSvgIcon width={fs(16)} height={fs(16)} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>

                <View style={formStyles.buttonRow}>
                  <CancelButton
                    label={t('cancel') || 'Cancel'}
                    onPress={() => navigation.goBack()}
                    disabled={submitting}
                  />
                  <SaveButton
                    label={t('save') || 'Save'}
                    onPress={onSave}
                    disabled={submitting}
                  />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: ms(16),
    paddingRight: ms(16),
  },
  scrollContent: {
    paddingBottom: ms(24),
  },
  form: {
    marginTop: ms(16),
    gap: ms(16),
  },
  field: {
    marginBottom: ms(8),
  },
  tagsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(4),
  },
  addTagButton: {
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
  },
  addTagText: {
    fontSize: fs(12),
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ms(8),
    gap: ms(8),
  },
  tagInputContainer: {
    flex: 1,
  },
  removeTagButton: {
    width: ws(36),
    height: ws(36),
    borderRadius: rs(4),
    justifyContent: 'center',
    alignItems: 'center',
  },
  loading: {
    textAlign: 'center',
    marginTop: ms(40),
    fontSize: fs(14),
  },
});

export default EditFAQScreen;

