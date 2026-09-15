import React, { Children, FC, useMemo } from "react";
import cn from 'classnames';

import { useAutoSizesBoxSelector, autoSizesBoxSelectors } from './store';


export interface AutoHeightBoxProps {
  children: React.ReactElement;
}

const AutoHeightBoxMemo:FC<AutoHeightBoxProps> = ({children}) => {
  const element = Children.only(children);
  const autoBottomSize = useAutoSizesBoxSelector(autoSizesBoxSelectors.getAutoBottomSize);

  const newChildren = useMemo(() => {
    return React.cloneElement(
      element,
      {
        style:{ 
          height: `calc(100%)`,
          ...element.props.style
        },
        className: cn(element.props.className, 'AutoHeightBox')
      },
  );
  }, [element, autoBottomSize]);

  return (
    <>{newChildren}</>
  )
};

export const AutoHeightBox = React.memo(AutoHeightBoxMemo);
