import React from 'react'
import { Storage,  } from '@libs/Database'
const storage = new Storage({
  driver: ['sqlite','indexedDB'],
  defaultDriver: 'sqlite',
  dbName: 'account-1',
});

// await storage.setData('users', { name: 'John Doe' });
// storage.getData('users', { where: {id: 1 } });
(window as any).storage = storage

export function App() {


storage.setData('users', "17", { name: 'John Doe', age: 30 } );
storage.setData('users', "15", { name: 'Вася Пупкин', age: 33 } );
storage.setData('settings', "profile", { name: 'Вася Пупкин', age: 33 } );
// storage.setData('settings', 15, {}, {isCreateDate: false}); // Версия 1 → 2
// storage.setData('cache', "415555",{});    // Версия 2 → 3




  return (
    <>
      
      <div>Other Component...with auto padding</div>
      <p>For Elements with style position fixed use component ControlHeightBoxMobile. Example Modal, Dialog @mui components</p>
      {/* <ControlHeightBoxMobile >
        <Dialog>
          ...
        </Dialog>
      </ControlHeightBoxMobile> */}
    </>
  )
}



