import { ControlState, EventSubscribers } from "dev-classes";
import { ColorsSystemBarsProps, ColorSystemBars } from "./classes/ColorSystemBars";
import { CordovaConfig } from "./classes/CordovaConfig";
import { CordovaKeyboard, CordovaKeyboard_Events } from "./classes/CordovaKeyboard";
import { autoSizesBoxActions } from './components/ControlMobilePadding/store';


interface CordovaAppControl_Events {
  watchingResize(payload: PayloadWatchResize_P): void;
  heightBars(payload: Record<"heightStatus" | "heightNav", number>): void;
}

export interface CordovaAppControlProps {
  initFullScreen: {
    onHeightBars?: CordovaAppControl_Events["heightBars"];
    onWatchOpenKeyboard?: CordovaKeyboard_Events["watch"];
    onWatchingResize?: CordovaAppControl_Events["watchingResize"];
    isFullScreen: boolean;
    isAddedPaddingByKeyboard?: boolean;
  };
}

const defaultState = {
  isAddedPaddingByKeyboard: false,
  heightStatus: 0,
  heightNav: 0,
  keyboardData: { isShow: false, height: 0 },
};

interface SizesDisplay_P {
  width: number;
  height: number;
  isPortrait: boolean;
}

interface KeyboardData_P {
  isShow: boolean;
  height: number;
}

interface PayloadWatchResize_P {
  sizesDisplay: SizesDisplay_P;
  keyboardData: KeyboardData_P;
  autoBottomSize: number;
}

export class CordovaAppControl extends CordovaConfig {
  private static LOG_RED(name, payload) {
    console.log(`%c${name}`, "color: red;", payload);
  }
  private static Keyboard = new CordovaKeyboard();
  private static events = new EventSubscribers<CordovaAppControl_Events>(["watchingResize", "heightBars"]);
  private static isInitEvent = false; //защита при разработке на react

