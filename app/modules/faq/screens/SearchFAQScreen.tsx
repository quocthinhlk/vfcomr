import React, {useCallback, useEffect, useState} from 'react';
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
import {EditSvgIcon} from '../../../shared/components/icons';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import api from '../../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SearchInput from '../../../shared/components/SearchInput';
import {isSuperAdmin} from '../../../shared/utils/permissions';
import {SaveButton} from '../../../shared/components/ActionButtons';
import {formStyles} from '../../../shared/styles/form';

interface LanguageOption {
  id: number;
  name: string;
}

export const SearchFAQScreen: React.FC = () => {
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
  const [selectedLanguageId, setSelectedLanguageId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageOptions, setLanguageOptions] = useState<{label: string; value: number}[]>([]);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

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
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      const params: any = {};
      if (selectedLanguageId && selectedLanguageId > 0) {
        params.language_id = selectedLanguageId;
      }
      const res = await listFAQs(params);
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
      setItems([]);
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
            <Header title={t('searchFaq') || 'Search FAQ'} />

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
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                !loading ? (
                  <Text style={[styles.empty, {color: C.textSecondary}]}>
                    {hasSearched
                      ? t('noDataFound') || 'No data found'
                      : t('enterSearchCriteria') || 'Enter search criteria and click Search'}
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
  filterContainer: {
    marginTop: ms(12),
    marginBottom: ms(8),
  },
  filterRow: {
    marginBottom: ms(12),
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

export default SearchFAQScreen;

