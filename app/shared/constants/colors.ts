export const COLORS = {
  mainColor: '#2478CE',
  dangerColor: '#db3545',
  successColor: '#28a745',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#8f9bb3',
  lightGray: '#E5E5E5',
  danger: '#FF3B30',
} as const;

export type ColorKey = keyof typeof COLORS; 