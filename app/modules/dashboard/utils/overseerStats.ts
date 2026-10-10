import type {TranslationKey} from '../../../shared/translations/types';

/** Indicator fields shared by the Overseer dashboard and the Admin per-overseer view. */
export type OverseerIndicatorValues = {
  total_churches?: number;
  avg_people_3_months?: number;
  percent_churches_reporting?: number;
  percent_growth_churches_number?: number;
  percent_churches_growing?: number;
  countries_count?: number;
  percent_churches_planted?: number;
  percent_churches_with_cg?: number;
  percent_churches_with_gt_liw?: number;
  percent_churches_with_giving?: number;
  percent_churches_with_mfp?: number;
  percent_churches_visited_2_years?: number;
};

export type OverseerStatItem = {
  icon: any;
  value: string;
  label: string;
  helpTitle?: string;
  helpMessage?: string;
};

export const formatNumber = (value?: number | null, maximumFractionDigits = 2) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0';
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
};

export const formatPercent = (value?: number | null, maximumFractionDigits = 2) =>
  `${formatNumber(value, maximumFractionDigits)}%`;

export const formatInteger = (value?: number | null) => {
  if (typeof value !== 'number') {
    return '0';
  }
  return Math.round(value).toLocaleString('en-US');
};

/** The 12 indicator tiles, in dashboard order. */
export function buildOverseerStatItems(
  data: OverseerIndicatorValues,
  t: (key: TranslationKey) => string,
): OverseerStatItem[] {
  return [
    {
      icon: require('../../../assets/images/icon/house.png'),
      value: formatInteger(data.total_churches),
      label: t('churches') || 'Churches',
      helpTitle: t('churches') || 'Churches',
      helpMessage: t('indicatorInfoChurches'),
    },
    {
      icon: require('../../../assets/images/icon/group.png'),
      value: formatInteger(data.avg_people_3_months),
      label: t('people') || 'People',
      helpTitle: t('people') || 'People',
      helpMessage: t('indicatorInfoPeople'),
    },
    {
      icon: require('../../../assets/images/icon/growth.png'),
      value: formatPercent(data.percent_churches_growing),
      label: t('churchesGrowing') || 'Churches Growing',
      helpTitle: t('indicatorTitleChurchesGrowing'),
      helpMessage: t('indicatorInfoChurchesGrowing'),
    },
    {
      icon: require('../../../assets/images/icon/reporting.png'),
      value: formatPercent(data.percent_churches_reporting),
      label: t('churchesReporting') || 'Churches Reporting',
      helpTitle: t('indicatorTitleChurchesReporting'),
      helpMessage: t('indicatorInfoChurchesReporting'),
    },
    {
      icon: require('../../../assets/images/icon/earth.png'),
      value: formatInteger(data.countries_count),
      label: t('nations') || 'Nations',
      helpTitle: t('nations') || 'Nations',
      helpMessage: t('indicatorInfoNations'),
    },
    {
      icon: require('../../../assets/images/icon/plant.png'),
      value: formatPercent(data.percent_churches_planted),
      label: t('churchesPlanting') || 'Churches Planting',
      helpTitle: t('indicatorTitleChurchesPlanting'),
      helpMessage: t('indicatorInfoChurchesPlanting'),
    },
    {
      icon: require('../../../assets/images/icon/cell-group.png'),
      value: formatPercent(data.percent_churches_with_cg),
      label: t('churchesWithCgs') || 'Churches with CGs',
      helpTitle: t('indicatorTitleChurchesWithCgs'),
      helpMessage: t('indicatorInfoChurchesWithCgs'),
    },
    {
      icon: require('../../../assets/images/icon/education.png'),
      value: formatPercent(data.percent_churches_with_gt_liw),
      label: t('churchesWithGtLiw') || 'Churches with GT/LIW',
      helpTitle: t('indicatorTitleChurchesWithGtLiw'),
      helpMessage: t('indicatorInfoChurchesWithGtLiw'),
    },
    {
      icon: require('../../../assets/images/icon/worldwide-currency.png'),
      value: formatPercent(data.percent_churches_with_giving),
      label: t('churchesWithTithesOfferings') || 'Churches with Tithes & Offerings',
      helpTitle: t('indicatorTitleChurchesWithTithesOfferings'),
      helpMessage: t('indicatorInfoChurchesWithTithesOfferings'),
    },
    {
      icon: require('../../../assets/images/icon/worldwide-currency.png'),
      value: formatPercent(data.percent_churches_with_mfp),
      label: t('churchesWithMfp') || 'Churches with MFP',
      helpTitle: t('indicatorTitleChurchesWithMfp'),
      helpMessage: t('indicatorInfoChurchesWithMfp'),
    },
    {
      icon: require('../../../assets/images/icon/more.png'),
      value: formatPercent(data.percent_growth_churches_number),
      label: t('moreChurches') || 'More Churches',
      helpTitle: t('indicatorTitleMoreChurches'),
      helpMessage: t('indicatorInfoMoreChurches'),
    },
    {
      icon: require('../../../assets/images/icon/worldwide.png'),
      value: formatPercent(data.percent_churches_visited_2_years),
      label: t('churchesVisited') || 'Churches Visited',
      helpTitle: t('indicatorTitleChurchesVisited'),
      helpMessage: t('indicatorInfoChurchesVisited'),
    },
  ];
}
