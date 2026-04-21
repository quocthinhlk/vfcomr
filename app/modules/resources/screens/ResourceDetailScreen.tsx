import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute} from '@react-navigation/native';
import {Text} from '@ui-kitten/components';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, hs, ms, rs, ws} from '../../../shared/utils/scale';
import {
  getResourceCategories,
  getResourceDetail,
  getResourceFileFormats,
  getResourceTypes,
  ResourceFileItem,
  ResourceItem,
} from '../services/resource.service';
import {getLanguageById} from '../../language/services/language.service';

const RESOURCE_HOST = 'http://34.126.158.119';

const formatReferenceDate = (dateString?: string) => {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const resolveFileUrl = (file: ResourceFileItem) => {
  const rawUrl = file.url?.trim() || file.path?.trim() || '';
  if (!rawUrl) {
    return '';
  }
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }
  return `${RESOURCE_HOST}/${rawUrl.replace(/^\/+/, '')}`;
};

const getFileExtension = (filename?: string) => {
  if (!filename || !filename.includes('.')) {
    return 'FILE';
  }
  return filename.split('.').pop()?.toUpperCase() || 'FILE';
};

export default function ResourceDetailScreen() {
  const route = useRoute<any>();
  const resourceId: number | undefined = route.params?.resourceId;
  const {t} = useTranslation();
  const C = useThemedColors();

  const [resource, setResource] = useState<ResourceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeName, setTypeName] = useState('');
  const [topicName, setTopicName] = useState('');
  const [languageName, setLanguageName] = useState('');
  const [formatNameById, setFormatNameById] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!resourceId) {
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const detail = await getResourceDetail(resourceId);
        if (!mounted) {
          return;
        }

        setResource(detail);

        if (!detail) {
          return;
        }

        const [typesRes, topicsRes, formatsRes, languageRes] = await Promise.allSettled([
          getResourceTypes(),
          getResourceCategories({page: 1, limit: 200, name: ''}),
          getResourceFileFormats(),
          detail.language_id ? getLanguageById(detail.language_id) : Promise.resolve(null),
        ]);

        if (!mounted) {
          return;
        }

        if (typesRes.status === 'fulfilled' && detail.type_id) {
          const matchedType = typesRes.value.find(item => item.id === detail.type_id);
          setTypeName(matchedType?.name || '');
        }

        if (topicsRes.status === 'fulfilled' && detail.topic_id) {
          const matchedTopic = topicsRes.value.find(item => item.id === detail.topic_id);
          setTopicName(matchedTopic?.name || '');
        }

        if (
          languageRes.status === 'fulfilled' &&
          languageRes.value &&
          (languageRes.value as any).data?.name
        ) {
          setLanguageName((languageRes.value as any).data.name);
        }

        if (formatsRes.status === 'fulfilled') {
          setFormatNameById(
            new Map(formatsRes.value.map(item => [item.id, item.name] as const)),
          );
        }
      } catch {
        if (mounted) {
          setResource(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [resourceId]);

  const metaItems = useMemo(
    () =>
      [
        typeName ? `${t('type') || 'Type'}: ${typeName}` : '',
        topicName ? `${t('topic') || 'Topic'}: ${topicName}` : '',
        languageName ? `${t('language') || 'Language'}: ${languageName}` : '',
        resource?.reference_date
          ? `${t('date') || 'Date'}: ${formatReferenceDate(resource.reference_date)}`
          : '',
      ].filter(Boolean),
    [languageName, resource?.reference_date, t, topicName, typeName],
  );

  const handleOpenUrl = (url: string) => {
    if (!url) {
      return;
    }
    Linking.openURL(url).catch(() => {});
  };

  const renderFileCard = (file: ResourceFileItem) => {
    const fileUrl = resolveFileUrl(file);
    const fileTag = formatNameById.get(file.format_id || 0) || getFileExtension(file.filename);
    const isOpenable = Boolean(fileUrl);

    return (
      <TouchableOpacity
        key={file.id}
        style={[
          styles.fileCard,
          {
            backgroundColor: C.background,
            borderColor: C.inputBorder,
            opacity: isOpenable ? 1 : 0.8,
          },
        ]}
        activeOpacity={isOpenable ? 0.75 : 1}
        disabled={!isOpenable}
        onPress={() => handleOpenUrl(fileUrl)}>
        <View style={[styles.fileBadge, {backgroundColor: C.bgSelectedOption}]}>
          <Text style={[styles.fileBadgeText, {color: '#2f6fcd'}]}>{fileTag}</Text>
        </View>
        <Text style={[styles.fileName, {color: C.textPrimary}]} numberOfLines={2}>
          {file.filename}
        </Text>
        <Text style={[styles.fileActionText, {color: isOpenable ? '#2f6fcd' : C.textSecondary}]}>
          {isOpenable ? t('open') : t('noDataFound')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.screen, {backgroundColor: C.background}]}>
        <Header title={t('resourceDetailTitle')} showMenu={false} />

        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="small" color="#2f6fcd" />
            <Text style={[styles.loadingText, {color: C.textSecondary}]}>
              {t('loading')}...
            </Text>
          </View>
        ) : !resource ? (
          <View style={styles.centerWrap}>
            <Text style={[styles.loadingText, {color: C.textSecondary}]}>
              {t('noDataFound')}
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: C.surface,
                  borderColor: C.inputBorder,
                  shadowColor: '#000',
                },
              ]}>
              {resource.graphic_url ? (
                <Image
                  source={{uri: resource.graphic_url}}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.heroImagePlaceholder,
                    {backgroundColor: C.inputBg, borderColor: C.inputBorder},
                  ]}>
                  <Text style={[styles.placeholderText, {color: C.textSecondary}]}>
                    {t('resourceNoImageAvailable')}
                  </Text>
                </View>
              )}

              <View style={styles.heroContent}>
                <Text style={[styles.resourceTitle, {color: C.textPrimary}]}>
                  {resource.name}
                </Text>
                {resource.author_name ? (
                  <Text style={[styles.authorLine, {color: C.textSecondary}]}>
                    {t('author')}: {resource.author_name}
                  </Text>
                ) : null}

                {resource.short_description ? (
                  <Text style={[styles.shortDescription, {color: '#2f6fcd'}]}>
                    {resource.short_description}
                  </Text>
                ) : null}

                <Text style={[styles.descriptionText, {color: C.textPrimary}]}>
                  {resource.description || t('noDataFound')}
                </Text>

                {metaItems.length > 0 ? (
                  <View style={styles.metaWrap}>
                    {metaItems.map(item => (
                      <View
                        key={item}
                        style={[styles.metaChip, {backgroundColor: C.bgSelectedOption}]}>
                        <Text style={[styles.metaChipText, {color: C.textPrimary}]}>
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>

            {resource.resource_files && resource.resource_files.length > 0 ? (
              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.inputBorder,
                    shadowColor: '#000',
                  },
                ]}>
                <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
                  {t('attachments')}
                </Text>
                <View style={styles.filesWrap}>
                  {resource.resource_files.map(renderFileCard)}
                </View>
              </View>
            ) : null}

            {resource.more_information ? (
              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.inputBorder,
                    shadowColor: '#000',
                  },
                ]}>
                <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
                  {t('description')}
                </Text>
                <Text style={[styles.descriptionText, {color: C.textPrimary}]}>
                  {resource.more_information}
                </Text>
              </View>
            ) : null}

            {resource.author_name || resource.author_pic ? (
              <View
                style={[
                  styles.authorCard,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.inputBorder,
                    shadowColor: '#000',
                  },
                ]}>
                {resource.author_pic ? (
                  <Image
                    source={{uri: resource.author_pic}}
                    style={styles.authorImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.authorImagePlaceholder,
                      {backgroundColor: C.inputBg, borderColor: C.inputBorder},
                    ]}>
                    <Text style={[styles.placeholderText, {color: C.textSecondary}]}>
                      {t('author')}
                    </Text>
                  </View>
                )}

                <View style={styles.authorContent}>
                  <Text style={[styles.authorLabel, {color: '#2f6fcd'}]}>
                    {t('author')}
                  </Text>
                  <Text style={[styles.authorName, {color: C.textPrimary}]}>
                    {resource.author_name || '-'}
                  </Text>
                </View>
              </View>
            ) : null}

            {resource.resource_weblinks && resource.resource_weblinks.length > 0 ? (
              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.inputBorder,
                    shadowColor: '#000',
                  },
                ]}>
                <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
                  {t('links')}
                </Text>
                {resource.resource_weblinks.map(link => (
                  <TouchableOpacity
                    key={link.id}
                    style={[styles.linkRow, {borderColor: C.inputBorder}]}
                    activeOpacity={0.75}
                    onPress={() => handleOpenUrl(link.url || '')}>
                    <Text style={[styles.linkText, {color: '#2f6fcd'}]}>
                      {link.title || link.url || '-'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: ms(12),
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: ms(10),
    fontSize: fs(14),
  },
  scrollContent: {
    paddingTop: ms(8),
    paddingBottom: ms(24),
    gap: ms(12),
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: rs(14),
    overflow: 'hidden',
    shadowOpacity: 0.08,
    shadowRadius: rs(8),
    shadowOffset: {width: 0, height: hs(3)},
    elevation: 2,
  },
  heroImage: {
    width: '100%',
    height: ws(190),
  },
  heroImagePlaceholder: {
    width: '100%',
    height: ws(190),
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: fs(12),
    fontWeight: '500',
  },
  heroContent: {
    padding: ms(14),
  },
  resourceTitle: {
    fontSize: fs(20),
    fontWeight: '700',
    lineHeight: fs(28),
    marginBottom: ms(6),
  },
  authorLine: {
    fontSize: fs(13),
    marginBottom: ms(8),
  },
  shortDescription: {
    fontSize: fs(14),
    fontWeight: '600',
    lineHeight: fs(20),
    marginBottom: ms(10),
  },
  descriptionText: {
    fontSize: fs(14),
    lineHeight: fs(22),
  },
  metaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(8),
    marginTop: ms(14),
  },
  metaChip: {
    borderRadius: rs(999),
    paddingHorizontal: ms(10),
    paddingVertical: ms(6),
  },
  metaChipText: {
    fontSize: fs(12),
    fontWeight: '500',
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: rs(14),
    padding: ms(14),
    shadowOpacity: 0.08,
    shadowRadius: rs(8),
    shadowOffset: {width: 0, height: hs(3)},
    elevation: 2,
  },
  sectionTitle: {
    fontSize: fs(16),
    fontWeight: '700',
    marginBottom: ms(12),
  },
  filesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: ms(10),
  },
  fileCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: rs(12),
    padding: ms(12),
    minHeight: ws(130),
  },
  fileBadge: {
    alignSelf: 'flex-start',
    borderRadius: rs(8),
    paddingHorizontal: ms(8),
    paddingVertical: ms(6),
    marginBottom: ms(10),
  },
  fileBadgeText: {
    fontSize: fs(12),
    fontWeight: '700',
  },
  fileName: {
    fontSize: fs(13),
    lineHeight: fs(18),
    fontWeight: '600',
    marginBottom: ms(10),
  },
  fileActionText: {
    marginTop: 'auto',
    fontSize: fs(12),
    fontWeight: '600',
  },
  authorCard: {
    borderWidth: 1,
    borderRadius: rs(14),
    padding: ms(14),
    flexDirection: 'row',
    alignItems: 'center',
    shadowOpacity: 0.08,
    shadowRadius: rs(8),
    shadowOffset: {width: 0, height: hs(3)},
    elevation: 2,
  },
  authorImage: {
    width: ws(92),
    height: ws(92),
    borderRadius: rs(12),
    marginRight: ms(14),
  },
  authorImagePlaceholder: {
    width: ws(92),
    height: ws(92),
    borderRadius: rs(12),
    borderWidth: 1,
    marginRight: ms(14),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(6),
  },
  authorContent: {
    flex: 1,
  },
  authorLabel: {
    fontSize: fs(13),
    fontWeight: '700',
    marginBottom: ms(6),
  },
  authorName: {
    fontSize: fs(18),
    fontWeight: '600',
    lineHeight: fs(24),
  },
  linkRow: {
    borderTopWidth: 1,
    paddingVertical: ms(12),
  },
  linkText: {
    fontSize: fs(14),
    fontWeight: '600',
  },
});
