import { Storage } from '@libs/Database';
import React, { FC, ReactNode, useCallback } from "react"

const storage = new Storage({
  driver: ['sqlite', 'indexedDB'],
  defaultDriver: 'sqlite',
  dbName: 'account-1',
});


(window as any).storage = storage

export interface TestStorageComponentProps {
  children?: ReactNode;
}

const TestStorageComponentMemo: FC<TestStorageComponentProps> = (props) => {


  const handleSet = useCallback(async () => {
    storage.setData('settinsg', "settinsg", { prop1: 'prop1', prop2: 21321 });
    storage.setData('users', "17", { name: 'Петя', age: 31 });
    storage.setData('users', "18", { name: 'Вася', age: 32 });
  }, []);
  const handleUpdate = useCallback(() => {
    storage.setData('users', "18", { name: 'Вася2', age: 32 });
  }, []);
  const handleDelete = useCallback(() => {
    storage.removeData('users', { where: { _key: '17' } });
  }, []);
  const handleDrop = useCallback(() => {
    storage.dropTable('users');
  }, []);
  const handleDropDB = useCallback(() => {
    storage.deleteDatabase('account-1');
  }, []);
  return (
    <div className='TestStorageComponent' style={{padding: '10px'}}>
      <div className='d-flex justify-content-center'>
      <button className='btn btn-primary' onClick={handleSet}>SET</button>
      <button className='btn btn-primary' onClick={handleUpdate}>UPDATE</button>
      <button className='btn btn-primary' onClick={handleDelete}>DELETE</button>
      <button className='btn btn-primary' onClick={handleDrop}>DROP</button>
      <button className='btn btn-primary' onClick={handleDropDB}>DROP DB</button>
      </div>
    </div>
  )
};

export const TestStorageComponent = React.memo(TestStorageComponentMemo);
