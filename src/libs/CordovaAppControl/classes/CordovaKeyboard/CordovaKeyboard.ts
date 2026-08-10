import { CordovaConfig } from '../CordovaConfig';

export interface CordovaKeyboardProps {
  getData(data: { isShow: boolean; height: number }):void;
}

interface CordovaKeyboardPropsPrivate {
  setKeyboardHeight: {
    elRoot: HTMLElement,
    isShow: boolean,
    keyboardHeight: number
  }
}


export class CordovaKeyboard extends CordovaConfig {
  private currentHeight = 0;
  private rootEl = document.body;

  getDymanicHeightKeyboard = () => {
    return this.currentHeight
  }

  private getData?: CordovaKeyboardProps['getData'] | null = null
  
  onWatch(getData?: CordovaKeyboardProps['getData'] | null){ this.getData = getData }

  getRootElement() {
    return this.rootEl;
  }
  
  setRootElement(el: Pick<CordovaKeyboardPropsPrivate['setKeyboardHeight'], 'elRoot'>['elRoot']) {
    return this.rootEl = el;
  }

  watchStart() {
    if (CordovaKeyboard.isAndroid()) {
      const { AndroidBars } = CordovaKeyboard.getPlugins();
      const cb = ({ isShow, height }: {isShow: boolean, height: number}) => {
          this.getData && typeof this.getData === "function" && this.getData({ isShow, height });
        };
        if(AndroidBars){
          cb && AndroidBars.on("watchKeyboard", cb);
        }else{
          console.error("Не установлен плагин cordova-plugin-android-bars")
        }
    }

    if (CordovaKeyboard.isIOS()) {
      if((window as any)?.Keyboard){
        const { Keyboard } = window as any;
        (window as any).Keyboard.automaticScrollToTopOnHiding = true;
        Keyboard.shrinkView(false);
      }

      const cb = ({keyboardHeight}: Pick<CordovaKeyboardPropsPrivate['setKeyboardHeight'], 'keyboardHeight'>) => {
          const isShow = !!keyboardHeight;
          this.getData && typeof this.getData === "function" && this.getData({ isShow, height: keyboardHeight });
        };
        cb && window.addEventListener("keyboardHeightWillChange", cb as any);
    }
  }
}
