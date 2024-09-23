# CordovaAppControl

Used for initialization statusBar NavBar padding, full screen and used for working with keyboard.

```ts

const startApp = () => {
  ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
};

if (window.cordova) {
  document.addEventListener(
    "deviceready",
    () => {
      startApp();
      // let isKeyboardHeight = false;
      CordovaAppControl.keyboard.onWatch((data) => {
        console.log("onWatch (data)", data); //{height: number, isShow: boolean }
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
          console.log("onHeightBars (data)", data); //{heightStatus: number, heightNav: number }
          // store.dispatch(setMobileHeightBars({
          //   heightStatusBar: heightStatus,
          //   heightNavBar: heightNav
          // }));
        },
      });
    },
    false
  );
} else {
  startApp();
}
```

```tsx
export function App() {

  return (
    <>
      <div>Other Component...with auto padding</div>
      <p>For Elements with style position fixed use component ControlHeightBoxMobile. Example Modal, Dialog @mui components</p>
      <ControlHeightBoxMobile >
        <Dialog>
          ...
        </Dialog>
      </ControlHeightBoxMobile>
    </>
  )
}
```


install plugins for cordova 

- [cordova-plugin-android-bars](https://www.npmjs.com/package/cordova-plugin-android-bars) I created a plugin because
cordova-plugin-statusbar behaves strangely on android
- [cordova-plugin-device](https://www.npmjs.com/package/cordova-plugin-device)
- [cordova-plugin-statusbar](https://www.npmjs.com/package/cordova-plugin-statusbar) used for ios
- [cordova-plugin-keyboard](https://www.npmjs.com/package/cordova-plugin-keyboard) used for ios