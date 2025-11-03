import React from 'react';
import { View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Text } from '@ui-kitten/components';
import { COLORS } from '../constants/colors';

export interface PaginationItem {
  label: string;
  page: number;
  active?: boolean;
  disabled?: boolean;
}

interface PaginationProps {
  page: number;
  totalPages: number;
  loading?: boolean;
  maxNeighbors?: number; // how many pages to show before/after current
  onChange: (targetPage: number) => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  loading = false,
  maxNeighbors = 2,
  onChange,
  containerStyle,
}) => {
  const items: PaginationItem[] = [];

  items.push({ label: '<<', page: 1, disabled: page === 1 });

  for (let p = page - maxNeighbors; p <= page - 1; p++) {
    if (p >= 1) items.push({ label: String(p), page: p });
  }

  items.push({ label: String(page), page, active: true });

  for (let p = page + 1; p <= page + maxNeighbors; p++) {
    if (p <= totalPages) items.push({ label: String(p), page: p });
  }

  items.push({ label: '>>', page: totalPages, disabled: page === totalPages });

  return (
    <View style={[styles.pageNumbersContainer, containerStyle]}>
      {items.map((p) => (
        <TouchableOpacity
          key={`${p.label}-${p.page}`}
          style={[
            styles.pageNumber,
            p.active && styles.pageNumberActive,
            (p.disabled || loading) && styles.pageNumberDisabled,
          ]}
          onPress={() => onChange(p.page)}
          disabled={!!p.disabled || loading}
        >
          <Text style={[styles.pageNumberText, p.active && styles.pageNumberTextActive]}>{p.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  pageNumbersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageNumber: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    backgroundColor: '#fff',
  },
  pageNumberActive: {
    backgroundColor: COLORS.mainColor,
    borderColor: COLORS.mainColor,
  },
  pageNumberDisabled: {
    opacity: 0.5,
  },
  pageNumberText: {
    color: '#333',
    fontWeight: '600',
  },
  pageNumberTextActive: {
    color: '#fff',
  },
});

export default Pagination; 