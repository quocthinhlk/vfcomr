import React, {useState, useEffect, useMemo, useCallback, useRef} from 'react';
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
import {fs, ws, ms, rs} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import {getWeekInfo, WeekInfo} from '../services/monthlydata.service';
import {SaveButton} from '../../../shared/components/ActionButtons';
import api from '../../../config/api';

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
  const {t} = useTranslation();
  const {selectedLanguage: langCode} = useLanguage();
  const C = useThemedColors();
  
  const [churchId, setChurchId] = useState<number | null>(null);
  const [churchName, setChurchName] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [weekInfos, setWeekInfos] = useState<WeekInfo[]>([]);
  const [selectedWeeks, setSelectedWeeks] = useState<Set<number>>(new Set());
  const [loadingWeeks, setLoadingWeeks] = useState(false);
  const lastWeekLoadKeyRef = useRef<string | null>(null);
  const didInitialFocusRef = useRef(false);

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

  // Load church ID from AsyncStorage or Dashboard API
  useEffect(() => {
    (async () => {
      try {
        // Try AsyncStorage first
        const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
        const savedChurchName = await AsyncStorage.getItem('selectedChurchName');
        let hasSavedChurchId = false;
        if (savedChurchId) {
          const id = parseInt(savedChurchId, 10);
          if (!isNaN(id)) {
            console.log('Church ID from AsyncStorage:', id);
            setChurchId(id);
            hasSavedChurchId = true;
            if (savedChurchName) {
              setChurchName(savedChurchName);
            }
          }
        }

        // If no AsyncStorage (or missing name), get from dashboard API
        if (!hasSavedChurchId || !savedChurchName) {
          console.log('Fetching dashboard for church info...');
          const response = await api.get('dashboard');
          const dashboardInfo = response.data?.data?.dashboard_info;
          const dashboardChurchId = dashboardInfo?.church_id;
          const dashboardChurchName = dashboardInfo?.church_name;
        
          if (dashboardChurchId) {
            console.log('Church ID from Dashboard API:', dashboardChurchId);
            setChurchId(dashboardChurchId);
            await AsyncStorage.setItem('selectedChurchId', String(dashboardChurchId));
            if (dashboardChurchName) {
              setChurchName(dashboardChurchName);
              await AsyncStorage.setItem('selectedChurchName', String(dashboardChurchName));
            }
          } else if (!hasSavedChurchId) {
            console.error('No church_id found in dashboard response');
          }
        }
      } catch (error) {
        console.error('Error loading church ID:', error);
      }
    })();
  }, []);

  // Load week info when year and month are selected
  const loadWeekNumbers = useCallback(async () => {
    if (!selectedYear || !selectedMonth || !churchId) return;
    const loadKey = `${churchId}-${selectedYear}-${selectedMonth}`;
    if (lastWeekLoadKeyRef.current === loadKey) return;

    setLoadingWeeks(true);
    try {
      const weeks = await getWeekInfo(selectedYear, selectedMonth, churchId);
      setWeekInfos(Array.isArray(weeks) ? weeks : []);
      setSelectedWeeks(new Set()); // Reset selection when weeks change
      lastWeekLoadKeyRef.current = loadKey;
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

  // Trigger load when year/month change
  useEffect(() => {
    if (selectedYear && selectedMonth && churchId) {
      loadWeekNumbers();
    } else {
      setWeekInfos([]);
      setSelectedWeeks(new Set());
    }
  }, [selectedYear, selectedMonth, churchId, loadWeekNumbers]);

  // Reload week data when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (!didInitialFocusRef.current) {
        didInitialFocusRef.current = true;
        return;
      }
      if (selectedYear && selectedMonth && churchId) {
        loadWeekNumbers();
      }
    }, [selectedYear, selectedMonth, churchId, loadWeekNumbers]),
  );

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
          
          {churchName ? (
            <View style={[styles.enterDataForContainer, {backgroundColor: C.surface}]}>
              <Text style={[styles.enterDataForText, {color: C.textPrimary}]}>
                {t('enterDataFor') || 'Enter data for'}: {churchName}
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
                  const isReported = weekInfo.is_reported;
                  const isSelected = selectedWeeks.has(weekNumber);
                  const weekRange = getWeekDateRange(selectedYear, weekNumber);
                  
                  return (
                    <TouchableOpacity
                      key={weekNumber}
                      style={[
                        styles.weekItem,
                        {borderColor: C.border},
                        isSelected && {backgroundColor: C.bgSelectedOption},
                      ]}
                      onPress={() => toggleWeek(weekNumber)}
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
                        <View style={styles.weekInfoContainer}>
                          <Text
                            style={[
                              styles.weekText,
                              {color: C.textPrimary},
                            ]}>
                            {t('week') || 'Week'} {weekNumber} ({weekRange})
                          </Text>
                          {isReported ? (
                            <Text style={[styles.weekStatusCheck, {color: COLORS.mainColor}]}>✓</Text>
                          ) : null}
                        </View>
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
              disabled={!selectedYear || !selectedMonth || selectedWeeks.size === 0 || !churchId}
            />
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
    paddingVertical: ms(8),
    paddingHorizontal: ms(16),
  },
  enterDataForContainer: {
    padding: ms(12),
    borderRadius: rs(8),
    marginBottom: ms(16),
  },
  enterDataForText: {
    fontSize: fs(12),
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    paddingVertical: ms(16),
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  weekStatusText: {
    fontSize: fs(12),
    marginLeft: ms(10),
  },
  weekStatusCheck: {
    fontSize: fs(14),
    fontWeight: '700',
    marginLeft: ms(10),
  },
  noWeeksText: {
    textAlign: 'center',
    paddingVertical: ms(20),
    fontSize: fs(14),
  },
  nextButtonContainer: {
    paddingBottom: ms(20),
  },
});
