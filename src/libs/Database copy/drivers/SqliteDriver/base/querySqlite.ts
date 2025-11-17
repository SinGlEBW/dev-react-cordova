import type { BaseReturnProps } from '../../types';
import { Database } from '../types';


type QuerySqlite = (connect:Database, sql:string) => Promise<BaseReturnProps>
export const querySqlite:QuerySqlite = (connect, sql) => new Promise((resolve, reject) => {
  connect.transaction(
    (tx) => { tx.executeSql(sql) },
    (error) => { reject({status: false, msg: `Ошибка транзакции в querySqlite:  ${error}`}); }, 
    () => { resolve({status: true, msg: `Успешная транзакция в querySqlite`}); }
  )
})

