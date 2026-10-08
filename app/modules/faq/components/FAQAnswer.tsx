import React, {useMemo} from 'react';
import {Text, useWindowDimensions} from 'react-native';
import RenderHTML from 'react-native-render-html';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';
import {FAQ_ASSET_BASE_URL, isHtml, textToHtml} from '../utils/faqHtml';

type Props = {
  answer: string;
  /** Horizontal space taken by the surrounding screen + card padding. */
  horizontalInset?: number;
};

/**
 * Renders an FAQ answer as the web shows it: lists, emphasis and the
 * `/uploads/...` screenshots (resolved against the site that hosts them).
 */
export const FAQAnswer: React.FC<Props> = ({answer, horizontalInset = ms(64)}) => {
  const C = useThemedColors();
  const {width} = useWindowDimensions();

  const source = useMemo(
    () => ({
      html: isHtml(answer) ? answer : textToHtml(answer),
      baseUrl: FAQ_ASSET_BASE_URL,
    }),
    [answer],
  );

  const baseStyle = useMemo(
    () => ({color: C.textPrimary, fontSize: fs(14), lineHeight: fs(21)}),
    [C.textPrimary],
  );

  if (!answer?.trim()) {
    return <Text style={{color: C.textPrimary}}>-</Text>;
  }

  return (
    <RenderHTML
      contentWidth={Math.max(width - horizontalInset, 200)}
      source={source}
      baseStyle={baseStyle}
      tagsStyles={{
        p: {marginTop: 0, marginBottom: ms(10)},
        a: {color: COLORS.mainColor},
      }}
      enableExperimentalMarginCollapsing
    />
  );
};

export default FAQAnswer;
