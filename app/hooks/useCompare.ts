import { useRef } from 'react';
import isEqual from 'lodash.isequal'; // nên cài: npm install lodash.isequal

export function useCompare<T>(value: T): boolean {
  const prevRef = useRef<T>(value);
  const isSame = isEqual(value, prevRef.current);

  if (!isSame) {
    prevRef.current = value;
  }

  return isSame;
}
