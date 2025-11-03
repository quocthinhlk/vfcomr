import { useState } from 'react';
import { IndexPath } from '@ui-kitten/components';

interface SelectOption {
  label: string;
  value: string | number;
}

export function useSelectState(initialValue: IndexPath | undefined = undefined) {
  const [selectedIndex, setSelectedIndex] = useState<IndexPath | undefined>(initialValue);

  const onSelect = (index: IndexPath | IndexPath[]) => {
    if (Array.isArray(index)) {
      setSelectedIndex(index[0]); // Assume single select, take the first if array is passed
    } else {
      setSelectedIndex(index);
    }
  };

  return { selectedIndex, onSelect };
} 