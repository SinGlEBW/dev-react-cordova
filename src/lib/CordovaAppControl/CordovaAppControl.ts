import { CordovaConfig } from "./classes/CordovaConfig";
import { CordovaKeyboard } from "./classes/CordovaKeyboard/CordovaKeyboard";
import { ColorsSystemBarsProps, ColorSystemBars } from "./classes/ColorSystemBars/ColorSystemBars";
import { ControlMobileAutoHeight } from "./components/ControlMobilePadding/store";


export interface CordovaAppControlProps {
  initFullScreen: {
    onHeightBars?(d: Record<"heightStatus" | "heightNav", number>): void;
    onGetAutoBottomSize?(d: { bottomSize: number }): void;
    isPaddingTopAndroid?: boolean;
    isPaddingBottomAndroid?: boolean;
    isPaddingBottomIos?: boolean;
    isPaddingTopIos?: boolean;

    isFullScreen: boolean;
  };
}
interface CordovaAppControlPropsPrivate {
  orientationMobileControl: {
    isPaddingBottom: boolean;
    isPaddingTop: boolean;
    heightStatus: number;
    heightNav: number;
  };
  getBottomSize: {
    isPortrait: boolean;
    currentHeightKeyboard: number;
    heightNav: number;
  };
}

export class CordovaAppControl extends CordovaConfig {
  private static isPortrait = false;
  private static heightStatus = 0;
  private static heightNav = 0;
  private static isShowKeyboard = false;

  private static listOrientation_cb: any[] = [];
  private static Keyboard = new CordovaKeyboard();
  private static isCheckEventOrientationMobileForAndroidNav = false;

  static keyboard = {
    //Запуск в initFullScreen
    onWatch(cb: Parameters<typeof CordovaAppControl.Keyboard.onWatch>[0]) {
      const on: Parameters<typeof CordovaAppControl.Keyboard.onWatch>[0] = (data) => {
        CordovaAppControl.isShowKeyboard = data.isShow;

        const bottomSize = CordovaAppControl.getBottomSize({
          currentHeightKeyboard: data.height,
          heightNav: CordovaAppControl.heightNav,
          isPortrait: CordovaAppControl.isPortrait,
        });

        CordovaAppControl.Keyboard.getRootElement();
        CordovaAppControl.setAutoBottomSize({ bottomSize });
        const rootEl = CordovaAppControl.Keyboard.getRootElement();
        rootEl.style.setProperty("height", `calc(100% - ${bottomSize}px)`);
        cb && cb(data);
      };
      CordovaAppControl.Keyboard.onWatch(on);
    },
  };
  static setRootElement(el: HTMLElement) {
    CordovaAppControl.Keyboard.setRootElement(el);
  }
  private static orientationMobileControl({
    isPaddingBottom,
    isPaddingTop,
    heightStatus,
    heightNav,
  }: CordovaAppControlPropsPrivate["orientationMobileControl"]) {
    // console.dir("orientationMobileControl");
    if (!CordovaAppControl.isCheckEventOrientationMobileForAndroidNav) {
      // console.dir("создание orientationMobileControl");
      const cb = ({ isPortrait }: Pick<CordovaAppControlPropsPrivate["getBottomSize"], 'isPortrait'>) => {
        CordovaAppControl.isPortrait = isPortrait;

        if (!CordovaAppControl.isShowKeyboard) {
          /*
            Если клавиатура запущена, то она отрабатывает при повороте. Только фиксировать 
           */
          const { getDymanicHeightKeyboard } = CordovaAppControl.Keyboard;
          const currentHeightKeyboard = getDymanicHeightKeyboard();
          const bottomSize = CordovaAppControl.getBottomSize({
            currentHeightKeyboard,
            heightNav,
            isPortrait,
          });

          CordovaAppControl.setAutoBottomSize({ bottomSize });
          const rootEl = CordovaAppControl.Keyboard.getRootElement();
          rootEl.style.setProperty("height", `calc(100% - ${bottomSize}px)`);
        }
      };

      CordovaAppControl.onOrientation(cb);
    }
  }
  private static getBottomSize({ isPortrait, currentHeightKeyboard, heightNav }: CordovaAppControlPropsPrivate["getBottomSize"]) {
    let bottomSize = currentHeightKeyboard ? currentHeightKeyboard : heightNav;
    if (!isPortrait) {
      bottomSize = currentHeightKeyboard ? currentHeightKeyboard : 0;
    }

    return bottomSize;
  }
  // private static setAutomaticPaddingBottomFixElements(paddingBottom){
  //   const items = document.body.children.length ?  [...document.body.children] : [];
  //   const itemsPositionFixed = items.filter((item) => window.getComputedStyle(item).getPropertyValue('position') === 'fixed');
  //   if(itemsPositionFixed.length){

  //   }
  // }

  private static setAutoBottomSize = ({ bottomSize }: {bottomSize: number}) => {};
  public static onGetAutoBottomSize(cb: typeof CordovaAppControl.setAutoBottomSize) {
    CordovaAppControl.setAutoBottomSize = cb;
  }

