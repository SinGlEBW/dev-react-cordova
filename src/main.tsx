import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App.tsx'
import './index.css'
import { CordovaAppControl, ControlHeightBoxMobile } from '@lib'

const startApp = () => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <App/>
  )
}

if (window.cordova) {
  document.addEventListener('deviceready', () => {
    startApp();
    // let isKeyboardHeight = false;
    CordovaAppControl.keyboard.onWatch((data) => {
      console.log('onWatch (data)', data);//{height: number, isShow: boolean }
      // if (!isKeyboardHeight && data.isShow) {
      //   isKeyboardHeight = true;
      //   // store.dispatch(setKeyboardHeight(data.height));
      // }
      // store.dispatch(setKeyboardInfo(data));
    });
    CordovaAppControl.dynamicMetaContentProperty();
    CordovaAppControl.initFullScreen({
      isFullScreen: true, 
      isPaddingBottomAndroid: true,
      isPaddingBottomIos: true,
      onHeightBars: (data) => {
        console.log('onHeightBars (data)', data);//{heightStatus: number, heightNav: number }
        // store.dispatch(setMobileHeightBars({
        //   heightStatusBar: heightStatus,
        //   heightNavBar: heightNav
        // }));
      },
    
    });
  }, false);
} else {
  startApp();
}



