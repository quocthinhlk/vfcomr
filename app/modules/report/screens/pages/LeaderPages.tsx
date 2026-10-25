import React, {useEffect, useMemo, useState} from 'react';
import {View} from 'react-native';
import {
  FieldLabel,
  HintText,
  ReportDropdown,
  ReportOption,
  ReportRadioList,
  RequiredText,
  SectionTitle,
  ToggleLink,
  YearStepper,
  reportFormStyles,
} from '../../components/ReportFormParts';
import {hasReportText, useReportText} from '../../reportTexts';
import {
  ACCESS_RIGHTS_OPTIONS,
  DIRECTORY_OPTIONS,
  directoryOptionsForRole,
  LEADERS_GRAPH_OPTIONS,
  LEADERS_SHEET_OPTIONS,
} from '../../reportPages';
import {useRegionLists, useReportGenerator, useUserSearch} from '../../hooks/useReportData';
import {pickValid, ReportFrame, ReportPageProps, useCatalogOptions} from './shared';

const CURRENT_YEAR = new Date().getFullYear();

function useLeaderField(initial: number | null = null) {
  const users = useUserSearch();
  const [userId, setUserId] = useState<number | null>(initial);
  const items = useMemo(
    () => users.items.map(item => ({label: item.label, value: item.id})),
    [users.items],
  );
  return {users, userId, setUserId, items};
}

/* ------------------------------------------------------------------ */
/* Leaders Spreadsheet Reports (web: /generate-reports/leaders-spreadsheet) */
/* ------------------------------------------------------------------ */

export function LeadersSpreadsheetPage({catalog}: ReportPageProps) {
  const {rt} = useReportText();
  const generator = useReportGenerator();
  const leader = useLeaderField();
  const lists = useRegionLists(['geo']);
  const options = useCatalogOptions(catalog, 'user_data', LEADERS_SHEET_OPTIONS);
  const [limitScope, setLimitScope] = useState(false);
  const [geoId, setGeoId] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(CURRENT_YEAR);
  const [selected, setSelected] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSelected(current => pickValid(current, options));
  }, [options]);

  const onGenerate = () => {
    const nextErrors = {user: leader.userId == null, year: year == null};
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean) || !selected) {
      return;
    }
    void generator.generate(
      'userData',
      {
        user_id: leader.userId,
        geographical_region_id: limitScope ? geoId : null,
        end_year: Number(year),
        report_type: selected,
      },
      `${selected}.pdf`,
    );
  };

  return (
    <ReportFrame
      title={rt('generateReport.leadersDataReports')}
      generator={generator}
      buttonLabel={rt('generateReport.generateShort')}
      onGenerate={onGenerate}>
      <View style={reportFormStyles.field}>
        <FieldLabel label={rt('generateReport.labelUser')} error={errors.user} />
        <ToggleLink
          label={rt(
            limitScope ? 'generateReport.hideGeographicScope' : 'generateReport.limitGeographicScope',
          )}
          open={limitScope}
          onPress={() => {
            // Web: hiding the scope clears the region.
            if (limitScope) {
              setGeoId(null);
            }
            setLimitScope(!limitScope);
          }}
        />
        <ReportDropdown
          value={leader.userId}
          items={leader.items}
          onChange={value => {
            leader.setUserId(value == null || value === '' ? null : Number(value));
            setErrors(current => ({...current, user: false}));
          }}
          placeholder={rt('generateReport.selectALeader')}
          error={errors.user}
          onSearchText={leader.users.search}
          onEndReached={leader.users.loadMore}
        />
        <RequiredText show={!!errors.user} />
      </View>
      {limitScope ? (
        <View style={reportFormStyles.field}>
          <FieldLabel label={rt('generateReport.labelGeographicalRegion')} />
          <ReportDropdown
            value={geoId}
            items={lists.geo.map(item => ({label: item.label, value: item.id}))}
            onChange={value => setGeoId(value == null || value === '' ? null : Number(value))}
          />
        </View>
      ) : null}
      <View style={reportFormStyles.field}>
        <FieldLabel label={rt('generateReport.labelReportBackFromYear')} error={errors.year} />
        <YearStepper
          value={year}
          onChange={next => {
            setYear(next);
            setErrors(current => ({...current, year: false}));
          }}
          label={rt('generateReport.labelReportBackFromYear')}
          error={errors.year}
        />
        <RequiredText show={!!errors.year} />
      </View>
      <HintText text={rt('generateReport.leadersYearHint')} />
      <View style={reportFormStyles.field}>
        <SectionTitle title={rt('generateReport.sectionDataReports')} />
        <ReportRadioList options={options} value={selected} onChange={setSelected} />
      </View>
    </ReportFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Leaders Graph Reports (web: /generate-reports/leaders-graph)         */
/* ------------------------------------------------------------------ */

export function LeadersGraphPage({catalog}: ReportPageProps) {
  const {rt} = useReportText();
  const generator = useReportGenerator();
  const leader = useLeaderField();
  const options = useCatalogOptions(catalog, 'user_graph', LEADERS_GRAPH_OPTIONS);
  const [year, setYear] = useState<number | null>(CURRENT_YEAR);
  const [selected, setSelected] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSelected(current => pickValid(current, options));
  }, [options]);

  const onGenerate = () => {
    const nextErrors = {user: leader.userId == null, year: year == null};
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean) || !selected) {
      return;
    }
    void generator.generate(
      'userGraph',
      {user_id: leader.userId, end_year: Number(year), report_type: selected},
      `${selected}.pdf`,
    );
  };

  return (
    <ReportFrame
      title={rt('generateReport.leadersGraphTitle')}
      generator={generator}
      buttonLabel={rt('generateReport.generateShort')}
      onGenerate={onGenerate}>
      <View style={reportFormStyles.field}>
        <FieldLabel label={rt('generateReport.labelVisitUser')} error={errors.user} />
        <ReportDropdown
          value={leader.userId}
          items={leader.items}
          onChange={value => {
            leader.setUserId(value == null || value === '' ? null : Number(value));
            setErrors(current => ({...current, user: false}));
          }}
          placeholder={rt('generateReport.selectAUser')}
          error={errors.user}
          onSearchText={leader.users.search}
          onEndReached={leader.users.loadMore}
        />
        <RequiredText show={!!errors.user} />
      </View>
      <View style={reportFormStyles.field}>
        <FieldLabel label={rt('generateReport.labelReportBackFromYear')} error={errors.year} />
        <YearStepper
          value={year}
          onChange={next => {
            setYear(next);
            setErrors(current => ({...current, year: false}));
          }}
          label={rt('generateReport.labelReportBackFromYear')}
          error={errors.year}
        />
        <RequiredText show={!!errors.year} />
      </View>
      <HintText text={rt('generateReport.leadersYearHint')} />
      <View style={reportFormStyles.field}>
        <SectionTitle title={rt('generateReport.sectionGraphReports')} />
        <ReportRadioList options={options} value={selected} onChange={setSelected} />
      </View>
    </ReportFrame>
  );
}

