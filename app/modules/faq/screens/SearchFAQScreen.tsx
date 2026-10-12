import React, {useCallback, useEffect, useState} from 'react';
import {View, FlatList, RefreshControl, StyleSheet} from 'react-native';
import {listFAQs, FAQItem} from '../services/faq.service';
import {useNavigation, useFocusEffect, useRoute} from '@react-navigation/native';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import {ms} from '../../../shared/utils/scale';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import api from '../../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SearchInput from '../../../shared/components/SearchInput';
import {isSuperAdmin} from '../../../shared/utils/permissions';
import {SaveButton} from '../../../shared/components/ActionButtons';
import {formStyles} from '../../../shared/styles/form';
import {
  EntityListCard,
  ListEmptyState,
  ListLoadState,
  ScreenContainer,
  StatusBadge,
  listContentStyle,
} from '../../../shared/components/crud';

interface LanguageOption {
  id: number;
  name: string;
}

export const SearchFAQScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useThemedColors();
  const {t} = useTranslation();
  const [items, setItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedFAQ, setSelectedFAQ] = useState<FAQItem | null>(null);
  const [selectedLanguageId, setSelectedLanguageId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageOptions, setLanguageOptions] = useState<{label: string; value: number}[]>([]);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  const loadLanguages = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const res = await api.get('/languages', {
        params: {page: 1, limit: 100, sort_by: 'name', sort_desc: false},
        headers: {Authorization: `Bearer ${token}`},
      });
      const langItems = res?.data?.data?.items || [];
      setLanguages(langItems);
      setLanguageOptions([
        {label: t('all') || 'All Languages', value: 0},
        ...langItems.map((lang: LanguageOption) => ({
          label: lang.name,
          value: lang.id,
        })),
      ]);
    } catch (e) {
      console.error('Error loading languages:', e);
    }
  }, [t]);

  useEffect(() => {
    loadLanguages();
  }, [loadLanguages]);

  // Fetch user role to check permissions
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

  const performSearch = useCallback(async () => {
    // Only search if there's a search query or language selected
    if (!searchQuery.trim() && (!selectedLanguageId || selectedLanguageId === 0)) {
      setItems([]);
      setHasSearched(false);
      setLoadError(null);
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      const res = await listFAQs({
        language_id:
          selectedLanguageId && selectedLanguageId > 0 ? selectedLanguageId : undefined,
        question_header: searchQuery,
      });
      setItems(res?.data ?? []);
      setLoadError(null);
    } catch (e) {
      console.error(e);
      setItems([]);
      // A failed search shows a recoverable error, not "No data found".
      setLoadError(e);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedLanguageId]);

  // Auto search when search query is cleared (becomes empty)
  useEffect(() => {
    // Only auto-search if user has already searched before (hasSearched is true)
    // and search query becomes empty, but language is still selected
    if (hasSearched && !searchQuery.trim() && selectedLanguageId && selectedLanguageId > 0) {
      const timeoutId = setTimeout(() => {
        performSearch();
      }, 300); // Debounce 300ms
      return () => clearTimeout(timeoutId);
    }
    // If search query is empty and no language selected, clear results
    else if (hasSearched && !searchQuery.trim() && (!selectedLanguageId || selectedLanguageId === 0)) {
      setItems([]);
      setHasSearched(false);
      setLoadError(null);
    }
  }, [searchQuery, hasSearched, selectedLanguageId, performSearch]);

  useFocusEffect(
    useCallback(() => {
      const shouldReload = route.params?.reload;
      if (shouldReload) {
        navigation.setParams({reload: undefined});
        performSearch();
      }
    }, [route.params?.reload, performSearch]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await performSearch();
    setRefreshing(false);
  };

  const handleView = (item: FAQItem) => {
    navigation.navigate('FAQDetail', {faqId: item.id});
  };

  const canManage = isSuperAdmin(userRoleId);

  const openActions = (item: FAQItem) => {
    setSelectedFAQ(item);
    setActionsVisible(true);
  };

  const renderItem = ({item}: {item: FAQItem}) => {
    const tags = (item.tags ?? []).filter(tag => tag.tag_name);
    return (
      <EntityListCard
        title={item.question_header}
        trailingText={`#${item.id}`}
        onPress={() => handleView(item)}
        // Edit / delete are super-admin only, so the sheet is too.
        onMorePress={canManage ? () => openActions(item) : undefined}>
        {tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {tags.map((tag, idx) => (
              <StatusBadge key={idx} label={tag.tag_name} tone="neutral" />
            ))}
          </View>
        )}
      </EntityListCard>
    );
  };

  const keyExtractor = (item: FAQItem) => String(item.id);

  const isInitialLoading = loading && items.length === 0 && !refreshing;

  return (
    <ScreenContainer title={t('searchFaq') || 'Search FAQ'} showMenu>
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <SearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('search') || 'Search by question...'}
            onSubmitEditing={performSearch}
          />
        </View>
        <View style={styles.filterRow}>
          <ElementDropdown
            data={languageOptions}
            value={selectedLanguageId === null ? 0 : selectedLanguageId}
            onChange={v => {
              const val = v as number;
              setSelectedLanguageId(val === 0 ? null : val);
            }}
            placeholder={t('selectLanguage') || 'Select Language'}
            containerStyle={
              {
                backgroundColor: C.inputBg,
                borderColor: C.inputBorder,
              } as any
            }
          />
        </View>
        <View style={formStyles.buttonRow}>
          <SaveButton
            label={t('search') || 'Search'}
            onPress={performSearch}
            disabled={loading}
          />
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={listContentStyle}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          isInitialLoading ? (
            <ListLoadState loading />
          ) : !loading ? (
            hasSearched ? (
              <ListLoadState error={loadError} onRetry={performSearch}>
                <ListEmptyState title={t('noDataFound') || 'No data found'} />
              </ListLoadState>
            ) : (
              <ListEmptyState
                title={
                  t('enterSearchCriteria') ||
                  'Enter search criteria and click Search'
                }
              />
            )
          ) : null
        }
      />

      <ActionSheetModal
        visible={actionsVisible}
        title={selectedFAQ?.question_header || t('faq') || 'FAQ'}
        onRequestClose={() => {
          setActionsVisible(false);
          setSelectedFAQ(null);
        }}
        actions={((): ActionItem[] => {
          const list: ActionItem[] = [];
          list.push({
            label: t('view') || 'View',
            icon: 'view',
            onPress: () => {
              if (selectedFAQ) {
                navigation.navigate('FAQDetail', {faqId: selectedFAQ.id});
              }
              setActionsVisible(false);
              setSelectedFAQ(null);
            },
          });
          // Only show edit and delete for admin
          if (canManage) {
            list.push({
              label: t('edit') || 'Edit',
              icon: 'edit',
              onPress: () => {
                if (selectedFAQ) {
                  navigation.navigate('EditFAQ', {faqId: selectedFAQ.id});
                }
                setActionsVisible(false);
                setSelectedFAQ(null);
              },
            });
            list.push({
              label: t('delete') || 'Delete',
              icon: 'delete',
              type: 'danger',
              onPress: () => {
                if (selectedFAQ) {
                  navigation.navigate('DeleteFAQ', {faqId: selectedFAQ.id});
                }
                setActionsVisible(false);
                setSelectedFAQ(null);
              },
            });
          }
          return list;
        })()}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  filterContainer: {
    marginTop: ms(4),
    marginBottom: ms(8),
  },
  filterRow: {
    marginBottom: ms(12),
  },
  list: {
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(6),
  },
});

export default SearchFAQScreen;