  public static initFullScreen = ({
    isFullScreen,
    isPaddingBottomAndroid = false,
    isPaddingTopAndroid = false,
    isPaddingBottomIos = false,
    isPaddingTopIos = false,

    onHeightBars,
  }: CordovaAppControlProps["initFullScreen"]) => {
    CordovaAppControl.Keyboard.watchStart();
    //INFO: Открытие клавиатуры на body, отступ nav на html
    if (CordovaAppControl.isAndroid()) {
      const { AndroidBars } = CordovaAppControl.getPlugins();
      AndroidBars?.setFullScreen(isFullScreen);

      if (isPaddingBottomAndroid || isPaddingTopAndroid) {
        AndroidBars.getHeightSystemBars(({ heightStatus, heightNav }: any) => {
          CordovaAppControl.heightStatus = heightStatus;
          CordovaAppControl.heightNav = heightNav;

          onHeightBars && onHeightBars({ heightStatus, heightNav });

          CordovaAppControl.orientationMobileControl({
            isPaddingBottom: isPaddingBottomAndroid,
            isPaddingTop: isPaddingTopAndroid,
            heightStatus,
            heightNav,
          });
        });
      }

      return;
    }
    if (CordovaAppControl.isIOS()) {
      window?.StatusBar?.overlaysWebView(isFullScreen);
      const CSS_CONST_TOP = "--android_ios11-top";
      const CSS_CONST_BOTTOM = "--ios11-bottom";
      document.body.style.setProperty(CSS_CONST_TOP, "env(safe-area-inset-top)");
      document.body.style.setProperty(CSS_CONST_BOTTOM, "env(safe-area-inset-bottom)");

      const getCssValueByProperty = (prop:string) => {
        return parseInt(getComputedStyle(document.body).getPropertyValue(prop));
      };

      console.log("isPaddingBottomIos", isPaddingBottomIos);

      if (isPaddingBottomIos || isPaddingTopIos) {
        const idTimeout = setTimeout(() => {
          const heightStatus = getCssValueByProperty(CSS_CONST_TOP);
          const heightNav = getCssValueByProperty(CSS_CONST_BOTTOM);
          console.log("heightStatus", heightStatus);
          console.log("heightNav", heightNav);

          CordovaAppControl.heightStatus = heightStatus;
          CordovaAppControl.heightNav = heightNav;

          onHeightBars && onHeightBars({ heightStatus, heightNav });

          CordovaAppControl.orientationMobileControl({
            isPaddingBottom: isPaddingBottomIos,
            isPaddingTop: isPaddingTopIos,
            heightStatus,
            heightNav,
          });
          clearTimeout(idTimeout);
        }, 250);
      }
    }
  };

  public static dynamicMetaContentProperty() {
    const metaViewportEl = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (window.innerWidth < 300) {
      if (metaViewportEl && metaViewportEl.content) {
        metaViewportEl.content = metaViewportEl.content.replace("maximum-scale=1", "maximum-scale=0.8");
      }
    }
    if (window.device.model === "SM-G780G" && metaViewportEl && metaViewportEl.content) {
      metaViewportEl.content = metaViewportEl.content.replace("maximum-scale=1", "maximum-scale=0.9");
    }
  }

  public static onBackButton = (cb: ()=> void ) => {
    document.addEventListener(
      "backbutton",
      (e) => {
        e.preventDefault();
        cb && cb();
        console.log("backbutton", e);
      },
      false
    );
  };

  public static initEventsPauseResume(cbInfo: (status: "on" | "off") => void) {
    document.addEventListener("resume", (e) => {
      console.log("Событие: resume: ", e);
      cbInfo("on");
    });

    document.addEventListener("pause", (e) => {
      console.log("Событие: pause :", e);
      cbInfo("off");
    });
  }

  public static setColorSystemBars({ isDarkIcon, colors, isDarkAndroidNavIcon }: ColorsSystemBarsProps["setColorSystemBars"]) {
    ColorSystemBars.setColorSystemBars({ isDarkIcon, colors, isDarkAndroidNavIcon });
  }

  public static onOrientation(cb: ({ isPortrait }: Pick<CordovaAppControlPropsPrivate["getBottomSize"], 'isPortrait'>) => void) {
    const findCb = CordovaAppControl.listOrientation_cb.find((itemCb) => (itemCb as any)?.cbOrigin === cb);
    // console.log("onOrientation(findCb)", findCb);
  
    if (!findCb) {
      const payload = {
        cbOrigin: cb,
        modificationCb: (ev: React.ChangeEvent<HTMLDivElement & typeof globalThis> ) => {
     
          const oc_timer = setTimeout(() => {
            clearTimeout(oc_timer);

            cb({ isPortrait: ev.currentTarget?.innerHeight / ev.currentTarget?.innerWidth > 1 });
          }, 500);
        },
      };
      CordovaAppControl.listOrientation_cb.push(payload);
      cb({ isPortrait: window.innerHeight / window.innerWidth > 1 });

      window.addEventListener("orientationchange", (payload as any).modificationCb);
    }
  }

  public static removeOrientation(cb: (...a: any) => void) {
    const findCb = CordovaAppControl.listOrientation_cb.find((itemCb) => (itemCb as any)?.cbOrigin === cb);
    if (findCb) {
      window.removeEventListener("orientationchange", findCb.modificationCb);
    }
  }
}

CordovaAppControl.onGetAutoBottomSize(({ bottomSize }) => {
  console.log("onGetAutoBottomSize(bottomSize)1", bottomSize);
  ControlMobileAutoHeight.set({ autoBottomSize: bottomSize });
});
/*-------------------------------------------------------------------------------------------------*/
