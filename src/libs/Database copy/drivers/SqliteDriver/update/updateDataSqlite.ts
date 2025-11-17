import { generateSQLUpdate } from './generateUpdate';
import { UpdateDataSqlite } from './types';

export const updateDataSqlite:UpdateDataSqlite = ({connect, nameTable, payload, config, isUpdateAt}) => {
  return new Promise((resolve, reject) => {
    const { sql, values } = generateSQLUpdate({nameTable, payload, config, isUpdateAt});
    connect.transaction(
      (tx) => { tx.executeSql(sql, values); },
      (err) => { reject({status: false, msg: `>>> Ошибка в -> updateDataSqlite <<<: ${nameTable}:  ${err}`}) },
      () => { resolve({status: true, msg: `Успешная транзакция updateDataSqlite. ${nameTable}`}) }
    )
  })
}