  private static controlState = new ControlState(defaultState);
  private static getSizesDisplay = () => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      isPortrait: window.innerHeight / window.innerWidth > 1,
    };
  };

  private static getBottomSize({ isPortrait, currentHeightKeyboard, heightNav }): number {
    let bottomSize = currentHeightKeyboard ? currentHeightKeyboard : heightNav;
    if (!isPortrait) {
      bottomSize = currentHeightKeyboard ? currentHeightKeyboard : 0;
    }
    return bottomSize;
  }

  private static sendPayloadInStore = ({ isAddedPaddingByKeyboard, heightNav, sizesDisplay, test }) => {
    const { keyboardData } = this.controlState.getState();

    const autoBottomSize = this.getBottomSize({
      currentHeightKeyboard: isAddedPaddingByKeyboard ? (keyboardData.isShow ? keyboardData.height : 0) : 0,
      heightNav: keyboardData.isShow ? 0 : heightNav,
      isPortrait: sizesDisplay.isPortrait,
    });

    const payload = {
      sizesDisplay,
      keyboardData,
      autoBottomSize,
    };
    this.events.publish("watchingResize", payload);
    autoSizesBoxActions.set({ autoBottomSize, sizesDisplay, keyboardData });
    this.LOG_RED(`sendPayloadInStore ${test}`, payload);
  };

  private static sendHeightBars = ({ heightStatus, heightNav, isAddedPaddingByKeyboard, sizesDisplay }) => {
    this.controlState.setState({ heightStatus, heightNav });
    autoSizesBoxActions.setSizesBars({ heightStatus, heightNav });
    this.events.publish("heightBars", { heightStatus, heightNav });
    this.sendPayloadInStore({ heightNav, isAddedPaddingByKeyboard, sizesDisplay, test: "getHeightSystemBars" });
  };

  private static getHeightSystemBars = () => {
    const CSS_CONST_TOP = "--safe-top";
    const CSS_CONST_BOTTOM = "--safe-bottom";
    const { body } = document;
    body.style.setProperty(CSS_CONST_TOP, "env(safe-area-inset-top)");
    body.style.setProperty(CSS_CONST_BOTTOM, "env(safe-area-inset-bottom)");

    const getCssValueByProperty = (prop: string) => {
      return parseInt(getComputedStyle(body).getPropertyValue(prop));
    };
    const heightStatus = getCssValueByProperty(CSS_CONST_TOP);
    const heightNav = getCssValueByProperty(CSS_CONST_BOTTOM);

    body.style.removeProperty(CSS_CONST_TOP);
    body.style.removeProperty(CSS_CONST_BOTTOM);
    return { heightStatus, heightNav };
  };

  public static initFullScreen = async ({
    isFullScreen,
    isAddedPaddingByKeyboard = false,
    onHeightBars,
    onWatchingResize,
    onWatchOpenKeyboard,
  }: CordovaAppControlProps["initFullScreen"]) => {
    this.controlState.setState({ isAddedPaddingByKeyboard });
    this.Keyboard.watchStart();
    onWatchingResize && this.events.subscribe("watchingResize", onWatchingResize);
    onHeightBars && this.events.subscribe("heightBars", onHeightBars);
    const sizesDisplay = CordovaAppControl.getSizesDisplay();
    //В зависимости от какой ориентации запустили приложение

    if (!this.isInitEvent) {
      this.isInitEvent = true;
      const [minSize, maxSize] = [sizesDisplay.width, sizesDisplay.height].sort((a, b) => a - b);

      const listener = async (ev) => {
        const isPortrait = ev?.matches;
        console.log("%cisPortrait", "color: #F07427;", isPortrait);

        //INFO: нельзя тут вызывать CordovaAppControl.getSizesDisplay() т.к. на ios не верно
        // будет вычислять из-за того что срабатывает раньше чем измениться window. Вычисляем сами.
        const _sizesDisplay = {
          isPortrait,
          width: isPortrait ? minSize : maxSize,
          height: isPortrait ? maxSize : minSize,
        };
        const { isAddedPaddingByKeyboard, heightNav } = this.controlState.getState();

        // const { heightStatus, heightNav } = this.getHeightSystemBars();
        // autoSizesBoxActions.set({ autoTopSize: heightStatus });
        this.sendPayloadInStore({ heightNav, isAddedPaddingByKeyboard, sizesDisplay: _sizesDisplay, test: "orientation listener" });
      };

      const mediaQuery = window.matchMedia("(orientation: portrait)");

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", listener);
      } else {
        mediaQuery.addListener(listener);
      }
    }

    if (CordovaAppControl.isAndroid()) {
      const { AndroidBars } = CordovaAppControl.getPlugins();
      AndroidBars?.setFullScreen(isFullScreen);

      AndroidBars?.getHeightSystemBars(({ heightStatus, heightNav }: any) => {
        this.sendHeightBars({ heightStatus, heightNav, isAddedPaddingByKeyboard, sizesDisplay });
      });
    }

    if (CordovaAppControl.isIOS()) {
      window?.StatusBar?.overlaysWebView(isFullScreen);
      const idTimeout = setTimeout(() => {
        const { heightStatus, heightNav } = this.getHeightSystemBars();
        console.log("%csizesBars", "color: #50C878;", { heightStatus, heightNav });
        this.sendHeightBars({ heightStatus, heightNav, isAddedPaddingByKeyboard, sizesDisplay });
        clearTimeout(idTimeout);
      }, 50);
    }

    /*INFO: ВАЖНО!!! При тестировании через devTools если перезагрузить там приложение, то событие watch перестаёт отрабатывать 
      и можно начать искать проблему которой нет.
    */
    this.Keyboard.events.subscribe("watch", (data) => {
      this.controlState.setState({ keyboardData: data });

      onWatchOpenKeyboard && onWatchOpenKeyboard(data);
      const sizesDisplay = CordovaAppControl.getSizesDisplay();
      const { heightNav } = this.controlState.getState();

      this.sendPayloadInStore({ heightNav, isAddedPaddingByKeyboard, sizesDisplay, test: "keyboard watcher" });
    });
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

  public static onBackButton = (cb: () => void) => {
    document.addEventListener(
      "backbutton",
      (e) => {
        e.preventDefault();
        cb && cb();
      },
      false,
    );
  };

  public static initEventsPauseResume(cbInfo: (status: "on" | "off") => void) {
    if (CordovaAppControl.isIOS()) {
      document.addEventListener("active", (e) => {
        console.log("Событие: active :", e);
        cbInfo("on");
      });
      document.addEventListener("resign", (e) => {
        console.log("Событие: resign: ", e);
        cbInfo("off");
      });
      return;
    }
    document.addEventListener("resume", (e) => {
      console.log("Событие: resume: ", e);
      cbInfo("on");
    });

    document.addEventListener("pause", (e) => {
      console.log("Событие: pause :", e);
      cbInfo("off");
    });
  }

  public static setColorSystemBars(payload: ColorsSystemBarsProps["setColorSystemBars"]) {
    ColorSystemBars.setColorSystemBars(payload);
    // document.documentElement.setAttribute("data-theme", !isDarkIcon ? "dark" : "light");
  }
}

/*-------------------------------------------------------------------------------------------------*/
