import React from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text as RNText,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text} from '@ui-kitten/components';
import Svg, {Path, Rect, Text as SvgText} from 'react-native-svg';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import ElementMultiSelect from '../../../shared/components/ElementMultiSelect';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {COLORS} from '../../../shared/constants/colors';
import {fs, hs, ms, rs, ws} from '../../../shared/utils/scale';
import type {ReportDownload, ReportFormat} from '../services/report.service';

export type DropdownItem = {label: string; value: string | number};

/** A report option row: name, web code ("[# 4]") and hint ("weekly data"). */
export type ReportOption = {id: string; name: string; code?: string; hint?: string};

/* ------------------------------------------------------------------ */

/** The web's report card: a titled panel holding the form. */
export function ReportPanel({title, children}: {title?: string; children: React.ReactNode}) {
  const C = useThemedColors();
  return (
    <View style={[styles.panel, {borderColor: C.border, backgroundColor: C.surface}]}>
      {title ? (
        <View style={[styles.panelHeader, {borderBottomColor: C.border}]}>
          <Text style={[styles.panelTitle, {color: C.textPrimary}]}>{title}</Text>
        </View>
      ) : null}
      <View style={styles.panelBody}>{children}</View>
    </View>
  );
}

/** Field label, with an optional "*" and a "?" that shows the web's tooltip text. */
export function FieldLabel({
  label,
  required = false,
  help,
  error = false,
}: {
  label: string;
  required?: boolean;
  help?: string;
  error?: boolean;
}) {
  const C = useThemedColors();
  return (
    <View style={styles.labelRow}>
      <Text style={[styles.label, {color: error ? COLORS.danger : C.textPrimary}]}>
        {label}
        {required ? <RNText style={styles.requiredMark}> *</RNText> : null}
      </Text>
      {help ? (
        <TouchableOpacity
          onPress={() => Alert.alert(label, help)}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
          accessibilityRole="button"
          accessibilityLabel={help}
          style={[styles.helpButton, {borderColor: C.textSecondary}]}>
          <RNText style={[styles.helpText, {color: C.textSecondary}]}>?</RNText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function RequiredText({show}: {show: boolean}) {
  const {t} = useTranslation();
  return show ? <RNText style={styles.errorText}>{t('required')}</RNText> : null;
}

export function ReportDropdown({
  value,
  items,
  onChange,
  placeholder,
  error = false,
  disabled = false,
  search,
  onSearchText,
  onEndReached,
}: {
  value: string | number | null;
  items: DropdownItem[];
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  search?: boolean;
  onSearchText?: (text: string) => void;
  onEndReached?: () => void;
}) {
  const C = useThemedColors();
  const {t} = useTranslation();
  return (
    <ElementDropdown
      data={items}
      value={value}
      onChange={onChange}
      placeholder={placeholder || t('selectOption')}
      disabled={disabled}
      error={error}
      search={search}
      onSearchText={onSearchText}
      onEndReached={onEndReached}
      containerStyle={{
        backgroundColor: C.inputBg,
        borderColor: error ? COLORS.danger : C.inputBorder,
      }}
    />
  );
}

export function ReportMultiSelect({
  value,
  items,
  onChange,
  placeholder,
  disabled = false,
  accessibilityLabel,
}: {
  value: number[];
  items: DropdownItem[];
  onChange: (value: number[]) => void;
  placeholder?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <ElementMultiSelect
      data={items}
      value={value}
      onChange={next => onChange(next.map(Number).filter(Number.isFinite))}
      placeholder={placeholder}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

/** Radio list of report options, like the web's option rows. */
export function ReportRadioList({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: ReportOption[];
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const C = useThemedColors();
  return (
    <View style={styles.radioList}>
      {options.map(option => {
        const selected = option.id === value;
        return (
          <TouchableOpacity
            key={option.id}
            style={styles.radioRow}
            disabled={disabled}
            activeOpacity={0.7}
            onPress={() => onChange(option.id)}
            accessibilityRole="radio"
            accessibilityState={{selected, disabled}}>
            <View
              style={[
                styles.radioOuter,
                {borderColor: selected ? COLORS.mainColor : C.inputBorder},
              ]}>
              {selected ? <View style={styles.radioInner} /> : null}
            </View>
            <RNText style={[styles.radioText, {color: C.textPrimary}]}>
              {option.name}
              {option.code ? (
                <RNText style={[styles.radioCode, {color: C.textSecondary}]}>
                  {'  '}
                  {option.code}
                </RNText>
              ) : null}
              {option.hint ? (
                <RNText style={[styles.radioHint, {color: C.textSecondary}]}>
                  {' '}
                  ({option.hint})
                </RNText>
              ) : null}
            </RNText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Section title inside a panel ("Data Reports", "Graph Reports"…). */
export function SectionTitle({title}: {title: string}) {
  const C = useThemedColors();
  return <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>{title}</Text>;
}

export function HintText({text}: {text: string}) {
  const C = useThemedColors();
  return <Text style={[styles.hint, {color: C.textSecondary}]}>{text}</Text>;
}

/** The web's year stepper: type a year or step it with − / +. */
export function YearStepper({
  value,
  onChange,
  label,
  error = false,
  disabled = false,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  label: string;
  error?: boolean;
  disabled?: boolean;
}) {
  const C = useThemedColors();
  const step = (delta: number) => {
    onChange(value == null ? new Date().getFullYear() : value + delta);
  };
  return (
    <View
      style={[
        styles.stepper,
        {borderColor: error ? COLORS.danger : C.inputBorder, backgroundColor: C.inputBg},
        disabled && styles.disabled,
      ]}>
      <TouchableOpacity
        style={styles.stepperButton}
        disabled={disabled}
        onPress={() => step(-1)}
        accessibilityRole="button"
        accessibilityLabel={`${label} −1`}>
        <RNText style={[styles.stepperSign, {color: C.textPrimary}]}>−</RNText>
      </TouchableOpacity>
      <TextInput
        style={[styles.stepperInput, {color: C.textPrimary}]}
        value={value == null ? '' : String(value)}
        onChangeText={text => {
          const digits = text.replace(/[^0-9]/g, '');
          if (!digits) {
            onChange(null);
            return;
          }
          const next = Number(digits);
          onChange(Number.isFinite(next) ? next : null);
        }}
        keyboardType="number-pad"
        maxLength={4}
        editable={!disabled}
        accessibilityLabel={label}
      />
      <TouchableOpacity
        style={styles.stepperButton}
        disabled={disabled}
        onPress={() => step(1)}
        accessibilityRole="button"
        accessibilityLabel={`${label} +1`}>
        <RNText style={[styles.stepperSign, {color: C.textPrimary}]}>+</RNText>
      </TouchableOpacity>
    </View>
  );
}

/** "+ Limit Geographic Scope" / "− Hide Geographic Scope". */
export function ToggleLink({label, open, onPress}: {label: string; open: boolean; onPress: () => void}) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
      <RNText style={styles.toggleLink}>
        {open ? '− ' : '+ '}
        {label}
      </RNText>
    </TouchableOpacity>
  );
}

export function ErrorBanner({message}: {message: string}) {
  if (!message) {
    return null;
  }
  return (
    <View style={styles.errorBanner}>
      <RNText style={styles.errorBannerText}>{message}</RNText>
    </View>
  );
}

export function GenerateButton({
  label,
  onPress,
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.generateButton, (loading || disabled) && styles.generateButtonBusy]}
      disabled={loading || disabled}
      activeOpacity={0.8}
      onPress={onPress}>
      {loading ? <ActivityIndicator color={COLORS.white} style={styles.generateSpinner} /> : null}
      <RNText style={styles.generateText}>{label}</RNText>
    </TouchableOpacity>
  );
}

/**
 * After a report is generated, one card per format (Excel .xlsx / PDF):
 * tapping the card opens the file; the download button saves it on the device.
 * A format the API did not produce for this report stays visible but disabled.
 */
export function ReportFiles({
  files,
  onOpen,
  onSave,
  busyUrl,
  savingUrl = null,
  disabled = false,
}: {
  files: ReportDownload[];
  onOpen: (file: ReportDownload) => void;
  onSave: (file: ReportDownload) => void;
  busyUrl: string | null;
  savingUrl?: string | null;
  disabled?: boolean;
}) {
  const C = useThemedColors();
  const {t} = useTranslation();
  if (files.length === 0) {
    return null;
  }
  const busy = disabled || busyUrl != null || savingUrl != null;
  const choice = (format: ReportFormat, title: string) => {
    const file = files.find(item => item.label === format);
    const ext = file ? extensionLabel(file.filename) : format === 'pdf' ? '.pdf' : '.xlsx';
    const opening = !!file && busyUrl === file.url;
    const saving = !!file && savingUrl === file.url;
    return (
      <View
        key={format}
        style={[
          styles.formatCard,
          {borderColor: C.border, backgroundColor: C.surface},
          !file && styles.formatCardOff,
        ]}>
        <TouchableOpacity
          style={styles.formatOpen}
          disabled={!file || busy}
          activeOpacity={0.6}
          onPress={() => file && onOpen(file)}
          accessibilityRole="button"
          accessibilityState={{disabled: !file || busy, busy: opening}}
          accessibilityLabel={
            file ? `${t('open')} ${title} ${ext}, ${file.filename}` : `${title}: ${t('formatNotAvailable')}`
          }>
          <ReportFileIcon kind={format} />
          <View style={styles.formatText}>
            <RNText style={[styles.formatTitle, {color: C.textPrimary}]}>
              {title} <RNText style={{color: C.textSecondary}}>({ext})</RNText>
            </RNText>
            <RNText style={[styles.formatSub, {color: C.textSecondary}]} numberOfLines={2}>
              {file ? file.filename : t('formatNotAvailable')}
            </RNText>
          </View>
          {opening ? <ActivityIndicator color={COLORS.mainColor} /> : null}
        </TouchableOpacity>
        {file ? (
          <TouchableOpacity
            style={[styles.formatSave, {borderLeftColor: C.border}]}
            disabled={busy}
            activeOpacity={0.6}
            onPress={() => onSave(file)}
            hitSlop={{top: 6, bottom: 6, left: 4, right: 6}}
            accessibilityRole="button"
            accessibilityState={{disabled: busy, busy: saving}}
            accessibilityLabel={`${t('download')} ${title} ${ext}`}>
            {saving ? (
              <ActivityIndicator color={COLORS.mainColor} />
            ) : (
              <DownloadGlyph color={busy ? C.textSecondary : COLORS.mainColor} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };
  return (
    <View style={[styles.fileList, {borderColor: C.border}]}>
      <RNText style={[styles.readyTitle, {color: C.textPrimary}]}>✓ {t('reportReady')}</RNText>
      <RNText style={[styles.readySub, {color: C.textSecondary}]}>{t('chooseDownloadFormat')}</RNText>
      {choice('excel', 'Excel')}
      {choice('pdf', 'PDF')}
    </View>
  );
}

function extensionLabel(filename: string): string {
  const match = /(\.[a-z0-9]+)$/i.exec(filename);
  return match ? match[1].toLowerCase() : '';
}

function DownloadGlyph({color}: {color: string}) {
  return (
    <Svg width={ws(20)} height={ws(20)} viewBox="0 0 24 24">
      <Path
        d="M12 3v12m0 0-5-5m5 5 5-5M4 19h16"
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ReportFileIcon({kind, small = false}: {kind: ReportFormat; small?: boolean}) {
  const badge = kind === 'pdf' ? '#E53935' : '#1D6F42';
  const label = kind === 'pdf' ? 'PDF' : 'XLS';
  const width = small ? ws(18) : ws(28);
  const height = small ? hs(22) : hs(36);
  return (
    <Svg width={width} height={height} viewBox="0 0 32 40">
      <Path
        d="M7 1.5h13.2L27.5 9v27.2a2.3 2.3 0 0 1-2.3 2.3H7a2.3 2.3 0 0 1-2.3-2.3V3.8A2.3 2.3 0 0 1 7 1.5Z"
        fill="#F7F8FA"
        stroke="#C5CDD6"
      />
      <Path d="M20 1.8V9h7.2" fill="#EEF1F4" stroke="#C5CDD6" />
      <Rect x="3.5" y="23" width="25" height="11" rx="2" fill={badge} />
      <SvgText x="16" y="31" fill="#fff" fontSize="7" fontWeight="700" textAnchor="middle">
        {label}
      </SvgText>
    </Svg>
  );
}

export const reportFormStyles = StyleSheet.create({
  field: {
    marginBottom: ms(14),
  },
  row: {
    flexDirection: 'row',
    gap: ms(10),
  },
  rowItem: {
    flex: 1,
  },
});

const styles = StyleSheet.create({
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: rs(6),
    marginBottom: ms(16),
    overflow: 'hidden',
  },
  panelHeader: {
    paddingHorizontal: ms(14),
    paddingVertical: ms(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  panelTitle: {
    fontSize: fs(15),
    fontWeight: '700',
  },
  panelBody: {
    padding: ms(14),
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ms(6),
  },
  label: {
    fontSize: fs(13),
    fontWeight: '600',
    flexShrink: 1,
  },
  requiredMark: {
    color: COLORS.danger,
  },
  helpButton: {
    marginLeft: ms(8),
    width: ws(18),
    height: ws(18),
    borderRadius: ws(9),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: {
    fontSize: fs(11),
    fontWeight: '700',
  },
  errorText: {
    marginTop: ms(4),
    color: COLORS.danger,
    fontSize: fs(12),
  },
  radioList: {
    gap: ms(4),
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: ms(6),
  },
  radioOuter: {
    width: ws(18),
    height: ws(18),
    borderRadius: ws(9),
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ms(10),
    marginTop: ms(1),
  },
  radioInner: {
    width: ws(9),
    height: ws(9),
    borderRadius: ws(5),
    backgroundColor: COLORS.mainColor,
  },
  radioText: {
    flex: 1,
    fontSize: fs(14),
    lineHeight: fs(20),
  },
  radioCode: {
    fontSize: fs(12),
  },
  radioHint: {
    fontSize: fs(12),
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: fs(13),
    fontWeight: '700',
    marginTop: ms(6),
    marginBottom: ms(4),
  },
  hint: {
    fontSize: fs(12),
    lineHeight: fs(17),
    marginBottom: ms(14),
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: rs(3),
    minHeight: hs(44),
    alignSelf: 'flex-start',
  },
  stepperButton: {
    paddingHorizontal: ms(16),
    paddingVertical: ms(8),
  },
  stepperSign: {
    fontSize: fs(18),
    fontWeight: '600',
  },
  stepperInput: {
    minWidth: ws(64),
    textAlign: 'center',
    fontSize: fs(15),
    paddingVertical: 0,
  },
  disabled: {
    opacity: 0.5,
  },
  toggleLink: {
    color: COLORS.mainColor,
    fontSize: fs(13),
    fontWeight: '600',
    marginBottom: ms(10),
  },
  errorBanner: {
    backgroundColor: 'rgba(229,57,53,0.12)',
    borderRadius: rs(6),
    padding: ms(12),
    marginBottom: ms(14),
  },
  errorBannerText: {
    color: COLORS.danger,
    fontSize: fs(13),
    lineHeight: fs(18),
  },
  generateButton: {
    marginTop: ms(4),
    minHeight: hs(44),
    borderRadius: rs(3),
    backgroundColor: COLORS.mainColor,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonBusy: {
    opacity: 0.7,
  },
  generateSpinner: {
    marginRight: ms(8),
  },
  generateText: {
    color: COLORS.white,
    fontSize: fs(15),
    fontWeight: '700',
  },
  fileList: {
    marginTop: ms(16),
    paddingTop: ms(14),
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: ms(10),
  },
  readyTitle: {
    fontSize: fs(15),
    fontWeight: '700',
    color: '#1D6F42',
  },
  readySub: {
    fontSize: fs(13),
    marginTop: -ms(6),
  },
  formatCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderRadius: rs(8),
    overflow: 'hidden',
  },
  formatOpen: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(12),
    paddingVertical: ms(10),
    paddingLeft: ms(12),
    paddingRight: ms(8),
  },
  formatSave: {
    width: ws(52),
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  formatCardOff: {
    opacity: 0.45,
  },
  formatText: {
    flex: 1,
    minWidth: 0,
  },
  formatTitle: {
    fontSize: fs(15),
    fontWeight: '600',
  },
  formatSub: {
    marginTop: ms(2),
    fontSize: fs(12),
    lineHeight: fs(16),
  },
});
