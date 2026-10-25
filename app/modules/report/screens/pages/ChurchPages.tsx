import React, {useEffect, useMemo, useState} from 'react';
import {View} from 'react-native';
import {
  FieldLabel,
  FormatChoice,
  HintText,
  ReportDropdown,
  ReportMultiSelect,
  ReportOption,
  ReportRadioList,
  RequiredText,
  SectionTitle,
  reportFormStyles,
} from '../../components/ReportFormParts';
import {hasReportText, useReportText} from '../../reportTexts';
import {
  CHURCH_ENDPOINT_GROUP,
  CHURCH_OPTIONS,
  CHURCH_SECTIONS,
  MULTI_CHURCH_OPTIONS,
  MULTI_CHURCH_VISITS,
  STATUS_OPTIONS,
} from '../../reportPages';
import {yearOptions, yearsSince1980} from '../../services/report.service';
import {
  useChurchSearch,
  useRegionLists,
  useReportGenerator,
  useUserSearch,
} from '../../hooks/useReportData';
import {pickValid, ReportFrame, ReportPageProps, useCatalogOptions, useMonthItems} from './shared';

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const CURRENT_MONTH = String(now.getMonth() + 1);
/** Web: `yearOptions(currentYear - 1500, 5)` → 5 years ahead down to 1500. */
const WIDE_YEARS = yearOptions(CURRENT_YEAR - 1500, 5);
const toItems = (values: string[]) => values.map(value => ({label: value, value}));

/* ------------------------------------------------------------------ */
/* Church Reports (web: /generate-reports/church)                       */
/* ------------------------------------------------------------------ */

