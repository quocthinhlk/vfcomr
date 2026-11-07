import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, FlatList, RefreshControl, StyleSheet} from 'react-native';
import {listFAQs, FAQItem} from '../services/faq.service';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useReloadOnReturn} from '../../../shared/hooks/useReloadOnReturn';
import {useFaqLanguageOptions} from '../hooks/useFaqLanguageOptions';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import {ms} from '../../../shared/utils/scale';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import api from '../../../config/api';
import SearchInput from '../../../shared/components/SearchInput';
import {isSuperAdmin} from '../../../shared/utils/permissions';
import {
  EntityListCard,
  ListEmptyState,
  ListLoadState,
  ScreenContainer,
  StatusBadge,
  listContentStyle,
} from '../../../shared/components/crud';

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
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  // Shared loader: it used to need a token saved in AsyncStorage and gave an
  // empty Language list otherwise (e.g. with the dev test token).
  const {languageOptions: langs} = useFaqLanguageOptions();
  const languageOptions = useMemo(
    () => [{label: t('all') || 'All Languages', value: 0}, ...langs],
    [langs, t],
  );

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

  // Only the newest search may write: answers arriving out of order showed
  // the results of an older search.
  const requestRef = useRef(0);
  const performSearch = useCallback(async () => {
    const requestId = ++requestRef.current;
    const isCurrent = () => requestId === requestRef.current;
    // Search needs a question text or a language (the API filters by both).
    if (!searchQuery.trim() && !selectedLanguageId) {
      setItems([]);
      setHasSearched(false);
      setLoadError(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setHasSearched(true);
      const res = await listFAQs({
        language_id: selectedLanguageId || undefined,
        question_header: searchQuery,
      });
      if (isCurrent()) {
        setItems(res?.data ?? []);
        setLoadError(null);
      }
    } catch (e) {
      if (isCurrent()) {
        console.error(e);
        setItems([]);
        // A failed search shows a recoverable error, not "No data found".
        setLoadError(e);
      }
    } finally {
      if (isCurrent()) {
        setLoading(false);
      }
    }
  }, [searchQuery, selectedLanguageId]);

  // Search as the user types or picks a language, after a short pause (as the
  // web does). Before, only a cleared field re-searched by itself.
  useEffect(() => {
    const timer = setTimeout(performSearch, 400);
    return () => clearTimeout(timer);
  }, [performSearch]);

  useEffect(
    () => () => {
      requestRef.current += 1;
    },
    [],
  );

  // Back from edit / delete: search again so the change shows.
  useReloadOnReturn(performSearch, {
    dataKey: 'faqs',
    reload: route.params?.reload,
    clearReload: () => navigation.setParams({reload: undefined}),
  });

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
        title={item.question_header?.trim() || `#${item.id}`}
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
            // The screen waits for typing to pause itself.
            debounce={false}
            placeholder={t('search') || 'Search by question...'}
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
                title={t('faqSearchHint')}
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
