import {useCallback, useRef, useState} from 'react';
import {Alert} from 'react-native';
import Svg from 'react-native-svg';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {
  CHART_SAVE_PERMISSION_DENIED,
  saveSvgChartAsJpeg,
} from './saveChartJpeg';

export function useChartJpegExport(opts: {
  filePrefix: string;
  width: number;
  height: number;
  canSave: boolean;
}) {
  const {t} = useTranslation();
  const exportSvgRef = useRef<Svg>(null);
  const [saving, setSaving] = useState(false);
  const [showExportSvg, setShowExportSvg] = useState(false);
  const capturingRef = useRef(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const finishSave = useCallback(
    (ok: boolean, err?: unknown) => {
      capturingRef.current = false;
      setShowExportSvg(false);
      setSaving(false);
      if (ok) {
        Alert.alert(t('success'), t('chartSavedAsJpeg'));
        return;
      }
      const message = err instanceof Error ? err.message : '';
      if (message === CHART_SAVE_PERMISSION_DENIED) {
        return;
      }
      Alert.alert(t('error'), t('chartSaveFailed'));
    },
    [t],
  );

  const captureExport = useCallback(() => {
    if (capturingRef.current) {
      return;
    }
    capturingRef.current = true;
    const {width, height, filePrefix} = optsRef.current;
    requestAnimationFrame(() => {
      setTimeout(() => {
        saveSvgChartAsJpeg(exportSvgRef.current, {
          width,
          height,
          filePrefix,
        })
          .then(() => finishSave(true))
          .catch(err => finishSave(false, err));
      }, 80);
    });
  }, [finishSave]);

  const handleSaveJpeg = useCallback(() => {
    if (saving || !optsRef.current.canSave) {
      return;
    }
    setSaving(true);
    setShowExportSvg(true);
  }, [saving]);

  return {
    exportSvgRef,
    saving,
    showExportSvg,
    captureExport,
    handleSaveJpeg,
  };
}
