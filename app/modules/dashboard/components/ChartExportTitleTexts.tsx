import React from 'react';
import {Text as SvgText} from 'react-native-svg';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs} from '../../../shared/utils/scale';

export const CHART_EXPORT_PAD = 16;
export const CHART_EXPORT_TITLE_H = 112;
export const CHART_EXPORT_LEGEND_H = 28;

export const chartExportOffscreenStyle = {
  position: 'absolute' as const,
  left: -4096,
  top: 0,
  opacity: 1,
};

type Props = {
  title: string;
  pastorName?: string;
  regionNation?: string;
  reportDate?: string;
  reportingPeriod?: string;
  fill: string;
};

export function ChartExportTitleTexts({
  title,
  pastorName,
  regionNation,
  reportDate,
  reportingPeriod,
  fill,
}: Props) {
  const {t} = useTranslation();
  const x = CHART_EXPORT_PAD;
  const line = (index: number) => CHART_EXPORT_PAD + 16 + index * 18;

  return (
    <>
      <SvgText x={x} y={line(0)} fill={fill} fontSize={fs(16)} fontWeight="700">
        {title}
      </SvgText>
      <SvgText x={x} y={line(1)} fill={fill} fontSize={fs(12)} fontWeight="500">
        {`${t('forPastor') || 'For Pastor'}: ${pastorName || '-'}`}
      </SvgText>
      <SvgText x={x} y={line(2)} fill={fill} fontSize={fs(12)} fontWeight="500">
        {`${t('regionNation') || 'Region / Nation'}: ${regionNation || '-'}`}
      </SvgText>
      <SvgText x={x} y={line(3)} fill={fill} fontSize={fs(12)} fontWeight="500">
        {`${t('reportDate') || 'Report Date'}: ${reportDate || '-'}`}
      </SvgText>
      <SvgText x={x} y={line(4)} fill={fill} fontSize={fs(12)} fontWeight="500">
        {`${t('reportingPeriod') || 'Reporting Period'}: ${reportingPeriod || '-'}`}
      </SvgText>
    </>
  );
}
