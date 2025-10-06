import { type BaseReturnProps, type BaseSqliteOptions } from "../../types";
import { generateSQLCreateTable } from "./generateCREATE";
import { generateSQLInsertInto } from "./generateINSERT";
import { type Database } from "../types";



const ensureColumnsExist = async (connect: Database, nameTable: string, payload: object) => {
  return new Promise((resolve) => {
    connect.transaction((tx) => {
      tx.executeSql(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`, 
        [nameTable],
        (tx, res) => {
          if (res.rows.length === 0) {
            resolve(false); 
            return;
          }
          
          tx.executeSql(`PRAGMA table_info(${nameTable})`, [], (tx, res) => {
            const existingColumns: string[] = [];
            for (let i = 0; i < res.rows.length; i++) {
              existingColumns.push((res.rows.item(i) as { name: string }).name);
            }

            let columnsAdded = false;
            for (const column of Object.keys(payload)) {
              if (!existingColumns.includes(column) && column !== "id") {
                const value = (payload as any)[column];
                const type = typeof value === "number" ? "INTEGER" : "TEXT";
                tx.executeSql(`ALTER TABLE ${nameTable} ADD COLUMN ${column} ${type}`);
                columnsAdded = true;
                console.log(`✅ Добавлена колонка ${column} в таблицу ${nameTable}`);
              }
            }
            resolve(columnsAdded);
          });
        }
      );
    });
  });
};



export type SetDataSqlite = (connect: Database, nameTable: string, key: string | number, payload: object, options?: BaseSqliteOptions) => Promise<BaseReturnProps>;
export const setDataSqlite: SetDataSqlite = async (connect, nameTable, key, payload, options) => {
  const resultCreateTable = generateSQLCreateTable(nameTable, payload, options?.isCreateDate ? options?.isCreateDate : undefined);
  const resultInsertInto = generateSQLInsertInto(nameTable, key, payload);
  await ensureColumnsExist(connect, nameTable, payload);

  return new Promise((resolve, reject) => {
    connect.transaction(
      (tx) => {
        options?.rewriteTable && tx.executeSql(`DROP TABLE IF EXISTS ${nameTable}`);
        tx.executeSql(resultCreateTable.sql); //Если не существует создаст
        const insertOrReplaceSQL = resultInsertInto.sql.replace('INSERT INTO', 'INSERT OR REPLACE INTO');
        tx.executeSql(insertOrReplaceSQL, resultInsertInto.values);
      },
      (err) => { reject({ status: false, msg: `>>> Ошибка в -> setDataSqlite <<<: ${err}` });},
      () => { resolve({ status: true, msg: `Успешная транзакция setDataSqlite. ${nameTable}` }); }
    );
  });
};


/*
db.sqlBatch([
  'CREATE TABLE IF NOT EXISTS DemoTable (name, score)',
  [ 'INSERT INTO DemoTable VALUES (?,?)', ['Alice', 101] ],
  [ 'INSERT INTO DemoTable VALUES (?,?)', ['Betty', 202] ],
], function() {
  console.log('Populated database OK');
}, function(error) {
  console.log('SQL batch ERROR: ' + error.message);
});
*/
