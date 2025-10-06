import React, { Children, FC, useMemo } from "react";
import { useStore } from './store';

export interface ControlHeightBoxMobileProps {
  children: React.ReactElement;
}


const ControlHeightBoxMobileMemo:FC<ControlHeightBoxMobileProps> = ({children}) => {
  const element = Children.only(children);
  const { autoBottomSize } = useStore();

  const newChildren = useMemo(() => {
    return React.cloneElement(
      element,
      {
        style:{ height: `calc(100% - ${autoBottomSize}px)`,}
      },
  );
  }, [element, autoBottomSize]);

  return (
    <>{newChildren}</>
  )
};

export const ControlHeightBoxMobile = React.memo(ControlHeightBoxMobileMemo);
