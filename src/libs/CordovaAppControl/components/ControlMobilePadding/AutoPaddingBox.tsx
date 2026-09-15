import React, { Children, FC, useMemo } from "react";
import cn from 'classnames';

import { useAutoSizesBoxSelector, autoSizesBoxSelectors } from './store';
import { CordovaAppControl } from '../../../CordovaAppControl/CordovaAppControl';


export interface AutoPaddingBoxProps {
  children: React.ReactElement;
  isPaddingStatusBar?: boolean;
  isPaddingNavBar?: boolean;
  isHorizontalPaddingByOrientation?: boolean;
 
  paddingProps?: {
    concatTopPadding?: number;
    concatBottomPadding?: number;
    concatHorizontalPadding?: number;
  }
}

const AutoPaddingBoxMemo: FC<AutoPaddingBoxProps> = ({
  children,
  paddingProps,
  isPaddingStatusBar = true,
  isPaddingNavBar = true,
  isHorizontalPaddingByOrientation = false,
}) => {
  const { concatTopPadding, concatBottomPadding, concatHorizontalPadding } = useMemo(() => {
    const concatTopPadding = paddingProps?.concatTopPadding || 0;
    const concatBottomPadding = paddingProps?.concatBottomPadding || 0;
    const concatHorizontalPadding = paddingProps?.concatHorizontalPadding || 0;
    return { concatTopPadding, concatBottomPadding, concatHorizontalPadding };

  }, [paddingProps]);

  const element = Children.only(children);

  const autoBottomSize = useAutoSizesBoxSelector(autoSizesBoxSelectors.getAutoBottomSize);
  const sizesBars = useAutoSizesBoxSelector(autoSizesBoxSelectors.getSizesBars);
  const sizesDisplay = useAutoSizesBoxSelector(autoSizesBoxSelectors.getSizesDisplay);
  const keyboardData = useAutoSizesBoxSelector(autoSizesBoxSelectors.getKeyboardInfo);


  const newChildren = useMemo(() => {
    const ppaddingHorizontal = (!sizesDisplay.isPortrait ? sizesBars.heightNav : 0) + concatHorizontalPadding;
    const defaultPaddingBottom = autoBottomSize + concatBottomPadding
    // const paddingBottom = `${CordovaAppControl.isIOS() && keyboardData.isShow ? keyboardData.height : defaultPaddingBottom}px`;
    return React.cloneElement(
      element,
      {
        style: {
          //INFO: safe-area-inset-bottom мозки компосирует на разных устройствах. 

          ...element.props.style,
          ...(isPaddingStatusBar && { 
              paddingTop: CordovaAppControl.isIOS() ?`calc(env(safe-area-inset-top) + ${concatTopPadding}px)` : `calc(${sizesBars.heightStatus + concatTopPadding}px)` }
            ),

          ...(isPaddingNavBar && { 
            paddingBottom: 
              CordovaAppControl.isIOS() 
              ? keyboardData.isShow ?  `${concatBottomPadding}px` : `calc(env(safe-area-inset-bottom) + ${concatBottomPadding}px)` 
              : defaultPaddingBottom  
            }),
          ...(isHorizontalPaddingByOrientation && {
            paddingLeft: `${ppaddingHorizontal}px`,
            paddingRight: `${ppaddingHorizontal}px`
          }),
        },
        className: cn(element.props.className, 'AutoPaddingBox')
      },
    );
  }, [sizesBars, keyboardData.isShow, sizesDisplay.isPortrait, concatHorizontalPadding, autoBottomSize, concatBottomPadding, element, isPaddingStatusBar, concatTopPadding, isPaddingNavBar, isHorizontalPaddingByOrientation]);
  return (
    <>{newChildren}</>
  )
};

export const AutoPaddingBox = React.memo(AutoPaddingBoxMemo);
