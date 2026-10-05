import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {getFAQById} from '../services/faq.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {FAQItem} from '../services/faq.service';
import api from '../../../config/api';
import {isSuperAdmin} from '../../../shared/utils/permissions';
import {ms} from '../../../shared/utils/scale';
import {
  DetailActions,
  DetailCard,
  DetailRow,
  ListEmptyState,
  ScreenContainer,
  StatusBadge,
} from '../../../shared/components/crud';

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
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const {t} = useTranslation();

  // Same role check as the FAQ list: edit / delete are super-admin only.
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('users/me');
        const roleId = res?.data?.data?.role?.id;
        if (typeof roleId === 'number') {
          setUserRoleId(roleId);
        }
      } catch (e) {
        console.error('Error fetching user role:', e);
      }
    })();
  }, []);

  const [loadError, setLoadError] = useState<unknown>(null);
  const requestRef = useRef(0);

  const loadFaq = useCallback(async () => {
    const requestId = ++requestRef.current;
    if (!faqId) {
      setLoading(false);
      return;
    }
    try {
      const res = await getFAQById(faqId);
      if (requestId !== requestRef.current) {
        return;
      }
      setFaq(res?.data || null);
      setLoadError(null);
    } catch (e) {
      if (requestId === requestRef.current) {
        console.error('Error fetching FAQ:', e);
        setLoadError(e);
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, [faqId]);

  // Refetch whenever the screen regains focus (e.g. after editing).
  useFocusEffect(
    useCallback(() => {
      loadFaq();
      return () => {
        requestRef.current += 1;
      };
    }, [loadFaq]),
  );

  const tags = (faq?.tags ?? []).filter(tag => tag.tag_name);
  const canManage = isSuperAdmin(userRoleId);

  return (
    <ScreenContainer
      title={t('faqDetail') || 'FAQ Detail'}
      loading={loading && !faq}
      // A failed focus refetch keeps the FAQ already on screen.
      error={faq ? null : loadError}
      onRetry={loadFaq}
      scroll>
      {!faq ? (
        <ListEmptyState title={t('noDataFound') || 'No data found'} />
      ) : (
        <>
          <DetailCard title={faq.question_header}>
            {tags.length > 0 && (
              <DetailRow label={t('tags') || 'Tags'} stacked>
                <View style={styles.tagsContainer}>
                  {tags.map((tag, idx) => (
                    <StatusBadge key={idx} label={tag.tag_name} tone="neutral" />
                  ))}
                </View>
              </DetailRow>
            )}
            <DetailRow
              label={t('answer') || 'Answer'}
              value={convertHtmlToText(faq.answer)}
              stacked
            />
          </DetailCard>
          {canManage && (
            <DetailActions
              itemName={faq.question_header}
              onEdit={() => navigation.navigate('EditFAQ', {faqId: faq.id})}
              onDelete={() => navigation.navigate('DeleteFAQ', {faqId: faq.id})}
            />
          )}
        </>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(6),
  },
});

export default FAQDetailScreen;
