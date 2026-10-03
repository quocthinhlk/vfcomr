import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {Text} from '@ui-kitten/components';
import Svg, {Path, Circle, Rect} from 'react-native-svg';
import {COLORS} from '../../../shared/constants/colors';
import {ThemeMode, useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import AppInput from '../../../shared/components/AppInput';
import {
  CancelButton,
  SaveButton,
} from '../../../shared/components/ActionButtons';
import {fs, ms, rs, ws} from '../../../shared/utils/scale';
import {ChurchNetworkItem} from '../services/churchnetwork.service';

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

export const getNetworkTokens = (theme: ThemeMode) =>
  theme === 'light'
    ? {
        brandText: COLORS.mainColor,
        brandTint: 'rgba(36,120,206,0.10)',
        lockedText: '#B45309',
        lockedTint: '#FEF3C7',
        unlockedText: '#15803D',
        unlockedTint: '#DCFCE7',
        dangerText: COLORS.dangerColor,
        dangerTint: '#FDECEE',
        shadowOpacity: 0.06,
      }
    : {
        brandText: '#6AA9EA',
        brandTint: 'rgba(106,169,234,0.16)',
        lockedText: '#FBBF24',
        lockedTint: 'rgba(251,191,36,0.14)',
        unlockedText: '#4ADE80',
        unlockedTint: 'rgba(74,222,128,0.14)',
        dangerText: '#FF6B78',
        dangerTint: 'rgba(255,107,120,0.14)',
        shadowOpacity: 0,
      };

const ICON_SM = ws(14);
const ICON_MD = ws(18);

/* ------------------------------------------------------------------ */
/* Icons (single outline family, 2px stroke)                           */
/* ------------------------------------------------------------------ */

type IconProps = {size?: number; color: string};

export const LockIcon: React.FC<IconProps> = ({size = ICON_SM, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={4} y={11} width={16} height={10} rx={2} stroke={color} strokeWidth={2} />
    <Path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const UnlockIcon: React.FC<IconProps> = ({size = ICON_SM, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={4} y={11} width={16} height={10} rx={2} stroke={color} strokeWidth={2} />
    <Path d="M8 11V7a4 4 0 0 1 7.9-.9" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const MoreIcon: React.FC<IconProps> = ({size = ICON_MD, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Circle cx={5} cy={12} r={2} />
    <Circle cx={12} cy={12} r={2} />
    <Circle cx={19} cy={12} r={2} />
  </Svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({size = ICON_MD, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const PencilIcon: React.FC<IconProps> = ({size = ICON_MD, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const TrashIcon: React.FC<IconProps> = ({size = ICON_MD, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const AlertIcon: React.FC<IconProps> = ({size = ws(28), color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3l9.5 17h-19L12 3z"
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <Path d="M12 10v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Circle cx={12} cy={17} r={1.2} fill={color} />
  </Svg>
);

export const NetworkIcon: React.FC<IconProps> = ({size = ws(28), color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={5} r={2.5} stroke={color} strokeWidth={2} />
    <Circle cx={5} cy={19} r={2.5} stroke={color} strokeWidth={2} />
    <Circle cx={19} cy={19} r={2.5} stroke={color} strokeWidth={2} />
    <Path d="M12 7.5v5M12 12.5L6.5 17M12 12.5l5.5 4.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

/* ------------------------------------------------------------------ */
/* Badge                                                      */
/* ------------------------------------------------------------------ */

export const CredentialBadge: React.FC<{locked: boolean}> = ({locked}) => {
  const {t} = useTranslation();
  const {theme} = useThemeMode();
  const T = getNetworkTokens(theme);
  const color = locked ? T.lockedText : T.unlockedText;
  const Icon = locked ? LockIcon : UnlockIcon;
  return (
    <View
      style={[
        styles.badge,
        {backgroundColor: locked ? T.lockedTint : T.unlockedTint},
      ]}>
      <Icon size={ws(12)} color={color} />
      <Text style={[styles.badgeText, {color}]} numberOfLines={1}>
        {locked ? t('credentialLocked') : t('credentialUnlocked')}
      </Text>
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* List card                                                           */
/* ------------------------------------------------------------------ */

type CardProps = {
  item: ChurchNetworkItem;
  onPress: (item: ChurchNetworkItem) => void;
  onMorePress: (item: ChurchNetworkItem) => void;
};

export const ChurchNetworkCard = React.memo(function ChurchNetworkCard({
  item,
  onPress,
  onMorePress,
}: CardProps) {
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const T = getNetworkTokens(theme);
  const {t} = useTranslation();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      onLongPress={() => onMorePress(item)}
      delayLongPress={300}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${
        item.pastor_credential_locked
          ? t('credentialLocked')
          : t('credentialUnlocked')
      }`}
      accessibilityHint={t('view')}
      style={[
        styles.card,
        {
          backgroundColor: C.surface,
          borderColor: C.surfaceBorder,
          shadowOpacity: T.shadowOpacity,
        },
      ]}>
      <View style={styles.cardBody}>
        <Text
          style={[styles.cardTitle, {color: C.textPrimary}]}
          numberOfLines={2}>
          {item.name}
        </Text>
        <CredentialBadge locked={!!item.pastor_credential_locked} />
      </View>
      <TouchableOpacity
        onPress={() => onMorePress(item)}
        hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
        style={styles.moreBtn}
        accessibilityRole="button"
        accessibilityLabel={`${t('moreActions')}: ${item.name}`}>
        <MoreIcon color={C.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

/* ------------------------------------------------------------------ */
/* Add / Edit form                                                     */
/* ------------------------------------------------------------------ */

type FormProps = {
  name: string;
  onNameChange: (value: string) => void;
  locked: boolean;
  onLockedChange: (value: boolean) => void;
  nameError?: string;
  submitting: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export const ChurchNetworkForm: React.FC<FormProps> = ({
  name,
  onNameChange,
  locked,
  onLockedChange,
  nameError,
  submitting,
  onSave,
  onCancel,
}) => {
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const T = getNetworkTokens(theme);
  const {t} = useTranslation();

  return (
    <View>
      <View>
        <Text style={[styles.fieldLabel, {color: C.textPrimary}]}>
          {t('name')}
          <Text style={{color: T.dangerText}}> *</Text>
        </Text>
        <AppInput
          value={name}
          onChangeText={onNameChange}
          placeholder={t('churchNetwork')}
          error={!!nameError}
          editable={!submitting}
          returnKeyType="done"
          accessibilityLabel={`${t('name')}, ${t('required')}`}
        />
        {!!nameError && (
          <Text
            style={[styles.errorText, {color: T.dangerText}]}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert">
            {nameError}
          </Text>
        )}

        <View style={[styles.divider, {backgroundColor: C.surfaceBorder}]} />

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={[styles.fieldLabel, {color: C.textPrimary, marginBottom: ms(6)}]}>
              {t('pastorCredentialLocked')}
            </Text>
            <CredentialBadge locked={locked} />
          </View>
          <Switch
            value={locked}
            onValueChange={onLockedChange}
            disabled={submitting}
            thumbColor={COLORS.white}
            trackColor={{false: C.border, true: COLORS.mainColor}}
            accessibilityLabel={t('pastorCredentialLocked')}
            style={styles.switch}
          />
        </View>
      </View>

      <View style={styles.formButtons}>
        <CancelButton
          label={t('cancel')}
          onPress={onCancel}
          disabled={submitting}
        />
        <SaveButton
          label={submitting ? t('saving') : t('save')}
          onPress={onSave}
          disabled={submitting}
        />
      </View>
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export const CenteredLoader: React.FC = () => (
  <View style={styles.loader}>
    <ActivityIndicator color={COLORS.mainColor} />
  </View>
);

export const networkStyles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: ms(16),
  },
  scrollContent: {
    paddingTop: ms(12),
    paddingBottom: ms(32),
  },
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: ms(4),
    paddingHorizontal: ms(8),
    paddingVertical: ms(3),
    borderRadius: rs(999),
  },
  badgeText: {
    fontSize: fs(11),
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(12),
    paddingVertical: ms(12),
    paddingLeft: ms(16),
    paddingRight: ms(4),
    marginBottom: ms(10),
    borderRadius: rs(12),
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowRadius: rs(6),
    shadowOffset: {width: 0, height: 2},
    elevation: 1,
  },
  cardBody: {
    flex: 1,
    gap: ms(6),
  },
  cardTitle: {
    fontSize: fs(15),
    fontWeight: '600',
    lineHeight: fs(20),
  },
  moreBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  fieldLabel: {
    fontSize: fs(13),
    fontWeight: '600',
    marginBottom: ms(8),
  },
  errorText: {
    fontSize: fs(12),
    marginTop: ms(6),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: ms(16),
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ms(12),
  },
  // Newer iOS switches render wider than the frame RN measures, so the
  // track overflows to the right; reserve that space to keep it on-screen.
  switch: {
    marginRight: Platform.OS === 'ios' ? 12 : 0,
  },
  switchText: {
    flex: 1,
  },
  formButtons: {
    flexDirection: 'row',
    gap: ms(12),
    marginTop: ms(20),
  },
  loader: {
    paddingVertical: ms(48),
    alignItems: 'center',
  },
});
