import { CordovaConfig } from '../CordovaConfig';



export interface ColorsSystemBarsProps {
  setColorSystemBars: {

    isDarkIcon: boolean;
    isDarkAndroidNavIcon?:boolean
    colors: {
      color1: { dark: string; light: string };
      color2?: { dark: string; light: string };
    };

  };
}

export class ColorSystemBars extends CordovaConfig {
  static color1 = { dark: "", light: "" };
  static color2 = { dark: "", light: "" };

  static setColorSystemBars = ({ isDarkIcon, isDarkAndroidNavIcon, colors }:ColorsSystemBarsProps['setColorSystemBars']) => {
 
    const { color1, color2 } = colors;
    ColorSystemBars.color1 = color1;
    if (color2 && "light" in color2 && "dark" in color2) {
      ColorSystemBars.color2 = color2 as Required<ColorsSystemBarsProps["setColorSystemBars"]["colors"]>["color2"];
    }

    ColorSystemBars.toggleDarkColor(isDarkIcon, isDarkAndroidNavIcon);
  };

  static getColorByStatusTheme(isDarkTheme: boolean) {
    const status = isDarkTheme ? "dark" : "light";

    const hex1 = ColorSystemBars?.color1[status];
    const hex2 = ColorSystemBars?.color2[status];
    return [hex1, hex2];
  }

  static setBgColorAll(hex1: string, hex2?: string) {
    if (ColorSystemBars.isAndroid()) {
      const { AndroidBars } = ColorSystemBars.getPlugins();
      if(AndroidBars){
        if (hex2) {
          AndroidBars.bgColorStatusBar(hex1);
          AndroidBars.bgColorNavBar(hex2);
        } else {
          AndroidBars.bgColorAll(hex1);
        }
      }else{
        console.error("Не установлен плагин cordova-plugin-android-bars")
      }
    }

    if (ColorSystemBars.isIOS()) {
      if (hex1.length >= 9) {
        console.log(hex1);
        hex1 = hex1.substring(0, 9);
        const validHex = [hex1[0], hex1[8], hex1[7], hex1[1], hex1[2], hex1[3], hex1[4], hex1[5], hex1[6]];
        hex1 = validHex.join("");
      }

      const idTimeout = setTimeout(() => {
        window?.StatusBar?.backgroundColorByHexString(hex1);
        clearTimeout(idTimeout);
      }, 100);
    }
  }

  static setDarkIcon(isDarkIcon: boolean, isDarkAndroidNavIcon?:boolean) {
 
    if (ColorSystemBars.isAndroid()) {
      const { AndroidBars } = ColorSystemBars.getPlugins();
      AndroidBars?.setDarkIcon(isDarkIcon, isDarkAndroidNavIcon);
    }
    if (ColorSystemBars.isIOS()) {
      isDarkIcon ?  window?.StatusBar?.styleDefault() : window?.StatusBar?.styleLightContent();
    }
  }

  static toggleDarkColor(isDarkIcon: boolean, isDarkAndroidNavIcon?:boolean) {
    const [hex1, hex2] = ColorSystemBars.getColorByStatusTheme(isDarkIcon);
    ColorSystemBars.setBgColorAll(hex1, hex2);
    ColorSystemBars.setDarkIcon(isDarkIcon, isDarkAndroidNavIcon);
  }
}


