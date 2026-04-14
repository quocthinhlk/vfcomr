import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {Header} from '../../../shared/components/Header';
import {SaveButton} from '../../../shared/components/ActionButtons';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import {COLORS} from '../../../shared/constants/colors';
import {fs, ms, rs} from '../../../shared/utils/scale';
import {
  getResourceCategories,
  getResourceDetail,
  getResources,
  getResourceTypes,
  ResourceCategoryItem,
  ResourceItem,
  ResourceTypeItem,
} from '../services/resource.service';

const getErrorMessage = (error: any): string => {
  const status = error?.response?.status;
  const apiMessage = error?.response?.data?.message;
  if (status && apiMessage) return `(${status}) ${apiMessage}`;
  if (status) return `Request failed with status ${status}`;
  if (apiMessage) return String(apiMessage);
  return error?.message || 'Unknown error';
};

export default function SearchResourcesScreen() {
  const C = useThemedColors();
  const {t} = useTranslation();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [types, setTypes] = useState<ResourceTypeItem[]>([]);
  const [topics, setTopics] = useState<ResourceCategoryItem[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [selectedResourceDetail, setSelectedResourceDetail] =
    useState<ResourceItem | null>(null);
  const [filteredResults, setFilteredResults] = useState<ResourceItem[] | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingTopic, setLoadingTopic] = useState(false);
  const [loadingResourceDetail, setLoadingResourceDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [screenError, setScreenError] = useState<string>('');
  const topicDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTopics = useCallback(async (keyword?: string) => {
    try {
      setLoadingTopic(true);
      const data = await getResourceCategories({
        page: 1,
        limit: 10,
        name: keyword ?? '',
      });
      setTopics(data);
    } catch {
      setTopics([]);
    } finally {
      setLoadingTopic(false);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      setLoadingInit(true);
      setScreenError('');
      const errors: string[] = [];
      const [resourceRes, typeRes] = await Promise.allSettled([
        getResources(),
        getResourceTypes(),
      ]);

      if (resourceRes.status === 'fulfilled') {
        setResources(resourceRes.value);
      } else {
        setResources([]);
        errors.push(getErrorMessage(resourceRes.reason));
      }

      if (typeRes.status === 'fulfilled') {
        setTypes(typeRes.value);
      } else {
        setTypes([]);
        errors.push(getErrorMessage(typeRes.reason));
      }

      await loadTopics('');
      if (errors.length > 0) {
        setScreenError(errors[0]);
      }
    } catch (error) {
      setScreenError(getErrorMessage(error));
    } finally {
      setLoadingInit(false);
    }
  }, [loadTopics]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    return () => {
      if (topicDebounceRef.current) {
        clearTimeout(topicDebounceRef.current);
      }
    };
  }, []);

  const resourceOptions = useMemo(
    () => resources.map(item => ({label: item.name, value: item.id})),
    [resources],
  );

  const typeOptions = useMemo(
    () => types.map(item => ({label: item.name, value: item.id})),
    [types],
  );

  const topicOptions = useMemo(
    () => topics.map(item => ({label: item.name, value: item.id})),
    [topics],
  );

  const onSearchTopic = (keyword: string) => {
    if (topicDebounceRef.current) {
      clearTimeout(topicDebounceRef.current);
    }
    topicDebounceRef.current = setTimeout(() => {
      loadTopics(keyword.trim());
    }, 300);
  };

  const onSelectResource = async (value: string | number | null) => {
    const resourceId = typeof value === 'number' ? value : null;
    setSelectedResourceId(resourceId);
    setFilteredResults(null);
    setScreenError('');

    if (!resourceId) {
      setSelectedResourceDetail(null);
      return;
    }

    try {
      setLoadingResourceDetail(true);
      const detail = await getResourceDetail(resourceId);
      setSelectedResourceDetail(detail);
      if (detail?.type_id) {
        setSelectedTypeId(detail.type_id);
      }
      if (detail?.topic_id) {
        setSelectedTopicId(detail.topic_id);
      }
    } catch (error) {
      setSelectedResourceDetail(null);
      setScreenError(getErrorMessage(error));
    } finally {
      setLoadingResourceDetail(false);
    }
  };

  const onSubmitSearch = async () => {
    if (selectedResourceId) {
      return;
    }

    if (!selectedTypeId && !selectedTopicId) {
      setScreenError(t('resourceSelectTypeOrTopic'));
      return;
    }

    try {
      setSubmitting(true);
      setScreenError('');
      const data = await getResources({
        typeId: selectedTypeId,
        topicId: selectedTopicId,
      });
      setFilteredResults(data);
    } catch (error) {
      setFilteredResults([]);
      setScreenError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('resources') || 'Resources'} />

        {loadingInit ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={COLORS.mainColor} />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={[styles.card, {backgroundColor: C.surface, borderColor: C.inputBorder}]}>
              <Text style={[styles.cardTitle, {color: C.textPrimary}]}>
                {t('resourceSearchByName')}
              </Text>
              <Text style={[styles.fieldLabel, {color: C.textSecondary}]}>
                {t('resourceSelectResourceLabel')}
              </Text>
              <ElementDropdown
                data={resourceOptions}
                value={selectedResourceId}
                onChange={onSelectResource}
                placeholder={t('resourcePlaceholderSelect')}
                search
              />
              {loadingResourceDetail ? (
                <Text style={[styles.helperText, {color: C.textSecondary}]}>
                  {t('loading')}...
                </Text>
              ) : null}
            </View>

            <View style={[styles.card, {backgroundColor: C.surface, borderColor: C.inputBorder}]}>
              <Text style={[styles.cardTitle, {color: C.textPrimary}]}>
                {t('resourceSearchByTypeOrTopic')}
              </Text>

              <Text style={[styles.fieldLabel, {color: C.textSecondary}]}>
                {t('resourceSelectTypeLabel')}
              </Text>
              <ElementDropdown
                data={typeOptions}
                value={selectedTypeId}
                onChange={value => setSelectedTypeId((value as number) ?? null)}
                placeholder={t('resourcePlaceholderSelect')}
                search
              />

              <Text style={[styles.fieldLabel, styles.spacingTop, {color: C.textSecondary}]}>
                {t('resourceSelectTopicLabel')}
              </Text>
              <ElementDropdown
                data={topicOptions}
                value={selectedTopicId}
                onChange={value => setSelectedTopicId((value as number) ?? null)}
                placeholder={t('resourcePlaceholderSelect')}
                search
                onSearchText={onSearchTopic}
              />
              {loadingTopic ? (
                <Text style={[styles.helperText, {color: C.textSecondary}]}>
                  {t('loading')}...
                </Text>
              ) : null}

              {!selectedResourceId ? (
                <View style={styles.buttonRow}>
                  <SaveButton
                    label={submitting ? `${t('loading')}...` : t('next')}
                    onPress={onSubmitSearch}
                    disabled={submitting}
                    style={styles.nextButton}
                  />
                </View>
              ) : null}
            </View>

            {screenError ? (
              <Text style={[styles.errorText, {color: C.error || '#ff4444'}]}>
                {screenError}
              </Text>
            ) : null}

            {selectedResourceDetail ? (
              <View style={[styles.card, {backgroundColor: C.surface, borderColor: C.inputBorder}]}>
                <Text style={[styles.cardTitle, {color: C.textPrimary}]}>
                  {t('resourceDetailTitle')}
                </Text>
                <Text style={[styles.resultTitle, {color: C.textPrimary}]}>
                  {selectedResourceDetail.name}
                </Text>
                <Text style={[styles.resultDescription, {color: C.textSecondary}]}>
                  {selectedResourceDetail.short_description ||
                    selectedResourceDetail.description ||
                    t('noDataFound')}
                </Text>
              </View>
            ) : null}

            {filteredResults ? (
              <View style={[styles.card, {backgroundColor: C.surface, borderColor: C.inputBorder}]}>
                <Text style={[styles.cardTitle, {color: C.textPrimary}]}>
                  {t('resourceFilteredResults')}
                </Text>
                {filteredResults.length === 0 ? (
                  <Text style={[styles.resultDescription, {color: C.textSecondary}]}>
                    {t('resourceNoResults')}
                  </Text>
                ) : (
                  filteredResults.map(item => (
                    <Text key={item.id} style={[styles.resultItem, {color: C.textPrimary}]}>
                      {`\u2022 ${item.name}`}
                    </Text>
                  ))
                )}
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: ms(12),
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: ms(8),
    paddingBottom: ms(20),
  },
  card: {
    borderWidth: 1,
    borderRadius: rs(10),
    paddingHorizontal: ms(12),
    paddingVertical: ms(12),
    marginBottom: ms(12),
  },
  cardTitle: {
    fontSize: fs(14),
    fontWeight: '700',
    marginBottom: ms(10),
  },
  fieldLabel: {
    fontSize: fs(13),
    fontWeight: '600',
    marginBottom: ms(8),
  },
  spacingTop: {
    marginTop: ms(12),
  },
  helperText: {
    fontSize: fs(12),
    marginTop: ms(6),
  },
  buttonRow: {
    marginTop: ms(12),
    flexDirection: 'row',
    justifyContent: 'center',
  },
  nextButton: {
    width: '100%',
  },
  errorText: {
    fontSize: fs(12),
    marginBottom: ms(12),
  },
  resultTitle: {
    fontSize: fs(14),
    fontWeight: '600',
    marginBottom: ms(6),
  },
  resultDescription: {
    fontSize: fs(13),
    lineHeight: fs(18),
  },
  resultItem: {
    fontSize: fs(13),
    lineHeight: fs(20),
    marginBottom: ms(4),
  },
});
