import { BaseFunctionSqlite } from './types';

export const dropTableSqlite:BaseFunctionSqlite = (connect, nameTable) => new Promise((resolve, reject) => {
  connect.transaction(
    (tx) => { tx.executeSql(`DROP TABLE IF EXISTS ${nameTable}`); },
    (error) => { reject({status: false, msg: `Ошибка транзакции в dropTable:  ${error}`}); }, 
    () => { resolve({status: true, msg: `Таблица ${nameTable} успешно удалена`}); }
  )
})
