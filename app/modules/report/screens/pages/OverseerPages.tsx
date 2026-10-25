import React, {useEffect, useMemo, useState} from 'react';
import {View} from 'react-native';
import {
  FieldLabel,
  ReportDropdown,
  ReportOption,
  ReportRadioList,
  RequiredText,
  SectionTitle,
  reportFormStyles,
} from '../../components/ReportFormParts';
import {useReportText} from '../../reportTexts';
import {EVENT_STYLE_PAGES, ReportPageId} from '../../reportPages';
import {listReportOverseers, NamedId, researchYearPeriods, yearOptions} from '../../services/report.service';
import {useOverseerList, useReportGenerator, useUserSearch} from '../../hooks/useReportData';
import {useTranslation} from '../../../../shared/hooks/useTranslation';
import type {TranslationKey} from '../../../../shared/translations/types';
import {pickValid, ReportFrame, ReportPageProps} from './shared';

const CURRENT_YEAR = new Date().getFullYear();

/* ------------------------------------------------------------------ */
/* Overseer Goals Only / Reg. Goals (#36) / Goals & Actuals (#37) / 3 year (#38) */
/* Web "EventStyleReport": Leader + End Year → generate-reports/event    */
/* ------------------------------------------------------------------ */

export function EventStylePage({me, pageId}: ReportPageProps & {pageId: ReportPageId}) {
  const {rt} = useReportText();
  const generator = useReportGenerator();
  const users = useUserSearch();
  const config = EVENT_STYLE_PAGES[pageId]!;
  // Web: Leader starts as the signed-in user, End Year as this year.
  const [userId, setUserId] = useState<number | null>(me.id);
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const {ensure} = users;
  const years = useMemo(() => yearOptions(15, 1).map(value => ({label: value, value})), []);

  useEffect(() => {
    ensure({id: me.id, label: me.name});
  }, [ensure, me.id, me.name]);

  const onGenerate = () => {
    const nextErrors = {user: userId == null, year: !year};
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }
    void generator.generate(
      'event',
      {user_id: userId, end_year: Number(year), report_type: config.reportType},
      `${config.reportType}.pdf`,
    );
  };

  return (
    <ReportFrame
      description={rt(config.descriptionKey)}
      generator={generator}
      buttonLabel={rt('generateReport.generateButton')}
      onGenerate={onGenerate}>
      <View style={reportFormStyles.field}>
        <FieldLabel label={rt('generateReport.labelUser')} error={errors.user} />
        <ReportDropdown
          value={userId}
          items={users.items.map(item => ({label: item.label, value: item.id}))}
          onChange={value => {
            setUserId(value == null || value === '' ? null : Number(value));
            setErrors(current => ({...current, user: false}));
          }}
          error={errors.user}
          onSearchText={users.search}
          onEndReached={users.loadMore}
        />
        <RequiredText show={!!errors.user} />
      </View>
      <View style={reportFormStyles.field}>
        <FieldLabel label={rt('generateReport.labelEndYear')} error={errors.year} />
        <ReportDropdown
          value={year}
          items={years}
          onChange={value => {
            setYear(value == null ? '' : String(value));
            setErrors(current => ({...current, year: false}));
          }}
          error={errors.year}
        />
        <RequiredText show={!!errors.year} />
      </View>
    </ReportFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Overseer Goals & Actuals 3Yrs (#40) (web: /generate-reports/overseer-goals-actuals-3-year) */
/* ------------------------------------------------------------------ */

const GOALS_3YR_REPORT_TYPE = '40';

/** Web: 3-year goal periods ending this year down to 20 years ago ("2024 - 2026"). */
function goalPeriods(): {id: string; label: string; startYear: number; endYear: number}[] {
  const periods = [];
  for (let end = CURRENT_YEAR; end >= CURRENT_YEAR - 20; end -= 1) {
    const start = end - 2;
    periods.push({id: String(start), label: `${start} - ${end}`, startYear: start, endYear: end});
  }
  return periods;
}

export function OverseerGoals3YearPage(_props: ReportPageProps) {
  const {rt} = useReportText();
  const generator = useReportGenerator();
  const overseers = useOverseerList();
  const periods = useMemo(goalPeriods, []);
  const [overseerId, setOverseerId] = useState<number | null>(null);
  const [periodId, setPeriodId] = useState(String(CURRENT_YEAR - 2));
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const onGenerate = () => {
    const period = periods.find(item => item.id === periodId);
    const nextErrors = {overseer: overseerId == null, period: !period};
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean) || !period) {
      return;
    }
    void generator.generate(
      'event',
      {
        user_id: overseerId,
        report_type: GOALS_3YR_REPORT_TYPE,
        start_year: period.startYear,
        end_year: period.endYear,
      },
      'overseer-goals-actuals-3yrs.pdf',
    );
  };

  return (
    <ReportFrame
      title={rt('generateReport.overseerOverviewReport')}
      generator={generator}
      buttonLabel={rt('generateReport.generateShort')}
      onGenerate={onGenerate}>
      <View style={reportFormStyles.field}>
        <FieldLabel label={rt('generateReport.labelOverseer')} required error={errors.overseer} />
        <ReportDropdown
          value={overseerId}
          items={overseers.map(item => ({label: item.label, value: item.id}))}
          onChange={value => {
            setOverseerId(value == null || value === '' ? null : Number(value));
            setErrors(current => ({...current, overseer: false}));
          }}
          error={errors.overseer}
        />
        <RequiredText show={!!errors.overseer} />
      </View>
      <View style={reportFormStyles.field}>
        <FieldLabel label={rt('generateReport.labelGoalPeriod')} error={errors.period} />
        <ReportDropdown
          value={periodId}
          items={periods.map(item => ({label: item.label, value: item.id}))}
          onChange={value => value != null && setPeriodId(String(value))}
          error={errors.period}
          search={false}
        />
      </View>
    </ReportFrame>
  );
}

