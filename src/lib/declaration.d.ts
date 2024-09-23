
import Device from 'cordova-plugin-device/types/index.d';
import { Connection } from './cordova-network-information';

declare global {
  interface Window {
    cordova: any,
    device: Device;

    StatusBar: {
      [key:string]: any
    };

    NavigationBar: {
      [key:string]: any
    };
  }

  interface Navigator {
    connection: Connection
  }
 
  module '*.module.css';
  module "*.module.scss";
  

 
} 

/*##########----------<{ Util Typescript }>----------##########*/
type GetRecordByArray_P<T extends readonly string[]> = {
  [Key in T[number]]: string | number | boolean | null;
};
type GetKeysByArray_OR<T extends readonly string[]> = T[number];
/*--------------------------------------------------------------*/

