import React, {useCallback, useEffect, useState, useMemo} from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {Header} from '../../../shared/components/Header';
import {COLORS} from '../../../shared/constants/colors';
import {globalStyles} from '../../../shared/styles/global';
import {listFAQs, FAQItem} from '../services/faq.service';
import {useNavigation, useFocusEffect, useRoute} from '@react-navigation/native';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {getListStyles} from '../../../shared/styles/list';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import {fs, ws, ms, rs, hs} from '../../../shared/utils/scale';
import AddNewHeaderButton from '../../../shared/components/AddNewHeaderButton';
import {EditSvgIcon} from '../../../shared/components/icons';
import api from '../../../config/api';
import SearchInput from '../../../shared/components/SearchInput';
import {isSuperAdmin} from '../../../shared/utils/permissions';

export const FAQsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const L = getListStyles(C, theme);
  const {t} = useTranslation();
  const [items, setItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [loading, searchQuery],
  );

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

  const handleEdit = (item: FAQItem) => {
    navigation.navigate('EditFAQ', {faqId: item.id});
  };

  const handleDelete = (item: FAQItem) => {
    navigation.navigate('DeleteFAQ', {faqId: item.id});
  };

  const renderItem = ({item}: {item: FAQItem}) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => handleView(item)}
      onLongPress={() => {
        setSelectedFAQ(item);
        setActionsVisible(true);
      }}
      delayLongPress={300}>
      <View style={L.itemCard as any}>
        <View style={L.itemRow as any}>
          <View style={styles.itemCol}>
            <Text style={[styles.name, {color: C.textPrimary}]}>
              {item.question_header}
            </Text>
            {item.tags && item.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {item.tags.filter(tag => tag.tag_name).map((tag, idx) => (
                  <View key={idx} style={[styles.tag, {backgroundColor: C.border}]}>
                    <Text style={[styles.tagText, {color: C.textSecondary}]}>
                      {tag.tag_name}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          {isSuperAdmin(userRoleId) && (
            <View style={styles.itemColRight}>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.editBtn]}
                  onPress={() => handleEdit(item)}>
                  <EditSvgIcon width={fs(15)} height={fs(15)} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const keyExtractor = (item: FAQItem) => String(item.id);

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? hs(64) : 0}
        style={{flex: 1}}>
        <View style={{flex: 1, backgroundColor: C.background}}>
          <View style={[styles.container, {backgroundColor: C.background}]}>
            <Header title={t('faq') || 'FAQ'} />

            {isSuperAdmin(userRoleId) && (
              <View style={styles.headerRow}>
                <AddNewHeaderButton name="AddFAQ" text={t('addNew') || 'Add New'} />
              </View>
            )}

            <View style={styles.filterRow}>
              <SearchInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('search') || 'Search by question...'}
              />
            </View>

            <FlatList
              data={items}
              keyExtractor={keyExtractor}
              renderItem={renderItem}

              keyboardShouldPersistTaps="handled"
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                !loading ? (
                  <Text style={[styles.empty, {color: C.textSecondary}]}>
                    {t('noDataFound') || 'No data found'}
                  </Text>
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
                onPress: () => {
                  if (selectedFAQ) {
                    navigation.navigate('FAQDetail', {faqId: selectedFAQ.id});
                  }
                  setActionsVisible(false);
                  setSelectedFAQ(null);
                },
              });
              // Only show edit and delete for admin
              if (isSuperAdmin(userRoleId)) {
                list.push({
                  label: t('edit') || 'Edit',
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
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: ms(16),
    paddingRight: ms(16),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: ms(8),
  },
  filterRow: {
    marginTop: ms(12),
    marginBottom: ms(8),
  },
  itemCol: {
    flex: 1,
    paddingRight: ms(8),
  },
  itemColRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: ms(8),
    width: ws(72),
  },
  name: {
    fontSize: fs(14),
    fontWeight: '600',
    marginBottom: ms(4),
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(4),
    marginTop: ms(4),
  },
  tag: {
    paddingHorizontal: ms(6),
    paddingVertical: ms(2),
    borderRadius: rs(4),
  },
  tagText: {
    fontSize: fs(10),
  },
  empty: {
    textAlign: 'center',
    marginTop: ms(40),
  },
  actionRow: {
    flexDirection: 'row',
    gap: ms(6),
  },
  actionBtn: {
    width: ws(25),
    height: ws(25),
    borderRadius: rs(4),
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: COLORS.successColor,
  },
});

export default FAQsScreen;

