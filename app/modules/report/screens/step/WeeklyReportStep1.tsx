import React, { useEffect, useState } from 'react';
import { View, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Select, SelectItem, IndexPath, Text, Button, CheckBox } from '@ui-kitten/components';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { globalStyles } from '../../../../shared/styles/global';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../../config/api';
import { format, parseISO } from 'date-fns';
import { useLanguage } from '../../../../shared/context/LanguageContext';

type Props = {
  onNext: (selectedWeeks: number[]) => void;
};

const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
// months will be localized inside the component using Intl

const validationSchema = Yup.object().shape({
  selectedWeeks: Yup.array().min(1, 'please choose at least 1 week'),
});

export default function WeeklyReportStep1({ onNext }: Props) {
  const { selectedLanguage } = useLanguage();
  const localeMap: Record<string, string> = { en: 'en', pt: 'pt', es: 'es', fr: 'fr', zh: 'zh', ms: 'ms', ja: 'ja' };
  const months = React.useMemo(() => {
    const loc = localeMap[selectedLanguage as string] || 'en';
    return Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(loc, { month: 'long' }).format(new Date(2020, i, 1)));
  }, [selectedLanguage]);
  const [selectedYearIndex, setSelectedYearIndex] = useState<IndexPath | undefined>(undefined);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<IndexPath | undefined>(undefined);
  const [weeks, setWeeks] = useState<any[]>([]); // weeks là mảng object
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Thêm state cho selectedWeeksIndex
  const [selectedWeeksIndex, setSelectedWeeksIndex] = useState<IndexPath[] | undefined>(undefined);

  useEffect(() => {
    // Only fetch weeks if both year and month are selected
    if (selectedYearIndex !== undefined && selectedMonthIndex !== undefined) {
      const year = years[selectedYearIndex.row];
      const month = selectedMonthIndex.row + 1; // month là number
      setLoading(true);
      setError(null);
      setWeeks([]);
      // Khi đổi năm/tháng, clear selectedWeeks trong Formik
      setFieldValueRef && setFieldValueRef('selectedWeeks', []);
      (async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          if (!token) throw new Error('No token found');
          const response = await api.get(`week-numbers`, {
            params: { year, month },
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          // response.data là mảng object tuần
          setWeeks(response.data || []);
        } catch (err) {
          setError('Failed to fetch weeks');
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setWeeks([]);
      setFieldValueRef && setFieldValueRef('selectedWeeks', []);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonthIndex, selectedYearIndex]);

  // Lưu tham chiếu setFieldValue để dùng trong useEffect
  const [setFieldValueRef, setSetFieldValueRef] = useState<any>();

  return (
    <Formik
      initialValues={{ selectedWeeks: [] as number[] }}
      validationSchema={validationSchema}
      onSubmit={(values) => {
        onNext(values.selectedWeeks);
      }}
    >
      {({ handleSubmit, values, setFieldValue, errors }) => {
        // Lưu setFieldValue để dùng trong useEffect
        useEffect(() => {
          setSetFieldValueRef(() => setFieldValue);
        }, [setFieldValue]);
        return (
          <View>
            <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Select Year and Month</Text>

            <Select
              label="Year"
              selectedIndex={selectedYearIndex}
              onSelect={(index) => setSelectedYearIndex(index as IndexPath)}
              style={{ marginVertical: 8 }}
              value={selectedYearIndex !== undefined ? years[selectedYearIndex.row].toString() : ''}
            >
              {years.map((year, index) => (
                <SelectItem key={index} title={year.toString()} />
              ))}
            </Select>

            <Select
              label="Month"
              selectedIndex={selectedMonthIndex}
              onSelect={(index) => setSelectedMonthIndex(index as IndexPath)}
              style={{ marginVertical: 8 }}
              value={selectedMonthIndex !== undefined ? months[selectedMonthIndex.row] : ''}
            >
              {months.map((month, index) => (
                <SelectItem key={index} title={month} />
              ))}
            </Select>

            {loading && <ActivityIndicator style={{ marginTop: 8 }} />}
            {error && <Text status="danger" style={{ marginTop: 8 }}>{error}</Text>}

            {/* Hiển thị CheckBox cho week nếu có dữ liệu */}
            {weeks.length > 0 && !loading && !error && (
              <>
                <Text category="s1" style={{ marginTop: 8, marginBottom: 5 }}>Weeks</Text>
                {weeks.map((weekObj, idx) => {
                  // Nếu là object có start/end
                  if (typeof weekObj === 'object' && weekObj !== null && 'week' in weekObj) {
                    let label = `Week ${weekObj.week}`;
                    if (weekObj.start && weekObj.end) {
                      try {
                        label += `, ${years[selectedYearIndex!.row]} ${format(parseISO(weekObj.start), 'dd MMM')} - ${format(parseISO(weekObj.end), 'dd MMM')}`;
                      } catch {}
                    }
                    return (
                      <CheckBox
                        key={weekObj.week}
                        checked={values.selectedWeeks.includes(weekObj.week)}
                        onChange={() => {
                          const updatedWeeks = values.selectedWeeks.includes(weekObj.week)
                            ? values.selectedWeeks.filter((w) => w !== weekObj.week)
                            : [...values.selectedWeeks, weekObj.week];
                          setFieldValue('selectedWeeks', updatedWeeks);
                        }}
                        style={{ marginBottom: 5 }}
                      >
                        {label}
                      </CheckBox>
                    );
                  }
                  return (
                    <CheckBox
                      key={weekObj}
                      checked={values.selectedWeeks.includes(weekObj)}
                      onChange={() => {
                        const updatedWeeks = values.selectedWeeks.includes(weekObj)
                          ? values.selectedWeeks.filter((w) => w !== weekObj)
                          : [...values.selectedWeeks, weekObj];
                        setFieldValue('selectedWeeks', updatedWeeks);
                      }}
                      style={{ marginBottom: 5 }}
                    >
                      {(() => {
                        try {
                          const year = years[selectedYearIndex!.row];
                          const firstDayOfYear = new Date(year, 0, 1);
                          const dayOfWeek = firstDayOfYear.getDay(); // 0=Chủ nhật
                          const firstSunday = new Date(firstDayOfYear);
                          if (dayOfWeek !== 0) {
                            firstSunday.setDate(firstDayOfYear.getDate() + (7 - dayOfWeek));
                          }
                          const weekNumber = typeof weekObj === 'number' ? weekObj : parseInt(weekObj, 10);
                          const startDate = new Date(firstSunday);
                          startDate.setDate(firstSunday.getDate() + (weekNumber - 1) * 7);
                          const endDate = new Date(startDate);
                          endDate.setDate(startDate.getDate() + 6);

                          const formatDate = (date: Date) => {
                            const day = date.getDate().toString().padStart(2, '0');
                            const loc = localeMap[selectedLanguage as string] || 'en';
                            const monthShort = new Intl.DateTimeFormat(loc, { month: 'short' }).format(date);
                            return `${day} ${monthShort}`;
                          };

                          return `Week ${weekObj}, ${year} (${formatDate(startDate)} - ${formatDate(endDate)})`;
                        } catch {
                          return `Week ${weekObj}`;
                        }
                      })()}
                    </CheckBox>
                  );
                })}
              </>
            )}

            <Button
              style={ globalStyles.button }
              onPress={() => {
                if (values.selectedWeeks.length === 0) {
                  Alert.alert('Validation', 'please choose at least 1 week');
                } else {
                  handleSubmit();
                }
              }}
            >
              Next
            </Button>
          </View>
        );
      }}
    </Formik>
  );
}