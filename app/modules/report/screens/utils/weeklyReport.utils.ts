import * as Yup from 'yup';
import api from '../../../../config/api';
import { useEffect, useState } from 'react';

// Types
export type WeekData = {
  week: number;
  adult_attendance: string;
  youth_attendance: string;
  child_attendance: string;
  number_of_service_for_children: string;
  cell_group_count: string;
  cell_group_weekly_attendance: string;
  prayer_meeting_count: string;
  prayer_meeting_weekly_attendance: string;
  new_decisions: string;
  active_disciples: string;
  water_baptisms: string;
  liw_class_count: string;
  liw_class_total_students: string;
  number_of_leaders_in_training_for_cpm: string;
  givings: string;
  mfp_givings: string;
};

export type FormValues = {
  weeks: WeekData[];
};

export type WeeklyReportSubmitData = {
  week: number;
  adult_attendance: string;
  youth_attendance: string;
  child_attendance: string;
  number_of_service_for_children: string;
  cell_group_count: string;
  cell_group_weekly_attendance: string;
  prayer_meeting_count: string;
  prayer_meeting_weekly_attendance: string;
  new_decisions: string;
  active_disciples: string;
  water_baptisms: string;
  liw_class_count: string;
  liw_class_total_students: string;
  number_of_leaders_in_training_for_cpm: string;
  givings: string;
  mfp_givings: string;
};

// Validation schema for each week's data
export const WeekDataSchema = Yup.object().shape({
  adult_attendance: Yup.string()
    .required('Required')
    .matches(/^[0-9]+$/, 'Must be a valid number')
    .test('positive', 'Must be a positive number', value => {
      return value ? parseInt(value) >= 0 : false;
    }),
  youth_attendance: Yup.string()
    .required('Required')
    .matches(/^[0-9]+$/, 'Must be a valid number')
    .test('positive', 'Must be a positive number', value => {
      return value ? parseInt(value) >= 0 : false;
    }),
  child_attendance: Yup.string()
    .required('Required')
    .matches(/^[0-9]+$/, 'Must be a valid number')
    .test('positive', 'Must be a positive number', value => {
      return value ? parseInt(value) >= 0 : false;
    }),
  number_of_service_for_children: Yup.string()
    .required('Required')
    .matches(/^[0-9]+$/, 'Must be a valid number')
    .test('positive', 'Must be a positive number', value => {
      return value ? parseInt(value) >= 0 : false;
    }),
  cell_group_count: Yup.string()
    .required('Required')
    .matches(/^[0-9]+$/, 'Must be a valid number')
    .test('positive', 'Must be a positive number', value => {
      return value ? parseInt(value) >= 0 : false;
    }),
  cell_group_weekly_attendance: Yup.string()
    .required('Required')
    .matches(/^[0-9]+$/, 'Must be a valid number')
    .test('positive', 'Must be a positive number', value => {
      return value ? parseInt(value) >= 0 : false;
    }),
  prayer_meeting_count: Yup.string()
    .required('Required')
    .matches(/^[0-9]+$/, 'Must be a valid number')
    .test('positive', 'Must be a positive number', value => {
      return value ? parseInt(value) >= 0 : false;
    }),
  prayer_meeting_weekly_attendance: Yup.string()
    .required('Required')
    .matches(/^[0-9]+$/, 'Must be a valid number')
    .test('positive', 'Must be a positive number', value => {
      return value ? parseInt(value) >= 0 : false;
    }),
  new_decisions: Yup.string()
    .required('Required')
    .matches(/^[0-9]+$/, 'Must be a valid number')
    .test('positive', 'Must be a positive number', value => {
      return value ? parseInt(value) >= 0 : false;
    }),
  active_disciples: Yup.string()
    .required('Required')
    .matches(/^[0-9]+$/, 'Must be a valid number')
    .test('positive', 'Must be a positive number', value => {
      return value ? parseInt(value) >= 0 : false;
    }),
  water_baptisms: Yup.string()
    .required('Required')
    .matches(/^[0-9]+$/, 'Must be a valid number')
    .test('positive', 'Must be a positive number', value => {
      return value ? parseInt(value) >= 0 : false;
    }),
  liw_class_count: Yup.string()
    .required('Required')
    .matches(/^[0-9]+$/, 'Must be a valid number')
    .test('positive', 'Must be a positive number', value => {
      return value ? parseInt(value) >= 0 : false;
    }),
  liw_class_total_students: Yup.string()
    .required('Required')
    .matches(/^[0-9]+$/, 'Must be a valid number')
    .test('positive', 'Must be a positive number', value => {
      return value ? parseInt(value) >= 0 : false;
    }),
  number_of_leaders_in_training_for_cpm: Yup.string()
    .required('Required')
    .matches(/^[0-9]+$/, 'Must be a valid number')
    .test('positive', 'Must be a positive number', value => {
      return value ? parseInt(value) >= 0 : false;
    }),
  givings: Yup.string()
    .required('Required')
    .matches(/^[0-9]+$/, 'Must be a valid number')
    .test('positive', 'Must be a positive number', value => {
      return value ? parseInt(value) >= 0 : false;
    }),
  mfp_givings: Yup.string()
    .required('Required')
    .matches(/^[0-9]+$/, 'Must be a valid number')
    .test('positive', 'Must be a positive number', value => {
      return value ? parseInt(value) >= 0 : false;
    }),
});

