import React, {useEffect, useState} from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {getFAQById} from '../services/faq.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs, hs} from '../../../shared/utils/scale';
import {FAQItem} from '../services/faq.service';

// Function to convert HTML to formatted text
const convertHtmlToText = (html: string): string => {
  if (!html) return '';
  
  let text = html;
  
  // Replace block-level elements with newlines
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/ul>/gi, '\n');
  text = text.replace(/<\/ol>/gi, '\n');
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&apos;/g, "'");
  text = text.replace(/&rsquo;/g, '\u2019');
  text = text.replace(/&lsquo;/g, '\u2018');
  text = text.replace(/&rdquo;/g, '\u201D');
  text = text.replace(/&ldquo;/g, '\u201C');
  text = text.replace(/&mdash;/g, '\u2014');
  text = text.replace(/&ndash;/g, '\u2013');
  text = text.replace(/&hellip;/g, '\u2026');
  
  // Decode numeric entities (decimal)
  text = text.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });
  
  // Decode numeric entities (hex)
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  // Clean up multiple newlines (more than 2 consecutive)
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Clean up spaces around newlines
  text = text.replace(/[ \t]+\n/g, '\n');
  text = text.replace(/\n[ \t]+/g, '\n');
  
  // Trim and clean up
  text = text.trim();
  
  return text;
};

export const FAQDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const faqId: number | undefined = route.params?.faqId;
  const [faq, setFaq] = useState<FAQItem | null>(null);
  const [loading, setLoading] = useState(true);
  const {t} = useTranslation();
  const C = useThemedColors();

  useEffect(() => {
    let mounted = true;
    if (faqId) {
      getFAQById(faqId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setFaq(res?.data || null);
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

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={{flex: 1, backgroundColor: C.background}}>
        <View style={styles.container}>
          <Header title={t('faqDetail') || 'FAQ Detail'} showMenu={false} />
          {loading ? (
            <Text style={[styles.loading, {color: C.textPrimary}]}>
              {t('loading') || 'Loading'}...
            </Text>
          ) : !faq ? (
            <Text style={[styles.loading, {color: C.textPrimary}]}>
              {t('noDataFound') || 'No data found'}
            </Text>
          ) : (
            <ScrollView

              contentContainerStyle={styles.scrollContent}>
              <View style={styles.content}>
                <Text style={[styles.questionHeader, {color: C.textPrimary}]}>
                  {faq.question_header}
                </Text>

                {faq.tags && faq.tags.length > 0 && faq.tags.some(tag => tag.tag_name) && (
                  <View style={styles.tagsContainer}>
                    {faq.tags.filter(tag => tag.tag_name).map((tag, idx) => (
                      <View key={idx} style={[styles.tag, {backgroundColor: C.border}]}>
                        <Text style={[styles.tagText, {color: C.textSecondary}]}>
                          {tag.tag_name}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={[styles.answerContainer, styles.cardShadow, {backgroundColor: C.surface, borderColor: C.surfaceBorder}]}>
                  <Text style={[styles.answerLabel, {color: C.textSecondary}]}>
                    {t('answer') || 'Answer'}:
                  </Text>
                  <Text style={[styles.answerText, {color: C.textPrimary}]}>
                    {convertHtmlToText(faq.answer)}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
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
  content: {
    marginTop: ms(16),
  },
  questionHeader: {
    fontSize: fs(14),
    fontWeight: '700',
    marginBottom: ms(16),
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(6),
    marginBottom: ms(16),
  },
  tag: {
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
    borderRadius: rs(4),
  },
  tagText: {
    fontSize: fs(12),
  },
  answerContainer: {
    padding: ms(16),
    borderRadius: rs(12),
    borderWidth: 1,
    marginTop: ms(8),
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: rs(6),
    shadowOffset: {width: 0, height: hs(3)},
    elevation: 2,
  },
  answerLabel: {
    fontSize: fs(14),
    fontWeight: '600',
    marginBottom: ms(8),
  },
  answerText: {
    fontSize: fs(14),
    lineHeight: fs(20),
  },
  loading: {
    textAlign: 'center',
    marginTop: ms(40),
    fontSize: fs(14),
  },
});

export default FAQDetailScreen;

