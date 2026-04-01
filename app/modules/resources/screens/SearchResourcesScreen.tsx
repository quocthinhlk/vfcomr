import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {Header} from '../../../shared/components/Header';
import {SaveButton} from '../../../shared/components/ActionButtons';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import {COLORS} from '../../../shared/constants/colors';
import {fs, hs, ms, rs, ws} from '../../../shared/utils/scale';
import {
  getResourceCategories,
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
  const [selectedTypeIds, setSelectedTypeIds] = useState<number[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingTopic, setLoadingTopic] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
      const [resourceRes, typeRes] = await Promise.allSettled([getResources(), getResourceTypes()]);
      const errors: string[] = [];

      if (resourceRes.status === 'fulfilled') {
        setResources(resourceRes.value);
      } else {
        setResources([]);
        errors.push(`Resources: ${getErrorMessage(resourceRes.reason)}`);
      }

      if (typeRes.status === 'fulfilled') {
        setTypes(typeRes.value);
      } else {
        setTypes([]);
        errors.push(`Types: ${getErrorMessage(typeRes.reason)}`);
      }

      await loadTopics('');

      if (errors.length) {
        Alert.alert('Error', `Some data could not be loaded.\n${errors.join('\n')}`);
      }
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
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
    () =>
      resources.map(item => ({
        label: item.name,
        value: item.id,
      })),
    [resources],
  );

  const topicOptions = useMemo(
    () =>
      topics.map(item => ({
        label: item.name,
        value: item.id,
      })),
    [topics],
  );

  const leftTypes = useMemo(() => types.filter((_, index) => index % 2 === 0), [types]);
  const rightTypes = useMemo(() => types.filter((_, index) => index % 2 !== 0), [types]);

  const onToggleType = (typeId: number) => {
    setSelectedTypeIds(prev =>
      prev.includes(typeId) ? prev.filter(item => item !== typeId) : [...prev, typeId],
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

  const handleNext = async () => {
    setSubmitting(true);
    try {
      Alert.alert('Success', 'Search criteria applied.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderTypeColumn = (items: ResourceTypeItem[]) => (
    <View style={styles.typeColumn}>
      {items.map(item => {
        const selected = selectedTypeIds.includes(item.id);
        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => onToggleType(item.id)}
            activeOpacity={0.8}
            style={styles.typeRow}>
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: selected ? COLORS.mainColor : '#d1d1d1',
                  backgroundColor: selected ? COLORS.mainColor : '#fff',
                },
              ]}>
              {selected ? <Text style={styles.checkboxText}>✓</Text> : null}
            </View>
            <Text style={[styles.typeName, {color: C.textPrimary}]}>{item.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('resources') || 'Resources'} />

        {loadingInit ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.mainColor} />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Search Resources by name</Text>
              </View>
              <View style={styles.panelBody}>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, {color: C.textSecondary}]}>
                    Select the Resource you are looking for
                  </Text>
                  <ElementDropdown
                    data={resourceOptions}
                    value={selectedResourceId}
                    onChange={value => setSelectedResourceId((value as number) ?? null)}
                    placeholder="Please select..."
                    search
                    containerStyle={styles.dropdown}
                  />
                </View>
              </View>
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Search Resources by Type and or Topic</Text>
              </View>
              <View style={styles.panelBody}>
                <Text style={[styles.sectionLabel, {color: C.textSecondary}]}>
                  Select the Type of Resources you are looking for
                </Text>

                <View style={styles.typeGrid}>
                  {renderTypeColumn(leftTypes)}
                  {renderTypeColumn(rightTypes)}
                </View>

                <View style={[styles.separator, {borderTopColor: C.inputBorder}]} />

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, {color: C.textSecondary}]}>Select the Topics of interest</Text>
                  <ElementDropdown
                    data={topicOptions}
                    value={selectedTopicId}
                    onChange={value => setSelectedTopicId((value as number) ?? null)}
                    placeholder="Please select..."
                    search
                    onSearchText={onSearchTopic}
                    containerStyle={styles.dropdown}
                  />
                </View>

                <View style={styles.buttonRow}>
                  <SaveButton
                    label={submitting ? 'Loading...' : 'NEXT'}
                    onPress={handleNext}
                    disabled={submitting}
                    style={styles.nextButton}
                  />
                </View>
              </View>
            </View>

            {loadingTopic ? <Text style={[styles.loadingText, {color: C.textSecondary}]}>Loading topics...</Text> : null}
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
  panel: {
    borderWidth: 1,
    borderColor: '#d8dce3',
    backgroundColor: '#fff',
    borderRadius: rs(10),
    marginBottom: ms(14),
    overflow: 'hidden',
  },
  panelHeader: {
    minHeight: hs(42),
    borderBottomWidth: 1,
    borderBottomColor: '#e4e7ec',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(12),
    backgroundColor: '#f7f8fa',
  },
  panelTitle: {
    color: '#1f2937',
    fontSize: fs(14),
    fontWeight: '700',
  },
  panelBody: {
    paddingHorizontal: ms(12),
    paddingVertical: ms(12),
  },
  formGroup: {
    marginBottom: ms(4),
  },
  formLabel: {
    fontSize: fs(13),
    fontWeight: '600',
    marginBottom: ms(8),
  },
  dropdown: {
    backgroundColor: '#fff',
    borderColor: '#d1d1d1',
  },
  sectionLabel: {
    fontSize: fs(13),
    fontWeight: '600',
    marginBottom: ms(10),
  },
  typeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeColumn: {
    width: '48%',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: ms(12),
  },
  checkbox: {
    width: ws(20),
    height: ws(20),
    borderWidth: 1,
    borderRadius: rs(4),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ms(8),
    marginTop: ms(1),
  },
  checkboxText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: fs(11),
  },
  typeName: {
    flex: 1,
    fontSize: fs(13),
    lineHeight: fs(18),
  },
  separator: {
    marginTop: ms(4),
    marginBottom: ms(12),
    borderTopWidth: 1,
  },
  buttonRow: {
    marginTop: ms(8),
    flexDirection: 'row',
    justifyContent: 'center',
  },
  nextButton: {
    width: '100%',
    maxWidth: ws(220),
    flex: 1,
  },
  loadingText: {
    fontSize: fs(12),
    marginTop: ms(-2),
    marginBottom: ms(8),
  },
});
