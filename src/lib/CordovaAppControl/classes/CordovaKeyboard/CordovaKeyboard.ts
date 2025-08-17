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
  private fullHeightKeyboard = 0;
  private currentHeight = 0;
  
  private rootEl = document.body;
  /*
   INFO: !!!Запомнить!!!
    что бы взять и передать данные нужно использовать стрелочную функцию. Иначе теряется контекст. 
    на constructor это не распространяется
  */
  getStaticHeightKeyboard = () => {
    return this.fullHeightKeyboard
  }
  getDymanicHeightKeyboard = () => {
    return this.currentHeight
  }
  private setKeyboardHeight({elRoot, isShow, keyboardHeight}:CordovaKeyboardPropsPrivate['setKeyboardHeight']) {
    let height = "100%";
    this.currentHeight = keyboardHeight;
    
    if (isShow) {
      this.fullHeightKeyboard = keyboardHeight;
      height = `calc(100% - ${keyboardHeight}px)`;
    }
    
    elRoot.style.height = height;
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
    const elRoot = this.getRootElement();

    if (CordovaKeyboard.isAndroid()) {
      const { AndroidBars } = CordovaKeyboard.getPlugins();
      const cb = ({ isShow, height }: {isShow: boolean, height: number}) => {
          console.log('AndroidBars.on (height)', height);
          this.setKeyboardHeight({ elRoot, isShow, keyboardHeight: height })
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
          this.setKeyboardHeight({ elRoot,isShow, keyboardHeight })
          this.getData && typeof this.getData === "function" && this.getData({ isShow, height: keyboardHeight });
        };
        cb && window.addEventListener("keyboardHeightWillChange", cb as any);
    }
  }
}
