import { type BaseReturnProps, type Params } from '../../types';
import { createGenerateSqlString } from './createGenerate';
import { type Database } from '../types';

type RemoteDataSqlite = (connect: Database, nameTable: string, params: Params) => Promise<BaseReturnProps>;

const generateSQLDelete = createGenerateSqlString('DELETE FROM');
export const removeDataSqlite:RemoteDataSqlite = (connect, nameTable, param) => new Promise((resolve, reject) => {
  const { sql, values } = generateSQLDelete(nameTable, param);
  connect.transaction(
    (tx) => {
      tx.executeSql(sql, values,
        (tx, res) => { resolve({status: true, msg: "Успешное удаление"})  },
        (tx, err) => { console.log(`removeDataSqlite: ${err}`) },
      );
    },
    (err) => { reject({status: false, msg: `>>> Ошибка в -> removeDataSqlite <<<: ${nameTable}:  ${err}`}) },
    () => { const msg = `Успешная транзакция removeDataSqlite. ${nameTable}`; }
  )
})
