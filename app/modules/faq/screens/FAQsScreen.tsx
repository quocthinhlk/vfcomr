import React, {useCallback, useEffect, useState} from 'react';
import {View, FlatList, RefreshControl, StyleSheet} from 'react-native';
import {listFAQs, FAQItem} from '../services/faq.service';
import {useNavigation, useFocusEffect, useRoute} from '@react-navigation/native';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import api from '../../../config/api';
import SearchInput from '../../../shared/components/SearchInput';
import {isSuperAdmin} from '../../../shared/utils/permissions';
import {
  EntityListCard,
  ListEmptyState,
  ListLoadState,
  ListToolbar,
  ScreenContainer,
  StatusBadge,
  listContentStyle,
} from '../../../shared/components/crud';
import {ms} from '../../../shared/utils/scale';

export const FAQsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const [items, setItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedFAQ, setSelectedFAQ] = useState<FAQItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userRoleId, setUserRoleId] = useState<number | null>(null);

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

  const fetchData = useCallback(
    async (reset = false) => {
      try {
        if (loading) {
          return;
        }
        setLoading(true);
        const res = await listFAQs({});
        const allFaqs = res?.data ?? [];

        // Filter by search query (question_header) client-side
        const filteredFaqs = searchQuery.trim()
          ? allFaqs.filter(faq =>
              faq.question_header
                ?.toLowerCase()
                .includes(searchQuery.trim().toLowerCase())
            )
          : allFaqs;

        setItems(filteredFaqs);
        setLoadError(null);
      } catch (e) {
        console.error(e);
        setLoadError(e);
      } finally {
        setLoading(false);
      }
    },
    [loading, searchQuery],
  );

  const reload = useCallback(() => fetchData(true), [fetchData]);

  useEffect(() => {
    fetchData(true);
  }, [searchQuery]);

  useFocusEffect(
    useCallback(() => {
      const shouldReload = route.params?.reload;
      if (shouldReload) {
        navigation.setParams({reload: undefined});
        fetchData(true);
      }
    }, [route.params?.reload, fetchData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(true);
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
    <ScreenContainer title={t('faq') || 'FAQ'} showMenu>
      <ListToolbar
        countText={
          loadError && items.length === 0
            ? undefined
            : `${items.length} ${(t('faq') || 'FAQ')}`
        }
        addRoute={canManage ? 'AddFAQ' : undefined}
      />

      <SearchInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t('search') || 'Search by question...'}
      />

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
          isInitialLoading || !loading ? (
            <ListLoadState
              loading={isInitialLoading}
              error={loadError}
              onRetry={reload}>
              <ListEmptyState
                title={t('noDataFound') || 'No data found'}
                hint={searchQuery || !canManage ? undefined : t('emptyListHint')}
              />
            </ListLoadState>
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
  list: {
    flex: 1,
    marginTop: ms(8),
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(6),
  },
});

export default FAQsScreen;
