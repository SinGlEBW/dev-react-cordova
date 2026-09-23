import React from 'react'
import { Storage,  } from '@libs/Database'
import './assets/css/bootstrap-icons.css';
import './assets/css/bootstrap.min.css';
import { TestStorageComponent } from './DB/TestStorageComponent';


export function App() {

  return (
    <>
      <TestStorageComponent/>
      {/* <ControlHeightBoxMobile >
        <Dialog>
          ...
        </Dialog>
      </ControlHeightBoxMobile> */}
    </>
  )
}



