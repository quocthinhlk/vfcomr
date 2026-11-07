import React, {useState, useEffect, useMemo, useRef} from 'react';
import {View} from 'react-native';
import ElementDropdown from './ElementDropdown';
import {useThemedColors} from '../styles/theme';
import {useTranslation} from '../hooks/useTranslation';
import {ms} from '../utils/scale';

type Props = {
  value: string | null; // format: "HH:mm:ss" or "HH:mm"
  onChange: (time: string | null) => void; // emits "HH:mm:ss" format
  error?: boolean;
};

const TimePicker: React.FC<Props> = ({value, onChange, error}) => {
  const C = useThemedColors();
  const {t} = useTranslation();

  const hours = useMemo(
    () => Array.from({length: 24}, (_, i) => ({label: String(i).padStart(2, '0'), value: i})),
    [],
  );
  const minutes = useMemo(
    () => Array.from({length: 60}, (_, i) => ({label: String(i).padStart(2, '0'), value: i})),
    [],
  );

  const [localHour, setLocalHour] = useState<number | undefined>(undefined);
  const [localMinute, setLocalMinute] = useState<number | undefined>(undefined);

  // Set while this picker reports an incomplete time, so the null coming back
  // does not also clear the part that is still chosen.
  const emittedIncompleteRef = useRef(false);

  // Parse value string "HH:mm:ss" or "HH:mm" into hours and minutes
  useEffect(() => {
    if (!value && emittedIncompleteRef.current) {
      return;
    }
    if (value && typeof value === 'string') {
      const parts = value.split(':');
      if (parts.length >= 2) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        // An out-of-range part (the API saves e.g. "99:00:00") is shown empty
        // instead of keeping the previous choice.
        setLocalHour(!isNaN(h) && h >= 0 && h < 24 ? h : undefined);
        setLocalMinute(!isNaN(m) && m >= 0 && m < 60 ? m : undefined);
      } else {
        setLocalHour(undefined);
        setLocalMinute(undefined);
      }
    } else if (!value) {
      setLocalHour(undefined);
      setLocalMinute(undefined);
    }
  }, [value]);

  const setTimePart = (part: 'h' | 'm', v: number | undefined) => {
    if (part === 'h') {
      setLocalHour(v);
    }
    if (part === 'm') {
      setLocalMinute(v);
    }

    const h = part === 'h' ? v : localHour;
    const m = part === 'm' ? v : localMinute;

    // Only emit when both parts are selected
    if (h !== undefined && m !== undefined) {
      const timeString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
      emittedIncompleteRef.current = false;
      onChange(timeString);
    } else {
      // keep external value as null when incomplete
      emittedIncompleteRef.current = true;
      onChange(null);
    }
  };

  // The dropdown's clear (×) sends null, which Number() turned into 00.
  const toPart = (v: string | number | null) =>
    v === null || v === undefined || v === '' ? undefined : Number(v);

  return (
    <View style={{flexDirection: 'row', gap: ms(8)}}>
      <View style={{flex: 1}}>
        <ElementDropdown
          data={hours}
          value={localHour as any}
          onChange={v => setTimePart('h', toPart(v))}
          placeholder={t('hour') || 'Hour'}
          error={!!error}
          dropdownContainerStyle={{backgroundColor: C.inputBg, borderColor: C.inputBorder} as any}
          optionItemStyle={{backgroundColor: C.inputBg} as any}
          activeItemColor={C.surface}
        />
      </View>
      <View style={{flex: 1}}>
        <ElementDropdown
          data={minutes}
          value={localMinute as any}
          onChange={v => setTimePart('m', toPart(v))}
          placeholder={t('minute') || 'Minute'}
          error={!!error}
          dropdownContainerStyle={{backgroundColor: C.inputBg, borderColor: C.inputBorder} as any}
          optionItemStyle={{backgroundColor: C.inputBg} as any}
          activeItemColor={C.surface}
        />
      </View>
    </View>
  );
};

export default TimePicker;
