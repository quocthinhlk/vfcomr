import React, {useMemo} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {COLORS} from '../../../../shared/constants/colors';
import {ms} from '../../../../shared/utils/scale';
import {
  ErrorBanner,
  GenerateButton,
  HintText,
  ReportFiles,
  ReportOption,
  ReportPanel,
} from '../../components/ReportFormParts';
import {hasReportText, reportTypeName, useReportText} from '../../reportTexts';
import type {ReportOptionDef} from '../../reportPages';
import type {ReportCatalog} from '../../services/report.service';
import type {CurrentUser, useReportGenerator} from '../../hooks/useReportData';

export type ReportPageProps = {
  catalog: ReportCatalog;
  me: CurrentUser;
};

export type Generator = ReturnType<typeof useReportGenerator>;

/** Panel + error + form + Generate button + resulting files, like the web cards. */
export function ReportFrame({
  title,
  description,
  generator,
  buttonLabel,
  onGenerate,
  disabled = false,
  children,
}: {
  /** Panel title; empty for the web's simple pages (title in the header). */
  title?: string;
  description?: string;
  generator: Generator;
  buttonLabel: string;
  onGenerate: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <ReportPanel title={title}>
      {description ? <HintText text={description} /> : null}
      <ErrorBanner message={generator.errorMessage} />
      {children}
      <GenerateButton
        label={buttonLabel}
        onPress={onGenerate}
        loading={generator.submitting}
        disabled={disabled || generator.openingUrl != null}
      />
      {generator.infoMessage ? (
        <View>
          <HintText text={generator.infoMessage} />
        </View>
      ) : null}
      <ReportFiles
        files={generator.files}
        onOpen={file => {
          void generator.openFile(file);
        }}
        busyUrl={generator.openingUrl}
        disabled={generator.submitting}
      />
      {generator.openingUrl ? (
        <ActivityIndicator color={COLORS.mainColor} style={{marginTop: ms(8)}} />
      ) : null}
    </ReportPanel>
  );
}

/** Month dropdown items 1–12 with the web's month names. */
export function useMonthItems() {
  const {rt} = useReportText();
  return useMemo(
    () => Array.from({length: 12}, (_, index) => ({label: rt(`months.${index + 1}`), value: String(index + 1)})),
    [rt],
  );
}

/**
 * Web option list: the catalog's types for `group` (or the defaults when the
 * catalog has none), named by `nameKey` when the web defines one, with code and hint.
 */
export function useCatalogOptions(
  catalog: ReportCatalog,
  group: string,
  defs: ReportOptionDef[],
): ReportOption[] {
  const {rt, language} = useReportText();
  return useMemo(() => {
    const byId = new Map(defs.map(def => [def.id, def]));
    const ids = catalog.reportTypes[group]?.length
      ? catalog.reportTypes[group]
      : defs.map(def => def.id);
    return ids.map(id => {
      const def = byId.get(id);
      const name =
        def?.nameKey && hasReportText(def.nameKey) ? rt(def.nameKey) : reportTypeName(language, id);
      return {
        id,
        name,
        code: def?.code ?? '',
        hint: def?.hintKey && hasReportText(def.hintKey) ? rt(def.hintKey) : '',
      };
    });
  }, [catalog, defs, group, language, rt]);
}

/** Keep a selection valid for the current options (web: first option by default). */
export function pickValid(current: string | null, options: ReportOption[]): string | null {
  if (current && options.some(option => option.id === current)) {
    return current;
  }
  return options[0]?.id ?? null;
}