// Validation schema for the entire form
export const FormSchema = Yup.object().shape({
  weeks: Yup.array().of(
    Yup.object().shape({
      week: Yup.number().required(),
      adult_attendance: WeekDataSchema.fields.adult_attendance,
      youth_attendance: WeekDataSchema.fields.youth_attendance,
      child_attendance: WeekDataSchema.fields.child_attendance,
      number_of_service_for_children: WeekDataSchema.fields.number_of_service_for_children,
      cell_group_count: WeekDataSchema.fields.cell_group_count,
      cell_group_weekly_attendance: WeekDataSchema.fields.cell_group_weekly_attendance,
      prayer_meeting_count: WeekDataSchema.fields.prayer_meeting_count,
      prayer_meeting_weekly_attendance: WeekDataSchema.fields.prayer_meeting_weekly_attendance,
      new_decisions: WeekDataSchema.fields.new_decisions,
      active_disciples: WeekDataSchema.fields.active_disciples,
      water_baptisms: WeekDataSchema.fields.water_baptisms,
      liw_class_count: WeekDataSchema.fields.liw_class_count,
      liw_class_total_students: WeekDataSchema.fields.liw_class_total_students,
      number_of_leaders_in_training_for_cpm: WeekDataSchema.fields.number_of_leaders_in_training_for_cpm,
      givings: WeekDataSchema.fields.givings,
      mfp_givings: WeekDataSchema.fields.mfp_givings,
    }),
  ),
});

// Constants
export const REQUIRED_FIELDS = [
  'adult_attendance', 'youth_attendance', 'child_attendance', 'number_of_service_for_children',
  'cell_group_count', 'cell_group_weekly_attendance', 'prayer_meeting_count', 'prayer_meeting_weekly_attendance',
  'new_decisions', 'active_disciples', 'water_baptisms', 'liw_class_count', 'liw_class_total_students',
  'number_of_leaders_in_training_for_cpm', 'givings', 'mfp_givings'
];

export const TAB_WIDTH = 150; // Fixed width for each tab item
export const TAB_MARGIN = 8; // Horizontal margin
export const TAB_TOTAL_WIDTH = TAB_WIDTH + (TAB_MARGIN * 2);

export const FIRST_WEEK_START = new Date(2024, 1, 2);

// Helper functions
export const formatDate = (date: Date) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  return `${day} ${month}`;
};

export const createWeekRoute = (week: number, index: number) => {
  const startDate = new Date(FIRST_WEEK_START);
  startDate.setDate(FIRST_WEEK_START.getDate() + index * 7);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  return {
    key: `week${week}`,
    title: `Week ${week}\n(${formatDate(startDate)} - ${formatDate(endDate)})`,
  };
};

export const createInitialWeekData = (week: number): WeekData => ({
  week,
  adult_attendance: '',
  youth_attendance: '',
  child_attendance: '',
  number_of_service_for_children: '',
  cell_group_count: '',
  cell_group_weekly_attendance: '',
  prayer_meeting_count: '',
  prayer_meeting_weekly_attendance: '',
  new_decisions: '',
  active_disciples: '',
  water_baptisms: '',
  liw_class_count: '',
  liw_class_total_students: '',
  number_of_leaders_in_training_for_cpm: '',
  givings: '',
  mfp_givings: '',
});

// Legacy schemas (keeping for backward compatibility)
// export const WeeklyReportOptionSchema = Yup.object().shape({
//   adults: Yup.string().required('Required'),
//   children: Yup.string().required('Required'),
// });

// export const WeeklyReportItemSchema = Yup.object().shape({
//   adults: Yup.string().required('Please enter number of adults'),
//   children: Yup.string().required('Please enter number of children'),
// });