/* ------------------------------------------------------------------ */
/* My Directory (web: /generate-reports/my-directory)                   */
/* ------------------------------------------------------------------ */

export function MyDirectoryPage({me}: ReportPageProps) {
  const {rt} = useReportText();
  const generator = useReportGenerator();
  // Web: no report is pre-selected; the list depends on the role.
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const options = useMemo<ReportOption[]>(() => {
    const allowed = directoryOptionsForRole(me.roleId);
    return DIRECTORY_OPTIONS.filter(option => allowed.includes(option.id)).map(option => ({
      id: option.id,
      name: rt(option.nameKey),
      code: option.code,
    }));
  }, [me.roleId, rt]);

  const onGenerate = () => {
    if (!selected) {
      setError(true);
      return;
    }
    void generator.generate('myDirectory', {sort_by: selected}, `my-directory-${selected}.pdf`);
  };

  return (
    <ReportFrame
      title={rt('generateReport.myDirectoryTitle')}
      generator={generator}
      buttonLabel={rt('generateReport.generateShort')}
      onGenerate={onGenerate}>
      <View style={reportFormStyles.field}>
        <FieldLabel label={rt('generateReport.labelSelectReport')} error={error} />
        <ReportRadioList
          options={options}
          value={selected}
          onChange={id => {
            setSelected(id);
            setError(false);
          }}
        />
        <RequiredText show={error} />
      </View>
      <HintText text={rt('generateReport.myDirectoryHint')} />
    </ReportFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Overseer Access Rights Report (web: /generate-reports/overseer-access-rights) */
/* ------------------------------------------------------------------ */

export function AccessRightsPage(_props: ReportPageProps) {
  const {rt} = useReportText();
  const generator = useReportGenerator();
  const leader = useLeaderField();
  // Web default: #42.
  const [selected, setSelected] = useState<string>(ACCESS_RIGHTS_OPTIONS[1].id);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const options = useMemo<ReportOption[]>(
    () =>
      ACCESS_RIGHTS_OPTIONS.map(option => ({
        id: option.id,
        name: hasReportText(option.nameKey) ? rt(option.nameKey) : option.id,
        code: option.code,
      })),
    [rt],
  );

  const onGenerate = () => {
    const nextErrors = {user: leader.userId == null};
    setErrors(nextErrors);
    if (nextErrors.user) {
      return;
    }
    void generator.generate(
      'overseerAccessRights',
      {user_id: leader.userId, report_type: selected},
      'overseer-access-rights.pdf',
    );
  };

  return (
    <ReportFrame
      title={rt('generateReport.accessRightsPanel')}
      generator={generator}
      buttonLabel={rt('generateReport.generateShort')}
      onGenerate={onGenerate}>
      <View style={reportFormStyles.field}>
        <FieldLabel
          label={rt('generateReport.labelUser')}
          help={rt('generateReport.accessRightsLeaderHelp')}
          error={errors.user}
        />
        <ReportDropdown
          value={leader.userId}
          items={leader.items}
          onChange={value => {
            if (value != null && value !== '') {
              leader.setUserId(Number(value));
              setErrors(current => ({...current, user: false}));
            }
          }}
          placeholder={rt('generateReport.selectALeader')}
          error={errors.user}
          onSearchText={leader.users.search}
          onEndReached={leader.users.loadMore}
        />
        <RequiredText show={!!errors.user} />
      </View>
      <View style={reportFormStyles.field}>
        <SectionTitle title={rt('generateReport.accessRightsSection')} />
        <ReportRadioList options={options} value={selected} onChange={setSelected} />
      </View>
    </ReportFrame>
  );
}
