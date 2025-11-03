import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {Text, Input, Button} from '@ui-kitten/components';
import {TabView, SceneMap, TabBar} from 'react-native-tab-view';
import {Formik, FormikProps} from 'formik';
import * as Yup from 'yup';
import {COLORS} from '../../../../shared/constants/colors';
import {
  WeekData,
  FormValues,
  WeeklyReportSubmitData,
  WeekDataSchema,
  FormSchema,
  REQUIRED_FIELDS,
  TAB_WIDTH,
  TAB_MARGIN,
  TAB_TOTAL_WIDTH,
  FIRST_WEEK_START,
  formatDate,
  createWeekRoute,
  createInitialWeekData,
} from '../utils/weeklyReport.utils';

type Props = {
  weeks: number[];
  onBack: () => void;
  onSubmit: (data: WeeklyReportSubmitData[]) => void;
};

// Custom TabBar component
const CustomTabBar = ({
  navigationState,
  position,
  setIndex,
  currentIndex,
  onTabPress,
}: {
  navigationState: any;
  position: any;
  setIndex: (index: number) => void;
  currentIndex: number;
  onTabPress: (index: number) => void;
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to active tab
  useEffect(() => {
    if (scrollViewRef.current) {
      const scrollToX = currentIndex * TAB_TOTAL_WIDTH;
      
      // Get screen width to center the active tab
      const screenWidth = Dimensions.get('window').width;
      const centerOffset = (screenWidth - TAB_WIDTH) / 2;
      const finalScrollX = Math.max(0, scrollToX - centerOffset);
      
      scrollViewRef.current.scrollTo({ x: finalScrollX, animated: true });
    }
  }, [currentIndex]);

  return (
    <View style={styles.customTabBarContainer}>
      <ScrollView 
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.customTabBar}
        style={styles.tabScrollView}>
        {navigationState.routes.map((route: any, index: number) => {
          const isActive = index === currentIndex;
          return (
            <TouchableOpacity
              key={route.key}
              style={[
                styles.tabItem,
                isActive ? styles.activeTabItem : styles.inactiveTabItem,
              ]}
              onPress={() => onTabPress(index)}>
              <Text
                style={[
                  styles.tabText,
                  isActive ? styles.activeTabText : styles.inactiveTabText,
                ]}>
                {route.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default function WeeklyReportStep2({weeks, onBack, onSubmit}: Props) {
  const [index, setIndex] = useState(0);
  const [maxTabIndexAllowed, setMaxTabIndexAllowed] = useState(0);

  const [routes] = useState(
    weeks.map((w, i) => createWeekRoute(w, i))
  );

  const initialValues: FormValues = {
    weeks: weeks.map(week => createInitialWeekData(week)),
  };

  const renderScene = (
    {route}: {route: {key: string; title: string}},
    formikProps: FormikProps<FormValues>,
  ) => {
    const tabIndex = routes.findIndex(r => r.key === route.key);
    const values = formikProps.values.weeks[tabIndex];
    const errors = (formikProps.errors.weeks?.[tabIndex] || {}) as any;
    const touched = (formikProps.touched.weeks?.[tabIndex] || {}) as any;
    const handleChange = (field: string) => (text: string) =>
      formikProps.setFieldValue(`weeks.${tabIndex}.${field}`, text);
    const handleBlur = (field: string) => () =>
      formikProps.setFieldTouched(`weeks.${tabIndex}.${field}`, true);

    return (
      <ScrollView
        style={[styles.tabContent, {flex: 1}]}
        contentContainerStyle={{flexGrow: 1, paddingBottom: 20}} 
        keyboardShouldPersistTaps="handled">
        <Text category="label" style={styles.title}>
          1. Worship Service Attendance: Main Service @ 08:30 am
        </Text>
        <View style={styles.row}>
          <Input
            label="Adults"
            style={styles.input}
            value={values.adult_attendance}
            onChangeText={handleChange('adult_attendance')}
            onBlur={handleBlur('adult_attendance')}
            status={
              errors.adult_attendance && touched.adult_attendance
                ? 'danger'
                : 'basic'
            }
            caption={
              errors.adult_attendance && touched.adult_attendance
                ? errors.adult_attendance
                : ''
            }
          />
          <Input
            label="Youth [13-22]"
            style={styles.input}
            value={values.youth_attendance}
            onChangeText={handleChange('youth_attendance')}
            onBlur={handleBlur('youth_attendance')}
            status={
              errors.youth_attendance && touched.youth_attendance
                ? 'danger'
                : 'basic'
            }
            caption={
              errors.youth_attendance && touched.youth_attendance
                ? errors.youth_attendance
                : ''
            }
          />
        </View>
        <View style={styles.row}>
          <Input
            label="Children [0-12]"
            style={styles.input}
            value={values.child_attendance || ''}
            onChangeText={handleChange('child_attendance')}
            onBlur={handleBlur('child_attendance')}
            status={
              errors.child_attendance && touched.child_attendance
                ? 'danger'
                : 'basic'
            }
            caption={
              errors.child_attendance && touched.child_attendance
                ? errors.child_attendance
                : ''
            }
            keyboardType="numeric"
          />
          <Input
            label="No of Services for Children"
            style={styles.input}
            value={values.number_of_service_for_children || ''}
            onChangeText={handleChange('number_of_service_for_children')}
            onBlur={handleBlur('number_of_service_for_children')}
            status={
              errors.number_of_service_for_children &&
              touched.number_of_service_for_children
                ? 'danger'
                : 'basic'
            }
            caption={
              errors.number_of_service_for_children &&
              touched.number_of_service_for_children
                ? errors.number_of_service_for_children
                : ''
            }
            keyboardType="numeric"
          />
        </View>
        <View style={styles.row}>
          <Input
            label="Total Attendance"
            style={styles.input}
            value={(
              (parseInt(values.adult_attendance || '0', 10) || 0) +
              (parseInt(values.youth_attendance || '0', 10) || 0) +
              (parseInt(values.child_attendance || '0', 10) || 0) +
              (parseInt(values.number_of_service_for_children || '0', 10) || 0)
            ).toString()}
            editable={false}
            disabled={true}
          />
        </View>

        <Text category="label" style={styles.title}>
          2. Cell Groups
        </Text>
        <View style={styles.row}>
          <Input
            label="Number of Cell Groups"
            style={styles.input}
            value={values.cell_group_count || ''}
            onChangeText={handleChange('cell_group_count')}
            onBlur={handleBlur('cell_group_count')}
            status={
              errors.cell_group_count && touched.cell_group_count
                ? 'danger'
                : 'basic'
            }
            caption={
              errors.cell_group_count && touched.cell_group_count
                ? errors.cell_group_count
                : ''
            }
            keyboardType="numeric"
          />
          <Input
            label="Total Attendance in All"
            style={styles.input}
            value={values.cell_group_weekly_attendance || ''}
            onChangeText={handleChange('cell_group_weekly_attendance')}
            onBlur={handleBlur('cell_group_weekly_attendance')}
            status={
              errors.cell_group_weekly_attendance && touched.cell_group_weekly_attendance
                ? 'danger'
                : 'basic'
            }
            caption={
              errors.cell_group_weekly_attendance && touched.cell_group_weekly_attendance
                ? errors.cell_group_weekly_attendance
                : ''
            }
            keyboardType="numeric"
          />
        </View>

        <Text category="label" style={styles.title}>
          3. Prayer Meetings
        </Text>
        <View style={styles.row}>
          <Input
            label="Number of Prayer"
            style={styles.input}
            value={values.prayer_meeting_count || ''}
            onChangeText={handleChange('prayer_meeting_count')}
            onBlur={handleBlur('prayer_meeting_count')}
            status={
              errors.prayer_meeting_count && touched.prayer_meeting_count
                ? 'danger'
                : 'basic'
            }
            caption={
              errors.prayer_meeting_count && touched.prayer_meeting_count
                ? errors.prayer_meeting_count
                : ''
            }
            keyboardType="numeric"
          />
          <Input
            label="Total Attendance in All"
            style={styles.input}
            value={values.prayer_meeting_weekly_attendance || ''}
            onChangeText={handleChange('prayer_meeting_weekly_attendance')}
            onBlur={handleBlur('prayer_meeting_weekly_attendance')}
            status={
              errors.prayer_meeting_weekly_attendance && touched.prayer_meeting_weekly_attendance
                ? 'danger'
                : 'basic'
            }
            caption={
              errors.prayer_meeting_weekly_attendance && touched.prayer_meeting_weekly_attendance
                ? errors.prayer_meeting_weekly_attendance
                : ''
            }
            keyboardType="numeric"
          />
        </View>

        <Text category="label" style={styles.title}>
          4. Decisions, Discipling & Water Baptisms
        </Text>
        <View style={styles.row}>
          <Input
            label="Number of New Decisions"
            style={[styles.input, { minHeight: 80, justifyContent: 'flex-end' }]}
            value={values.new_decisions || ''}
            onChangeText={handleChange('new_decisions')}
            onBlur={handleBlur('new_decisions')}
            status={
              errors.new_decisions && touched.new_decisions
                ? 'danger'
                : 'basic'
            }
            caption={
              errors.new_decisions && touched.new_decisions
                ? errors.new_decisions
                : ''
            }
            keyboardType="numeric"
          />
          <Input
            label="Number being Actively Discipled"
            style={[styles.input, { minHeight: 80, justifyContent: 'flex-end' }]}
            value={values.active_disciples || ''}
            onChangeText={handleChange('active_disciples')}
            onBlur={handleBlur('active_disciples')}
            status={
              errors.active_disciples && touched.active_disciples
                ? 'danger'
                : 'basic'
            }
            caption={
              errors.active_disciples && touched.active_disciples
                ? errors.active_disciples
                : ''
            }
            keyboardType="numeric"
          />
        </View>
        <View style={styles.row}>
          <Input
            label="Adults Water Baptised Lds"
            style={styles.input}
            value={values.water_baptisms || ''}
            onChangeText={handleChange('water_baptisms')}
            onBlur={handleBlur('water_baptisms')}
            status={
              errors.water_baptisms && touched.water_baptisms
                ? 'danger'
                : 'basic'
            }
            caption={
              errors.water_baptisms && touched.water_baptisms
                ? errors.water_baptisms
                : ''
            }
            keyboardType="numeric"
          />
        </View>

        <Text category="label" style={styles.title}>
          5. Teaching & Training
        </Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input
              label="Number of GT/LIW"
              style={[styles.input, { minHeight: 80, justifyContent: 'flex-end' }]}
              value={values.liw_class_count || ''}
              onChangeText={handleChange('liw_class_count')}
              onBlur={handleBlur('liw_class_count')}
              status={
                errors.liw_class_count && touched.liw_class_count
                  ? 'danger'
                  : 'basic'
              }
              caption={
                errors.liw_class_count && touched.liw_class_count
                  ? errors.liw_class_count
                  : ''
              }
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Total Attendance in all GT/LIW Classes"
              style={[styles.input, { minHeight: 80, justifyContent: 'flex-end' }]}
              value={values.liw_class_total_students || ''}
              onChangeText={handleChange('liw_class_total_students')}
              onBlur={handleBlur('liw_class_total_students')}
              status={
                errors.liw_class_total_students && touched.liw_class_total_students
                  ? 'danger'
                  : 'basic'
              }
              caption={
                errors.liw_class_total_students && touched.liw_class_total_students
                  ? errors.liw_class_total_students
                  : ''
              }
              keyboardType="numeric"
            />
          </View>
        </View>
        <View style={styles.row}>
          <Input
            label="No of Leaders in training for CPM"
            style={styles.input}
            value={values.number_of_leaders_in_training_for_cpm || ''}
            onChangeText={handleChange('number_of_leaders_in_training_for_cpm')}
            onBlur={handleBlur('number_of_leaders_in_training_for_cpm')}
            status={
              errors.number_of_leaders_in_training_for_cpm && touched.number_of_leaders_in_training_for_cpm
                ? 'danger'
                : 'basic'
            }
            caption={
              errors.number_of_leaders_in_training_for_cpm && touched.number_of_leaders_in_training_for_cpm
                ? errors.number_of_leaders_in_training_for_cpm
                : ''
            }
            keyboardType="numeric"
          />
        </View>

        <Text category="label" style={styles.title}>
          6. Giving
        </Text>
        <View style={styles.row}>
          <Input
            label="Tithes + Offerings"
            style={styles.input}
            value={values.givings || ''}
            onChangeText={handleChange('givings')}
            onBlur={handleBlur('givings')}
            status={
              errors.givings && touched.givings
                ? 'danger'
                : 'basic'
            }
            caption={
              errors.givings && touched.givings
                ? errors.givings
                : ''
            }
            keyboardType="numeric"
          />
          <Input
            label="Missions Giving [MFP]"
            style={styles.input}
            value={values.mfp_givings || ''}
            onChangeText={handleChange('mfp_givings')}
            onBlur={handleBlur('mfp_givings')}
            status={
              errors.mfp_givings && touched.mfp_givings
                ? 'danger'
                : 'basic'
            }
            caption={
              errors.mfp_givings && touched.mfp_givings
                ? errors.mfp_givings
                : ''
            }
            keyboardType="numeric"
          />
        </View>

        {/* Footer Buttons trong mỗi scene */}
        <View style={styles.footer}>
          <Button
            style={styles.backButton}
            appearance="outline"
            status="primary"
            onPress={() => {
              if (index === 0) {
                onBack();
              } else {
                setIndex(index - 1);
              }
            }}>
            {(evaProps: any) => (
              <Text style={{ color: COLORS.mainColor, fontWeight: '600' }}>
                Back
              </Text>
            )}
          </Button>

          {index === weeks.length - 1 ? (
            <Button
              style={styles.backButton}
              status="primary"
              onPress={() => formikProps.handleSubmit()}>
              {(evaProps: any) => (
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>
                  Submit
                </Text>
              )}
            </Button>
          ) : (
            <Button
              style={styles.nextButton}
              status="primary"
              onPress={() => handleNext(formikProps)}>
              {(evaProps: any) => (
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>
                  Next
                </Text>
              )}
            </Button>
          )}
        </View>
      </ScrollView>
    );
  };

  // Fix handleNext and handleTabPress to use correct field names
  const handleNext = (formikProps: FormikProps<FormValues>) => {
    const currentWeek = formikProps.values.weeks[index];
    const currentErrors = (formikProps.errors.weeks?.[index] || {}) as any;
    
    // Check if any field has errors
    const hasErrors = Object.keys(currentErrors).length > 0;
    if (hasErrors) {
      // Set touched for all fields to show validation errors
      REQUIRED_FIELDS.forEach(field => {
        formikProps.setFieldTouched(`weeks.${index}.${field}`, true);
      });
      return;
    }
    
    // Check if any required field is empty
    const hasEmptyFields = REQUIRED_FIELDS.some(field => !currentWeek?.[field as keyof WeekData]);
    if (hasEmptyFields) {
      // Set touched for all fields to show validation errors
      REQUIRED_FIELDS.forEach(field => {
        formikProps.setFieldTouched(`weeks.${index}.${field}`, true);
      });
      return;
    }
    
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setMaxTabIndexAllowed(Math.max(maxTabIndexAllowed, nextIndex));
  };
  
  const handleTabPress = (
    formikProps: FormikProps<FormValues>,
    pressedIndex: number,
  ) => {
    if (pressedIndex === index + 1) {
      const currentWeek = formikProps.values.weeks[index];
      const currentErrors = (formikProps.errors.weeks?.[index] || {}) as any;
      
      // Check if any field has errors
      const hasErrors = Object.keys(currentErrors).length > 0;
      if (hasErrors) {
        // Set touched for all fields to show validation errors
        REQUIRED_FIELDS.forEach(field => {
          formikProps.setFieldTouched(`weeks.${index}.${field}`, true);
        });
        return;
      }
      
      // Check if any required field is empty
      const hasEmptyFields = REQUIRED_FIELDS.some(field => !currentWeek?.[field as keyof WeekData]);
      if (hasEmptyFields) {
        // Set touched for all fields to show validation errors
        REQUIRED_FIELDS.forEach(field => {
          formikProps.setFieldTouched(`weeks.${index}.${field}`, true);
        });
        return;
      }
      
      setIndex(pressedIndex);
      setMaxTabIndexAllowed(Math.max(maxTabIndexAllowed, pressedIndex));
    } else if (pressedIndex === index - 1) {
      setIndex(pressedIndex);
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={FormSchema}
      onSubmit={(values: FormValues) =>
        onSubmit(
          values.weeks.map(w => ({
            week: w.week,
            adult_attendance: w.adult_attendance,
            youth_attendance: w.youth_attendance,
            child_attendance: w.child_attendance,
            number_of_service_for_children: w.number_of_service_for_children,
            cell_group_count: w.cell_group_count,
            cell_group_weekly_attendance: w.cell_group_weekly_attendance,
            prayer_meeting_count: w.prayer_meeting_count,
            prayer_meeting_weekly_attendance: w.prayer_meeting_weekly_attendance,
            new_decisions: w.new_decisions,
            active_disciples: w.active_disciples,
            water_baptisms: w.water_baptisms,
            liw_class_count: w.liw_class_count,
            liw_class_total_students: w.liw_class_total_students,
            number_of_leaders_in_training_for_cpm: w.number_of_leaders_in_training_for_cpm,
            givings: w.givings,
            mfp_givings: w.mfp_givings,
          })),
        )
      }>
      {(formikProps: FormikProps<FormValues>) => (
        <View style={{flex: 1}}>
          <TabView
            navigationState={{index, routes}}
            renderScene={props => renderScene(props, formikProps)}
            onIndexChange={setIndex}
            initialLayout={{width: Dimensions.get('window').width}}
            renderTabBar={props => (
              <CustomTabBar
                {...props}
                setIndex={setIndex}
                currentIndex={index}
                onTabPress={pressedIndex => {
                  handleTabPress(formikProps, pressedIndex);
                }}
              />
            )}
            style={styles.tabView}
          />
        </View>
      )}
    </Formik>
  );
}

// Move styles to the bottom after the component
const styles = StyleSheet.create({
  tabContent: {
    paddingTop: 15,
    paddingBottom: 15,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    paddingBottom: 20,
    paddingTop: 8,
    display: 'flex',
    justifyContent: 'space-between',
  },
  backButton: {
    width: '49%',
    borderColor: COLORS.mainColor,
  },
  nextButton: {
    width: '49%',
    backgroundColor: COLORS.mainColor,
  },
  title: {
    marginBottom: 8,
    marginTop: 16,
    color: COLORS.gray,
  },
  customTabBarContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  customTabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabItem: {
    width: TAB_WIDTH, // Fixed width for each tab item
    marginHorizontal: TAB_MARGIN,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60, // Ensure minimum height for content
  },
  activeTabItem: {
    backgroundColor: COLORS.mainColor,
    borderColor: COLORS.mainColor,
  },
  inactiveTabItem: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.mainColor,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  activeTabText: {
    color: COLORS.white,
  },
  inactiveTabText: {
    color: COLORS.gray,
  },
  buttonGap: {
    width: 10,
  },
  tabView: {
    flex: 1,
  },
  tabScrollView: {
    flexGrow: 0,
  },
});