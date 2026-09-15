import { EventSubscribers } from "dev-classes";
import { CordovaConfig } from "./CordovaConfig";

export interface CordovaKeyboard_Events {
  watch(data: { isShow: boolean; height: number }): void;
}


export class CordovaKeyboard extends CordovaConfig {
  events = new EventSubscribers<CordovaKeyboard_Events>(["watch"]);

  watchStart() {
    console.log("watchStart");
    if (CordovaKeyboard.isAndroid()) {
      console.log("watchStart Android");
      const { AndroidBars } = CordovaKeyboard.getPlugins();
      const cb = ({ isShow, height }: { isShow: boolean; height: number }) => {
        this.events.publish("watch", { isShow, height });
      };

      if (AndroidBars) {
        AndroidBars.on("watchKeyboard", cb);
      } else {
        console.error("Не установлен плагин cordova-plugin-android-bars");
      }
    }

    if (CordovaKeyboard.isIOS()) {
      console.log("watchStart Ios");
      const Keyboard = (window?.cordova?.plugins as any)?.Keyboard;
      if (Keyboard) {
        Keyboard?.hideFormAccessoryBar(true); //отключить лишние панели на клавиатуре
        Keyboard.automaticScrollToTopOnHiding = false;
        Keyboard.shrinkView(false); //как-то коряво работает. Сами будет поднимать контент за счёт изменения размера html||body
      }
 
      //INFO: не получает размер клавиатуры при загрузке. Можно открыть и закрыть
      const cb = ({ keyboardHeight }: { keyboardHeight: number }) => {
        const isShow = !!keyboardHeight;
        const payload = { isShow, height: keyboardHeight };
        console.log("keyboardHeightWillChange", payload);
        this.events.publish("watch", payload);
      };
      cb && window.addEventListener("keyboardHeightWillChange", cb as any);
    }
  }
}