export function ChurchReportPage({catalog}: ReportPageProps) {
  const {rt} = useReportText();
  const generator = useReportGenerator();
  const churches = useChurchSearch();
  const monthItems = useMonthItems();
  const [churchId, setChurchId] = useState<number | null>(null);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [selected, setSelected] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Only the options the API offers (catalog group of each option's endpoint).
  const available = useMemo(
    () =>
      CHURCH_OPTIONS.filter(option =>
        (catalog.reportTypes[CHURCH_ENDPOINT_GROUP[option.endpoint]] ?? []).includes(option.id),
      ),
    [catalog],
  );
  const sections = useMemo(
    () =>
      CHURCH_SECTIONS.map(section => ({
        ...section,
        options: available
          .filter(option => option.group === section.key)
          .map<ReportOption>(option => ({
            id: option.id,
            name: rt(option.nameKey),
            code: option.code,
            hint: option.hintKey && hasReportText(option.hintKey) ? rt(option.hintKey) : '',
          })),
      })).filter(section => section.options.length > 0),
    [available, rt],
  );

  useEffect(() => {
    setSelected(current =>
      current && available.some(option => option.id === current) ? current : available[0]?.id ?? null,
    );
  }, [available]);

  const option = available.find(item => item.id === selected) ?? null;
  const needsMonth = option ? !option.yearOnly : false;

  const onGenerate = () => {
    const nextErrors = {church: churchId == null, year: !year, month: needsMonth && !month};
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean) || !option) {
      return;
    }
    const body: Record<string, unknown> = {
      church_id: churchId,
      end_year: Number(year),
      report_type: option.id,
      msc_report_type: 1,
    };
    if (needsMonth) {
      body.end_month = Number(month);
    }
    void generator.generate(option.endpoint, body, `${option.id}.pdf`);
  };

  return (
    <ReportFrame
      title={rt('generateReport.churchTitle')}
      generator={generator}
      buttonLabel={rt('generateReport.generateShort')}
      onGenerate={onGenerate}
      disabled={!selected}>
      <View style={reportFormStyles.field}>
        <FieldLabel label={rt('generateReport.labelChurch')} error={errors.church} />
        <ReportDropdown
          value={churchId}
          items={churches.items.map(item => ({label: item.label, value: item.id}))}
          onChange={value => {
            setChurchId(value == null || value === '' ? null : Number(value));
            setErrors(current => ({...current, church: false}));
          }}
          placeholder={rt('generateReport.selectAChurch')}
          error={errors.church}
          onSearchText={churches.search}
          onEndReached={churches.loadMore}
        />
        <RequiredText show={!!errors.church} />
      </View>
      <View style={reportFormStyles.field}>
        <FieldLabel label={rt('generateReport.labelReportBackFrom')} />
        <View style={reportFormStyles.row}>
          {needsMonth ? (
            <View style={reportFormStyles.rowItem}>
              <ReportDropdown
                value={month}
                items={monthItems}
                onChange={value => value != null && setMonth(String(value))}
                placeholder={rt('generateReport.placeholderMonth')}
                error={errors.month}
                search={false}
              />
            </View>
          ) : null}
          <View style={reportFormStyles.rowItem}>
            <ReportDropdown
              value={year}
              items={toItems(WIDE_YEARS)}
              onChange={value => value != null && setYear(String(value))}
              placeholder={rt('generateReport.placeholderYear')}
              error={errors.year}
            />
          </View>
        </View>
      </View>
      <HintText text={rt('generateReport.churchReportBackHint')} />
      {sections.map(section => (
        <View key={section.key} style={reportFormStyles.field}>
          <SectionTitle title={rt(section.titleKey)} />
          <ReportRadioList options={section.options} value={selected} onChange={setSelected} />
        </View>
      ))}
    </ReportFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Churches Reporting Status (web: /generate-reports/church-reporting-status) */
/* ------------------------------------------------------------------ */

export function ChurchStatusPage({catalog, me}: ReportPageProps) {
  const {rt} = useReportText();
  const generator = useReportGenerator();
  const users = useUserSearch();
  const monthItems = useMonthItems();
  const options = useCatalogOptions(catalog, 'church_report_status', STATUS_OPTIONS);
  // Web: "Report on" starts with the signed-in user.
  const [userId, setUserId] = useState<number | null>(me.id);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [selected, setSelected] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const {ensure} = users;

  useEffect(() => {
    ensure({id: me.id, label: me.name});
  }, [ensure, me.id, me.name]);
  useEffect(() => {
    setSelected(current => pickValid(current, options));
  }, [options]);

  const monthName = monthItems.find(item => item.value === month)?.label || '';
  const onGenerate = () => {
    const nextErrors = {user: userId == null, month: !month, year: !year};
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean) || !selected) {
      return;
    }
    void generator.generate(
      'churchReportStatus',
      {user_id: userId, end_month: Number(month), end_year: Number(year), report_type: selected},
      `${selected}.pdf`,
    );
  };

  return (
    <ReportFrame
      title={rt('generateReport.statusReportOverseer')}
      generator={generator}
      buttonLabel={rt('generateReport.generateShort')}
      onGenerate={onGenerate}>
      <View style={reportFormStyles.field}>
        <FieldLabel label={rt('generateReport.labelReportOn')} error={errors.user} />
        <ReportDropdown
          value={userId}
          items={users.items.map(item => ({label: item.label, value: item.id}))}
          onChange={value => {
            if (value != null && value !== '') {
              setUserId(Number(value));
              setErrors(current => ({...current, user: false}));
            }
          }}
          placeholder={rt('generateReport.selectUser')}
          error={errors.user}
          onSearchText={users.search}
          onEndReached={users.loadMore}
        />
        <RequiredText show={!!errors.user} />
      </View>
      <View style={reportFormStyles.field}>
        <FieldLabel label={rt('generateReport.labelReport1YearBackFrom')} />
        <View style={reportFormStyles.row}>
          <View style={reportFormStyles.rowItem}>
            <ReportDropdown
              value={month}
              items={monthItems}
              onChange={value => value != null && setMonth(String(value))}
              placeholder={rt('generateReport.placeholderMonth')}
              search={false}
            />
          </View>
          <View style={reportFormStyles.rowItem}>
            <ReportDropdown
              value={year}
              items={toItems(yearsSince1980())}
              onChange={value => value != null && setYear(String(value))}
              placeholder={rt('generateReport.placeholderYear')}
            />
          </View>
        </View>
      </View>
      <HintText
        text={rt('generateReport.report1YearBackHint', {
          month: monthName,
          year,
          fromYear: year ? String(Number(year) - 1) : '',
        })}
      />
      <View style={reportFormStyles.field}>
        <SectionTitle title={rt('generateReport.sectionDataReports')} />
        <ReportRadioList options={options} value={selected} onChange={setSelected} />
      </View>
    </ReportFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Other Reports on Churches (web: /generate-reports/multi-church)      */
/* ------------------------------------------------------------------ */

export function MultiChurchPage({catalog}: ReportPageProps) {
  const {rt} = useReportText();
  const generator = useReportGenerator();
  const lists = useRegionLists(['geo', 'church', 'language', 'countries']);
  const options = useCatalogOptions(catalog, 'multi_church', MULTI_CHURCH_OPTIONS);
  const [geoIds, setGeoIds] = useState<number[]>([]);
  const [churchRegionIds, setChurchRegionIds] = useState<number[]>([]);
  const [languageIds, setLanguageIds] = useState<number[]>([]);
  const [countryIds, setCountryIds] = useState<number[]>([]);
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [selected, setSelected] = useState<string | null>(null);
  const [format, setFormat] = useState<'pdf' | 'xls'>('pdf');

  useEffect(() => {
    setSelected(current => pickValid(current, options));
  }, [options]);
  // Web: the PDF/XLS choice resets to PDF whenever the report changes.
  useEffect(() => {
    setFormat('pdf');
  }, [selected]);

  const isVisits = selected === MULTI_CHURCH_VISITS;
  const toDropdown = (items: {id: number; label: string}[]) =>
    items.map(item => ({label: item.label, value: item.id}));

  const onGenerate = () => {
    if (!selected || (isVisits && !year)) {
      return;
    }
    const body: Record<string, unknown> = {
      geographical_region_ids: geoIds,
      church_region_ids: churchRegionIds,
      language_region_ids: languageIds,
      report_type: selected,
    };
    if (isVisits) {
      body.end_year = Number(year);
    } else {
      body.country_ids = countryIds;
    }
    const pdf = isVisits && format === 'pdf';
    void generator.generate('multiChurch', body, `${selected}.${pdf ? 'pdf' : 'xlsx'}`, pdf ? 'pdf' : 'file');
  };

  return (
    <ReportFrame
      title={rt('generateReport.multiChurchTitle')}
      generator={generator}
      buttonLabel={rt('generateReport.generateShort')}
      onGenerate={onGenerate}>
      <View style={reportFormStyles.field}>
        <FieldLabel label={rt('generateReport.labelGeographicalRegions')} />
        <ReportMultiSelect
          value={geoIds}
          items={toDropdown(lists.geo)}
          onChange={setGeoIds}
          placeholder={rt('generateReport.labelGeographicalRegions')}
          accessibilityLabel={rt('generateReport.labelGeographicalRegions')}
        />
      </View>
      <View style={reportFormStyles.field}>
        <FieldLabel label={rt('generateReport.labelChurchRegions')} />
        <ReportMultiSelect
          value={churchRegionIds}
          items={toDropdown(lists.church)}
          onChange={setChurchRegionIds}
          placeholder={rt('generateReport.labelChurchRegions')}
          accessibilityLabel={rt('generateReport.labelChurchRegions')}
        />
      </View>
      <View style={reportFormStyles.field}>
        <FieldLabel label={rt('generateReport.labelLanguageRegions')} />
        <ReportMultiSelect
          value={languageIds}
          items={toDropdown(lists.language)}
          onChange={setLanguageIds}
          placeholder={rt('generateReport.labelLanguageRegions')}
          accessibilityLabel={rt('generateReport.labelLanguageRegions')}
        />
      </View>
      {isVisits ? (
        <>
          <View style={reportFormStyles.field}>
            <FieldLabel label={rt('generateReport.labelReportBackFrom')} />
            <ReportDropdown
              value={year}
              items={toItems(WIDE_YEARS)}
              onChange={value => value != null && setYear(String(value))}
              placeholder={rt('generateReport.placeholderYear')}
            />
          </View>
          {year ? <HintText text={rt('generateReport.multiChurchYearHint', {year})} /> : null}
        </>
      ) : (
        <View style={reportFormStyles.field}>
          <FieldLabel label={rt('mainMenu.countries')} />
          <ReportMultiSelect
            value={countryIds}
            items={toDropdown(lists.countries)}
            onChange={setCountryIds}
            placeholder={rt('mainMenu.countries')}
            accessibilityLabel={rt('mainMenu.countries')}
          />
        </View>
      )}
      <View style={reportFormStyles.field}>
        <SectionTitle title={rt('generateReport.multiChurchTitle')} />
        <ReportRadioList options={options} value={selected} onChange={setSelected} />
      </View>
      {isVisits ? <FormatChoice value={format} onChange={setFormat} /> : null}
    </ReportFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Visit Reports (web: /generate-reports/visit)                         */
/* ------------------------------------------------------------------ */

const VISIT_REPORT_TYPE = '24_months_visits';

export function VisitReportPage(_props: ReportPageProps) {
  const {rt} = useReportText();
  const generator = useReportGenerator();
  const users = useUserSearch();
  const [userId, setUserId] = useState<number | null>(null);
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const onGenerate = () => {
    const nextErrors = {user: userId == null, year: !year};
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }
    void generator.generate(
      'userData',
      {user_id: userId, end_year: Number(year), report_type: VISIT_REPORT_TYPE},
      `${VISIT_REPORT_TYPE}.xlsx`,
    );
  };

  return (
    <ReportFrame
      title={rt('generateReport.sectionVisitReports')}
      generator={generator}
      buttonLabel={rt('generateReport.generateShort')}
      onGenerate={onGenerate}>
      <View style={reportFormStyles.field}>
        <FieldLabel label={rt('generateReport.labelVisitUser')} error={errors.user} />
        <ReportDropdown
          value={userId}
          items={users.items.map(item => ({label: item.label, value: item.id}))}
          onChange={value => {
            setUserId(value == null || value === '' ? null : Number(value));
            setErrors(current => ({...current, user: false}));
          }}
          placeholder={rt('generateReport.selectAUser')}
          error={errors.user}
          onSearchText={users.search}
          onEndReached={users.loadMore}
        />
        <RequiredText show={!!errors.user} />
      </View>
      <View style={reportFormStyles.field}>
        <FieldLabel label={rt('generateReport.labelReportBackFromYear')} error={errors.year} />
        <ReportDropdown
          value={year}
          items={toItems(WIDE_YEARS)}
          onChange={value => value != null && setYear(String(value))}
          placeholder={rt('generateReport.placeholderYear')}
          error={errors.year}
        />
      </View>
    </ReportFrame>
  );
}