/* ------------------------------------------------------------------ */
/* UAOG Public Search Log (web: /generate-reports/uaog-public-search-log) */
/* ------------------------------------------------------------------ */

export function UaogSearchLogPage(_props: ReportPageProps) {
  const {rt} = useReportText();
  const generator = useReportGenerator();
  return (
    <ReportFrame
      description={rt('generateReport.uaogSearchLogDescription')}
      generator={generator}
      buttonLabel={rt('generateReport.generateButton')}
      onGenerate={() => {
        void generator.generate('uaogSearchLog', {}, 'uaog-public-search-log.pdf');
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Research Info Reports (app only, from the client's sketch)           */
/* ------------------------------------------------------------------ */

const RESEARCH_NAME_KEY: Record<string, TranslationKey> = {
  '45_mfp_missions_giving': 'report45MfpMissionsGiving',
  '46_gt_liw_classes': 'report46GtLiwClasses',
  '47_cell_group': 'report47CellGroup',
  '48_tither_offering': 'report48TitherOffering',
};

export function ResearchInfoPage({catalog, me}: ReportPageProps) {
  const {t} = useTranslation();
  const generator = useReportGenerator();
  const periods = useMemo(() => researchYearPeriods(), []);
  const [overseers, setOverseers] = useState<NamedId[]>([]);
  const [overseerId, setOverseerId] = useState<number | null>(me.id);
  // Default: the last full year pair (e.g. 2025-2026 during 2026).
  const [period, setPeriod] = useState(periods[1] ?? periods[0]);
  const [selected, setSelected] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const options = useMemo<ReportOption[]>(
    () =>
      (catalog.reportTypes.overseer_researching ?? Object.keys(RESEARCH_NAME_KEY)).map(id => ({
        id,
        name: RESEARCH_NAME_KEY[id] ? t(RESEARCH_NAME_KEY[id]) : id,
      })),
    [catalog, t],
  );
  useEffect(() => {
    setSelected(current => pickValid(current, options));
  }, [options]);

  const loadOverseers = (search: string) => {
    listReportOverseers(search, 30)
      .then(list => {
        setOverseers(
          list.some(item => item.id === me.id) || search ? list : [{id: me.id, label: me.name}, ...list],
        );
      })
      .catch(() => {});
  };
  useEffect(() => {
    loadOverseers('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onGenerate = () => {
    const nextErrors = {overseer: overseerId == null, period: !period};
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean) || !selected) {
      return;
    }
    void generator.generate(
      'overseerResearching',
      {overseer_user_id: overseerId, year_period: period, report_type: selected},
      `${selected}.pdf`,
    );
  };

  return (
    <ReportFrame
      title={t('reportGroupOverseerResearching')}
      generator={generator}
      buttonLabel={t('generate')}
      onGenerate={onGenerate}>
      <View style={reportFormStyles.field}>
        <FieldLabel label={t('overseer')} error={errors.overseer} />
        <ReportDropdown
          value={overseerId}
          items={overseers.map(item => ({label: item.label, value: item.id}))}
          onChange={value => {
            setOverseerId(value == null || value === '' ? null : Number(value));
            setErrors(current => ({...current, overseer: false}));
          }}
          error={errors.overseer}
          onSearchText={loadOverseers}
        />
        <RequiredText show={!!errors.overseer} />
      </View>
      <View style={reportFormStyles.field}>
        <FieldLabel label={t('reportingPeriod')} />
        <ReportDropdown
          value={period}
          items={periods.map(value => ({label: value, value}))}
          onChange={value => value != null && setPeriod(String(value))}
          search={false}
        />
      </View>
      <View style={reportFormStyles.field}>
        <SectionTitle title={t('reportType')} />
        <ReportRadioList options={options} value={selected} onChange={setSelected} />
      </View>
    </ReportFrame>
  );
}
