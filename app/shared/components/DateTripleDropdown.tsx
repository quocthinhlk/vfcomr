import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import ElementDropdown from './ElementDropdown';
import { useThemedColors } from '../styles/theme';
import { useTranslation } from '../hooks/useTranslation';

type Props = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  yearRange?: number; // +/- years from current year
  startYear?: number; // center year, default: current year
  error?: boolean;
};

const DateTripleDropdown: React.FC<Props> = ({ value, onChange, yearRange = 50, startYear, error }) => {
  const C = useThemedColors();
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const centerYear = startYear || currentYear;

  const years = useMemo(() => Array.from({ length: (yearRange * 2) + 1 }, (_, i) => centerYear - yearRange + i), [centerYear, yearRange]);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

  const [localYear, setLocalYear] = useState<number | undefined>(undefined);
  const [localMonth, setLocalMonth] = useState<number | undefined>(undefined);
  const [localDay, setLocalDay] = useState<number | undefined>(undefined);

  // sync from external value
  useEffect(() => {
    if (value instanceof Date && !isNaN(value.getTime())) {
      setLocalYear(value.getFullYear());
      setLocalMonth(value.getMonth() + 1);
      setLocalDay(value.getDate());
    } else if (!value) {
      setLocalYear(undefined);
      setLocalMonth(undefined);
      setLocalDay(undefined);
    }
  }, [value?.getTime?.()]);

  const setDatePart = (part: 'y' | 'm' | 'd', v: number) => {
    if (part === 'y') setLocalYear(v);
    if (part === 'm') setLocalMonth(v);
    if (part === 'd') setLocalDay(v);

    const y = part === 'y' ? v : localYear;
    const m = part === 'm' ? v : localMonth;
    const dRaw = part === 'd' ? v : localDay;

    // Only emit when all parts are selected
    if (y && m && dRaw) {
      const lastDay = new Date(y, m, 0).getDate();
      const d = Math.min(dRaw, lastDay);
      onChange(new Date(y, m - 1, d));
    } else {
      // keep external value as null when incomplete
      onChange(null);
    }
  };

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <ElementDropdown
          data={days.map(n => ({ label: String(n), value: n }))}
          value={localDay as any}
          onChange={v => setDatePart('d', Number(v))}
          placeholder={t('day')}
          error={!!error}
          dropdownContainerStyle={{ backgroundColor: C.inputBg, borderColor: C.inputBorder } as any}
          optionItemStyle={{ backgroundColor: C.inputBg } as any}
          activeItemColor={C.surface}
        />
      </View>
      <View style={{ flex: 1 }}>
        <ElementDropdown
          data={months.map(n => ({ label: String(n), value: n }))}
          value={localMonth as any}
          onChange={v => setDatePart('m', Number(v))}
          placeholder={t('month')}
          error={!!error}
          dropdownContainerStyle={{ backgroundColor: C.inputBg, borderColor: C.inputBorder } as any}
          optionItemStyle={{ backgroundColor: C.inputBg } as any}
          activeItemColor={C.surface}
        />
      </View>
      <View style={{ flex: 1 }}>
        <ElementDropdown
          data={years.map(n => ({ label: String(n), value: n }))}
          value={localYear as any}
          onChange={v => setDatePart('y', Number(v))}
          placeholder={t('year')}
          error={!!error}
          dropdownContainerStyle={{ backgroundColor: C.inputBg, borderColor: C.inputBorder } as any}
          optionItemStyle={{ backgroundColor: C.inputBg } as any}
          activeItemColor={C.surface}
        />
      </View>
    </View>
  );
};

export default DateTripleDropdown;


