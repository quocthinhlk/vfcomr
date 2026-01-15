import React, {useState, useEffect, useMemo, useCallback} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {formStyles} from '../../../shared/styles/form';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useLanguage} from '../../../shared/context/LanguageContext';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ws, hs, ms, rs} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import {getWeekNumbers} from '../services/monthlydata.service';
import api from '../../../config/api';
import {SaveButton} from '../../../shared/components/ActionButtons';

const MONTHS = [
  {label: 'January', value: 1},
  {label: 'February', value: 2},
  {label: 'March', value: 3},
  {label: 'April', value: 4},
  {label: 'May', value: 5},
  {label: 'June', value: 6},
  {label: 'July', value: 7},
  {label: 'August', value: 8},
  {label: 'September', value: 9},
  {label: 'October', value: 10},
  {label: 'November', value: 11},
  {label: 'December', value: 12},
];

// Helper function to get week date range
const getWeekDateRange = (year: number, weekNumber: number): string => {
  // Simple calculation - in a real app, you might want to use a library like date-fns
  const jan1 = new Date(year, 0, 1);
  const daysOffset = (weekNumber - 1) * 7;
  const weekStart = new Date(jan1.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    return `${day} ${month}`;
  };
  
  return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
};

export default function MonthlyDataSelectScreen() {
  const navigation = useNavigation<any>();
  const {t, selectedLanguage} = useTranslation();
  const {selectedLanguage: langCode} = useLanguage();
  const C = useThemedColors();
  
  const [churchId, setChurchId] = useState<number | null>(null);
  const [churchName, setChurchName] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [weekInfos, setWeekInfos] = useState<Array<{week_number: number; is_reported: boolean}>>([]);
  const [selectedWeeks, setSelectedWeeks] = useState<Set<number>>(new Set());
  const [loadingWeeks, setLoadingWeeks] = useState(false);
  const [loading, setLoading] = useState(true);

  // Generate years from current year to 1900
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({length: currentYear - 1899}, (_, i) => ({
      label: String(currentYear - i),
      value: currentYear - i,
    }));
  }, []);

  // Get month labels based on language
  const monthLabels = useMemo(() => {
    const localeMap: Record<string, string> = {
      en: 'en-US',
      pt: 'pt-PT',
      es: 'es-ES',
      fr: 'fr-FR',
      zh: 'zh-CN',
      ms: 'ms-MY',
      ja: 'ja-JP',
    };
    const locale = localeMap[langCode as string] || 'en-US';
    
    return MONTHS.map(month => {
      const date = new Date(2000, month.value - 1, 1);
      const label = date.toLocaleDateString(locale, {month: 'long'});
      return {label: label.charAt(0).toUpperCase() + label.slice(1), value: month.value};
    });
  }, [langCode]);

  // Load church info
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
        if (!savedChurchId) {
          Alert.alert(t('error') || 'Error', t('churchIdNotFound') || 'Church ID not found');
          navigation.goBack();
          return;
        }
        const id = parseInt(savedChurchId, 10);
        if (isNaN(id)) {
          Alert.alert(t('error') || 'Error', t('invalidChurchId') || 'Invalid Church ID');
          navigation.goBack();
          return;
        }
        setChurchId(id);
        
        // Fetch church name
        const res = await api.get(`churches/${id}`);
        const churchData = res?.data?.data;
        if (churchData?.name && mounted) {
          setChurchName(churchData.name);
        }
      } catch (e) {
        console.error('Error fetching church info:', e);
        Alert.alert(t('error') || 'Error', t('failedToLoadChurchInfo') || 'Failed to load church info');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigation, t]);

  // Load week numbers when year and month are selected
  useEffect(() => {
    if (selectedYear && selectedMonth && churchId) {
      loadWeekNumbers();
    } else {
      setWeekInfos([]);
      setSelectedWeeks(new Set());
    }
  }, [selectedYear, selectedMonth, churchId]);

  // Reload week data when screen is focused (e.g., after saving data)
  useFocusEffect(
    useCallback(() => {
      if (selectedYear && selectedMonth && churchId) {
        loadWeekNumbers();
      }
    }, [selectedYear, selectedMonth, churchId]),
  );

  const loadWeekNumbers = useCallback(async () => {
    if (!selectedYear || !selectedMonth || !churchId) return;
    
    setLoadingWeeks(true);
    try {
      const weeks = await getWeekNumbers(selectedYear, selectedMonth, churchId);
      setWeekInfos(weeks);
      setSelectedWeeks(new Set()); // Reset selection when weeks change
    } catch (error: any) {
      console.error('Error loading week numbers:', error);
      Alert.alert(
        t('error') || 'Error',
        error?.message || t('failedToLoadWeekNumbers') || 'Failed to load week numbers',
      );
    } finally {
      setLoadingWeeks(false);
    }
  }, [selectedYear, selectedMonth, churchId, t]);

  const toggleWeek = (weekNumber: number) => {
    const newSelected = new Set(selectedWeeks);
    if (newSelected.has(weekNumber)) {
      newSelected.delete(weekNumber);
    } else {
      newSelected.add(weekNumber);
    }
    setSelectedWeeks(newSelected);
  };

  const handleNext = () => {
    if (!selectedYear || !selectedMonth) {
      Alert.alert(t('error') || 'Error', t('pleaseSelectYearAndMonth') || 'Please select year and month');
      return;
    }
    if (selectedWeeks.size === 0) {
      Alert.alert(t('error') || 'Error', t('pleaseSelectAtLeastOneWeek') || 'Please select at least one week');
      return;
    }
    if (!churchId) {
      Alert.alert(t('error') || 'Error', t('churchIdNotFound') || 'Church ID not found');
      return;
    }

    // Sort week numbers in ascending order
    const sortedWeekNumbers = Array.from(selectedWeeks).sort((a, b) => a - b);
    
    navigation.navigate('MonthlyDataEntry', {
      churchId,
      churchName,
      year: selectedYear,
      month: selectedMonth,
      weekNumbers: sortedWeekNumbers,
    });
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
        edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.mainColor} />
          <Text style={[styles.loadingText, {color: C.textSecondary}]}>
            {t('loading')}...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background, flex: 1}]}>
        <View style={styles.headerWrapper}>
          <Header
            title={t('monthlyData') || 'Monthly Data'}
            showMenu={false}
          />
        </View>
        
        <ScrollView
          style={[styles.scrollView, {backgroundColor: C.background}]}
          contentContainerStyle={[styles.scrollContent, {backgroundColor: C.background}]}
          showsVerticalScrollIndicator={false}>
          
          {/* Church Name */}
          {churchName ? (
            <View style={styles.churchInfoContainer}>
              <Text style={[styles.infoLabel, {color: C.textPrimary}]}>
              {t('enterDataFor') || 'Enter Data for'}: {churchName}
            </Text>
            </View>
          ) : null}

          {/* Select Year and Month Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
              {t('selectYearAndMonth') || 'Select Year and Month'}
            </Text>
            
            <View style={styles.fieldContainer}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('year') || 'Year'}
              </Text>
              <ElementDropdown
                data={years}
                value={selectedYear as any}
                onChange={(v) => setSelectedYear(v ? Number(v) : null)}
                placeholder={t('selectYear') || 'Select Year'}
                dropdownContainerStyle={{backgroundColor: C.inputBg, borderColor: C.inputBorder} as any}
                optionItemStyle={{backgroundColor: C.inputBg} as any}
                activeItemColor={C.surface}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('month') || 'Month'}
              </Text>
              <ElementDropdown
                data={monthLabels}
                value={selectedMonth as any}
                onChange={(v) => setSelectedMonth(v ? Number(v) : null)}
                placeholder={t('selectMonth') || 'Select Month'}
                dropdownContainerStyle={{backgroundColor: C.inputBg, borderColor: C.inputBorder} as any}
                optionItemStyle={{backgroundColor: C.inputBg} as any}
                activeItemColor={C.surface}
              />
            </View>
          </View>

          {/* Week Selection Section */}
          {selectedYear && selectedMonth && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
                {t('week') || 'Week'}
              </Text>
              
              {loadingWeeks ? (
                <View style={styles.loadingWeeksContainer}>
                  <ActivityIndicator size="small" color={COLORS.mainColor} />
                  <Text style={[styles.loadingWeeksText, {color: C.textSecondary}]}>
                    {t('loading')}...
                  </Text>
                </View>
              ) : weekInfos.length > 0 ? (
                weekInfos.map((weekInfo) => {
                  const weekNumber = weekInfo.week_number;
                  const isSelected = selectedWeeks.has(weekNumber);
                  const hasData = weekInfo.is_reported;
                  const weekRange = getWeekDateRange(selectedYear!, weekNumber);
                  const isDisabled = false; // Can add logic to disable future weeks if needed
                  
                  return (
                    <TouchableOpacity
                      key={weekNumber}
                      style={[
                        styles.weekItem,
                        {borderColor: C.border},
                        isSelected && {backgroundColor: C.bgSelectedOption},
                        isDisabled && styles.weekItemDisabled,
                      ]}
                      onPress={() => !isDisabled && toggleWeek(weekNumber)}
                      disabled={isDisabled}
                      activeOpacity={0.7}>
                      <View style={styles.checkboxContainer}>
                        <View
                          style={[
                            styles.checkbox,
                            {
                              borderColor: isSelected ? COLORS.mainColor : C.border,
                              backgroundColor: isSelected ? COLORS.mainColor : 'transparent',
                            },
                          ]}>
                          {isSelected && (
                            <Text style={styles.checkmark}>✓</Text>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.weekText,
                            {
                              color: isDisabled ? C.textSecondary : C.textPrimary,
                            },
                          ]}>
                          {t('week') || 'Week'} {weekNumber} ({weekRange})
                        </Text>
                        {hasData && (
                          <View style={[styles.dataIndicator, {backgroundColor: COLORS.successColor}]}>
                            <Text style={styles.dataIndicatorText}>✓</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={[styles.noWeeksText, {color: C.textSecondary}]}>
                  {t('noWeeksAvailable') || 'No weeks available for this month'}
                </Text>
              )}
            </View>
          )}

          {/* Next Button */}
          <View style={styles.nextButtonContainer}>
            <SaveButton
              label={t('next') || 'Next'}
              onPress={handleNext}
              disabled={true}
            />
            <Text style={[styles.noticeText, {color: C.textSecondary}]}>
              {t('featureUnderDevelopment') || 'This feature is under development, please come back later'}
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    paddingHorizontal: ms(16),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // padding: ms(16),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: ms(16),
    fontSize: fs(14),
  },
  churchInfoContainer: {
    padding: ms(12),
    borderRadius: rs(8),
    marginBottom: ms(16),
  },
  infoLabel: {
    fontSize: fs(12),
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: ms(10),
  },

  section: {
    padding: ms(16),
    borderRadius: rs(8),
  },
  sectionTitle: {
    fontSize: fs(14),
    fontWeight: '600',
    marginBottom: ms(16),
  },
  fieldContainer: {
    marginBottom: ms(16),
  },
  loadingWeeksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ms(20),
  },
  loadingWeeksText: {
    marginLeft: ms(8),
    fontSize: fs(14),
  },
  weekItem: {
    padding: ms(12),
    borderRadius: rs(3),
    borderWidth: 1,
    marginBottom: ms(8),
  },
  weekItemDisabled: {
    opacity: 0.5,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: ws(20),
    height: ws(20),
    borderRadius: rs(4),
    borderWidth: 2,
    marginRight: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: fs(12),
    fontWeight: 'bold',
  },
  weekText: {
    fontSize: fs(14),
    flex: 1,
  },
  dataIndicator: {
    width: ws(20),
    height: ws(20),
    borderRadius: rs(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: ms(8),
  },
  dataIndicatorText: {
    color: '#fff',
    fontSize: fs(10),
    fontWeight: 'bold',
  },
  noWeeksText: {
    textAlign: 'center',
    paddingVertical: ms(20),
    fontSize: fs(14),
  },
  nextButtonContainer: {
    // marginTop: ms(8),
    paddingHorizontal: ms(16),
  },
  noticeText: {
    textAlign: 'center',
    fontSize: fs(12),
    marginTop: ms(8),
    fontStyle: 'italic',
  },
});

