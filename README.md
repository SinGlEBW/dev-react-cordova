<h3 align="center">CordovaAppControl</h3>
1.Используется для инициализации отступов statusBar NavBar при полном экране
2.Получает данные клавиатуры для плавного смещения ui при её открытии 


```ts
import { CordovaAppControl, ControlHeightBoxMobile } from "dev-react-cordova/mobile";

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
      <ControlHeightBoxMobile>
        <Dialog>...</Dialog>
      </ControlHeightBoxMobile>
    </>
  );
}
```

<h3 align="center">Storage</h3>

#### Methods

```ts
interface StorageProps {
  dropTable(nameTable: string): Promise<BaseReturnProps>;
  getData(nameTable: string, params?: Params, isParse?: boolean): Promise<ResultGetDataSqlite>;
  setData(nameTable: string, payload: object, options?: BaseSqliteOptions): Promise<BaseReturnProps>;
  updateData(nameTable: string, payload: object, { where, condition }: UpdateWhere): Promise<BaseReturnProps>;
  removeData(nameTable: string, params?: Params): Promise<BaseReturnProps>;
  checkTable(nameTable: string): Promise<BaseReturnProps>;
  query(sql: string): Promise<BaseReturnProps>; //Security risk
  openDB(): any;
  closeDB(): void;
  switchDriver(nameDriver): void;
  getCurrentDriver(): DriverType;
  isSupported(): boolean;
}
```
#### Examples

```ts
import { Storage } from "dev-react-cordova/database";
const storage = new Storage({
  driver: ["sqlite", "indexedDB"],//Перебирает по порядку и подключиться к той к которой будет доступ. Для sqlite нужен cordova-sqlite-storage
  defaultDriver: "sqlite",
});

storage.switchDriver('indexedDB');//Переключение таблиц если тербуеться

await storage.query(sql); //Разные sql запросы. Не рекомендуеться в целях безопасности.
await storage.checkTable(); //Проверить таблицы.  { status: true, msg: 'Список найденных таблиц', tables }
await storage.checkTable("Test"); //checks a specific table.  promise -> { msg: "Таблица Test существует", status: true }
await storage.setData(nameTable, key, payload, options);
/* 
    Example payload:
      {name: 'Jon', age: 30, value: [{a: 1},{a: 2}] }
    
    options
    {
      isCreateDate: false //no create column createdAt and updateAt. default: true
      rewriteTable: true; //added request `DROP TABLE IF EXISTS ${nameTable}`
    }
  */


await storage.updateData(nameTable, key, payload, { where, condition });
//Не обязательно использовать updateData т.к. setData универсальный и может обновить если передать по тому же ключу
/*
Example payload: ()
  storage.updateData('test', 'id-111', {value: [{a: 4},{a: 2}]}, {where: {name: 'Jon'}})
  OR
  storage.updateData('test', 'id-222', {value: [{a: 4},{a: 2}]},)

  {
    where: {name: 'Jon', age: 30} // generate WHERE name="Jon" AND age="30"
    condition: "AND" | "OR" //edit WHERE name="Jon" OR age="30"
  }
*/

await storage.getData("Test"); //SELECT * FROM Test
/* 
  promise -> {
    msg: "Данные найдены",
    status: true,
    values: [
      {
        id: 1,
        key: "listNames",
        createdAt: "2023-02-07 14:03:23",
        updateAt: "2023-02-13 09:59:03",
        value: "[{\"name\":\"Jon\"}, {\"name\":\"Brain\"}]"
      },
        {
        id: 2,
        key: "listCity",
        createdAt: "2023-02-07 14:03:23",
        updateAt: "2023-02-13 09:59:03",
        value: "[{\"city\":\"New York\"}, {\"city\":\"California\"}]"
      },
      ...
    ]
  } 
*/

await storage.getData("Test", { where: { key: "listNames" } }, true); //SELECT * FROM Test WHERE key = 'listNames'
/* 
  promise -> {
    msg: "Данные найдены",
    status: true,
    values: [
      {
        id: 1,
        key: "listNames",
        createdAt: "2023-02-07 14:03:23",
        updateAt: "2023-02-13 09:59:03",
        value: [ {name: "Jon"}, {name: "Brain"} ] <-- isParse
      }
    ]
  } 
*/

await storage.removeData(nameTable, { where, whereKey, ignoreWhere, condition });
/*
  { whereKey: {name: ['Jon', "Brain"], age: [25, 30]}} }
  'DELETE FROM ${nameTable} WHERE name = "Jon" OR name = "Brain", age = "17" OR age = "20"'
*/

// ✅ Удаление по нескольким условиям (AND)
await storage.removeData('users', { 
  where: { 
    age: 30,
    city: 'Moscow'
  } 
});

// ✅ Удаление с whereKey (OR условия)
await storage.removeData('users', {
  whereKey: {
    name: ['John', 'Jane']  // Удалит John OR Jane
  },
  condition: 'OR'
});

// ✅ Удаление с ignoreWhere (NOT условия)
await storage.removeData('users', {
  where: { isActive: false },
  ignoreWhere: {
    role: ['admin', 'moderator']  // Но НЕ админы и модераторы
  }
});

await storage.dropTable('users')




```

---

install plugins for cordova

- [cordova-sqlite-storage](https://www.npmjs.com/package/cordova-sqlite-storage)
- [cordova-plugin-android-bars](https://www.npmjs.com/package/cordova-plugin-android-bars) I created a plugin because
  cordova-plugin-statusbar behaves strangely on android
- [cordova-plugin-device](https://www.npmjs.com/package/cordova-plugin-device)
- [cordova-plugin-statusbar](https://www.npmjs.com/package/cordova-plugin-statusbar) used for ios
- [cordova-plugin-keyboard](https://www.npmjs.com/package/cordova-plugin-keyboard) used for ios
