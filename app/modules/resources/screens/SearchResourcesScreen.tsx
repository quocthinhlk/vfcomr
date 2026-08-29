import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {Header} from '../../../shared/components/Header';
import HelpIcon from '../../../shared/components/HelpIcon';
import {SaveButton} from '../../../shared/components/ActionButtons';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import {COLORS} from '../../../shared/constants/colors';
import {fs, ms, rs, ws} from '../../../shared/utils/scale';
import {
  getResourceCategories,
  getResourceDetail,
  getResources,
  getResourceTypes,
  ResourceCategoryItem,
  ResourceItem,
  ResourceTypeItem,
} from '../services/resource.service';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';

export default function SearchResourcesScreen() {
  const navigation = useNavigation<any>();
  const C = useThemedColors();
  const {t} = useTranslation();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [types, setTypes] = useState<ResourceTypeItem[]>([]);
  const [topics, setTopics] = useState<ResourceCategoryItem[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null);
  const [selectedTypeIds, setSelectedTypeIds] = useState<number[]>([]);
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
        errors.push(getApiErrorMessage(resourceRes.reason, t));
      }

      if (typeRes.status === 'fulfilled') {
        setTypes(typeRes.value);
      } else {
        setTypes([]);
        errors.push(getApiErrorMessage(typeRes.reason, t));
      }

      await loadTopics('');
      if (errors.length > 0) {
        setScreenError(errors[0]);
      }
    } catch (error) {
      setScreenError(getApiErrorMessage(error, t));
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

  const topicOptions = useMemo(
    () => topics.map(item => ({label: item.name, value: item.id})),
    [topics],
  );

  const typeNameById = useMemo(
    () => new Map(types.map(item => [item.id, item.name] as const)),
    [types],
  );

  const topicNameById = useMemo(
    () => new Map(topics.map(item => [item.id, item.name] as const)),
    [topics],
  );

  const groupedFilteredResults = useMemo(() => {
    if (!filteredResults) {
      return [];
    }

    const grouped = new Map<number, ResourceItem[]>();
    filteredResults.forEach(item => {
      const typeId = item.type_id ?? -1;
      const current = grouped.get(typeId) ?? [];
      current.push(item);
      grouped.set(typeId, current);
    });

    return Array.from(grouped.entries()).map(([typeId, items]) => ({
      typeId,
      title:
        (typeId !== -1 ? typeNameById.get(typeId) : undefined) ||
        t('resourceSelectTypeLabel'),
      items,
    }));
  }, [filteredResults, t, typeNameById]);

  const toggleTypeSelection = (typeId: number) => {
    setSelectedTypeIds(current =>
      current.includes(typeId)
        ? current.filter(id => id !== typeId)
        : [...current, typeId],
    );
  };

  const onSearchTopic = (keyword: string) => {
    if (topicDebounceRef.current) {
      clearTimeout(topicDebounceRef.current);
    }
    topicDebounceRef.current = setTimeout(() => {
      loadTopics(keyword.trim());
    }, 300);
  };

  const handleOpenResourceDetail = (resourceId: number) => {
    navigation.navigate('ResourceDetail', {resourceId});
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
        setSelectedTypeIds([detail.type_id]);
      } else {
        setSelectedTypeIds([]);
      }
      if (detail?.topic_id) {
        setSelectedTopicId(detail.topic_id);
      }
      handleOpenResourceDetail(resourceId);
    } catch (error) {
      setSelectedResourceDetail(null);
      setScreenError(getApiErrorMessage(error, t));
    } finally {
      setLoadingResourceDetail(false);
    }
  };

  const onSubmitSearch = async () => {
    if (selectedResourceId) {
      return;
    }

    if (selectedTypeIds.length === 0 && !selectedTopicId) {
      setScreenError(t('resourceSelectTypeOrTopic'));
      return;
    }

    try {
      setSubmitting(true);
      setScreenError('');
      const requests =
        selectedTypeIds.length > 0
          ? selectedTypeIds.map(typeId =>
              getResources({
                typeId,
                topicId: selectedTopicId,
              }),
            )
          : [
              getResources({
                topicId: selectedTopicId,
              }),
            ];

      const responses = await Promise.all(requests);
      const uniqueResults = Array.from(
        new Map(
          responses
            .flat()
            .map(item => [item.id, item] as const),
        ).values(),
      );

      setFilteredResults(uniqueResults);
    } catch (error) {
      setFilteredResults([]);
      setScreenError(getApiErrorMessage(error, t));
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
>
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
              <View style={styles.typeGrid}>
                {types.map(item => {
                  const isSelected = selectedTypeIds.includes(item.id);
                  const description = item.description?.trim();
                  return (
                    <View key={item.id} style={styles.typeItem}>
                      <TouchableOpacity
                        style={styles.typeItemCheckbox}
                        activeOpacity={0.7}
                        onPress={() => toggleTypeSelection(item.id)}>
                        <View
                          style={[
                            styles.checkbox,
                            {
                              borderColor: isSelected ? COLORS.mainColor : C.inputBorder,
                              backgroundColor: isSelected ? COLORS.mainColor : 'transparent',
                            },
                          ]}>
                          {isSelected ? <Text style={styles.checkmark}>✓</Text> : null}
                        </View>
                      </TouchableOpacity>
                      <View style={styles.typeItemLabelRow}>
                        <TouchableOpacity
                          style={styles.typeItemLabelPressable}
                          activeOpacity={0.7}
                          onPress={() => toggleTypeSelection(item.id)}>
                          <Text
                            style={[styles.typeItemLabel, {color: C.textPrimary}]}
                            numberOfLines={3}>
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                        {description ? (
                          <HelpIcon
                            title={item.name}
                            message={description}
                            size={14}
                            marginLeft={4}
                            offsetY={-1}
                          />
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>

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
                    label={t('next')}
                    onPress={() => {}}
                    disabled
                    style={styles.nextButton}
                  />
                  <Text
                    style={[styles.underDevelopmentText, {color: C.textSecondary}]}>
                    This feature is currently under development.
                  </Text>
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
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleOpenResourceDetail(selectedResourceDetail.id)}
                  style={[
                    styles.detailCard,
                    {borderColor: C.inputBorder, backgroundColor: C.background},
                  ]}>
                  {selectedResourceDetail.graphic_url ? (
                    <Image
                      source={{uri: selectedResourceDetail.graphic_url}}
                      style={styles.detailImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.detailImagePlaceholder,
                        {backgroundColor: C.inputBg, borderColor: C.inputBorder},
                      ]}>
                      <Text style={[styles.resultImagePlaceholderText, {color: C.textSecondary}]}>
                        {t('noDataFound')}
                      </Text>
                    </View>
                  )}
                  <View style={styles.detailContent}>
                    <Text style={[styles.resultTitle, {color: C.textPrimary}]}>
                      {selectedResourceDetail.name}
                    </Text>
                    <Text style={[styles.resultDescription, {color: C.textSecondary}]} numberOfLines={4}>
                      {selectedResourceDetail.short_description ||
                        selectedResourceDetail.description ||
                        t('noDataFound')}
                    </Text>
                  </View>
                </TouchableOpacity>
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
                  <View style={styles.resultsGroupWrap}>
                    {groupedFilteredResults.map(group => (
                      <View key={group.typeId} style={styles.resultGroup}>
                        <View style={styles.resultGroupHeader}>
                          <Text style={[styles.resultGroupTitle, {color: C.textPrimary}]}>
                            {group.title}
                          </Text>
                          <View style={[styles.groupCountBadge, {backgroundColor: C.bgSelectedOption}]}>
                            <Text style={[styles.groupCountText, {color: COLORS.mainColor}]}>
                              {group.items.length}
                            </Text>
                          </View>
                        </View>
                        {group.items.map(item => {
                          const topicLabel = item.topic_id
                            ? topicNameById.get(item.topic_id) ||
                              (item.topic_id === selectedTopicId
                                ? topicOptions.find(option => option.value === selectedTopicId)
                                    ?.label
                                : undefined)
                            : undefined;

                          return (
                            <TouchableOpacity
                              key={item.id}
                              activeOpacity={0.82}
                              onPress={() => handleOpenResourceDetail(item.id)}
                              style={[
                                styles.resultCard,
                                {
                                  borderColor: C.inputBorder,
                                  backgroundColor: C.background,
                                  shadowColor: '#000',
                                },
                              ]}>
                              {item.graphic_url ? (
                                <Image
                                  source={{uri: item.graphic_url}}
                                  style={styles.resultImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View
                                  style={[
                                    styles.resultImagePlaceholder,
                                    {backgroundColor: C.inputBg, borderColor: C.inputBorder},
                                  ]}>
                                  <Text
                                    style={[
                                      styles.resultImagePlaceholderText,
                                      {color: C.textSecondary},
                                    ]}>
                                    {t('resourceNoImageAvailable')}
                                  </Text>
                                </View>
                              )}

                              <View style={styles.resultContent}>
                                {topicLabel ? (
                                  <View
                                    style={[
                                      styles.resultTopicBadge,
                                      {backgroundColor: C.bgSelectedOption},
                                    ]}>
                                    <Text
                                      style={[
                                        styles.resultTopicBadgeText,
                                        {color: COLORS.mainColor},
                                      ]}
                                      numberOfLines={1}>
                                      {topicLabel}
                                    </Text>
                                  </View>
                                ) : null}

                                <Text style={[styles.resultLinkTitle, {color: C.textPrimary}]}>
                                  {item.name}
                                </Text>
                                <Text
                                  style={[styles.resultDescription, {color: C.textSecondary}]}
                                  numberOfLines={3}>
                                  {item.short_description ||
                                    item.description ||
                                    t('noDataFound')}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                  </View>
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typeItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: ms(12),
  },
  typeItemCheckbox: {
    marginRight: ms(10),
  },
  typeItemLabelRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  typeItemLabelPressable: {
    flex: 1,
  },
  checkbox: {
    width: ws(20),
    height: ws(20),
    borderRadius: rs(4),
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: ms(1),
  },
  checkmark: {
    color: '#fff',
    fontSize: fs(12),
    fontWeight: '700',
  },
  typeItemLabel: {
    flex: 1,
    fontSize: fs(13),
    lineHeight: fs(18),
  },
  buttonRow: {
    marginTop: ms(12),
    alignItems: 'center',
  },
  nextButton: {
    width: '100%',
  },
  underDevelopmentText: {
    marginTop: ms(8),
    fontSize: fs(10),
    lineHeight: fs(14),
    textAlign: 'center',
    opacity: 0.75,
  },
  errorText: {
    fontSize: fs(12),
    marginBottom: ms(12),
  },
  resultTitle: {
    fontSize: fs(14),
    fontWeight: '700',
    marginBottom: ms(6),
  },
  detailCard: {
    borderWidth: 1,
    borderRadius: rs(12),
    overflow: 'hidden',
  },
  detailImage: {
    width: '100%',
    height: ws(160),
  },
  detailImagePlaceholder: {
    width: '100%',
    height: ws(160),
    borderBottomWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    padding: ms(12),
  },
  resultsGroupWrap: {
    gap: ms(18),
  },
  resultGroup: {
    marginBottom: ms(4),
  },
  resultGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ms(10),
  },
  resultGroupTitle: {
    fontSize: fs(18),
    fontWeight: '700',
  },
  groupCountBadge: {
    minWidth: ws(28),
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
    borderRadius: rs(999),
    alignItems: 'center',
  },
  groupCountText: {
    fontSize: fs(11),
    fontWeight: '700',
  },
  resultCard: {
    borderWidth: 1,
    borderRadius: rs(12),
    padding: ms(10),
    marginBottom: ms(12),
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  resultContent: {
    flex: 1,
    minWidth: 0,
  },
  resultImage: {
    width: ws(88),
    height: ws(88),
    borderRadius: rs(10),
    marginRight: ms(12),
  },
  resultImagePlaceholder: {
    width: ws(88),
    height: ws(88),
    borderWidth: 1,
    borderRadius: rs(10),
    marginRight: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(6),
  },
  resultImagePlaceholderText: {
    fontSize: fs(11),
    fontWeight: '500',
    textAlign: 'center',
  },
  resultTopicBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
    borderRadius: rs(999),
    marginBottom: ms(8),
    maxWidth: '100%',
  },
  resultTopicBadgeText: {
    fontSize: fs(11),
    fontWeight: '700',
  },
  resultLinkTitle: {
    fontSize: fs(14),
    fontWeight: '700',
    marginBottom: ms(6),
  },
  resultDescription: {
    fontSize: fs(13),
    lineHeight: fs(18),
  },
});
