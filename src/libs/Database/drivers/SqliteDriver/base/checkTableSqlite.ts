import { BaseFunctionSqlite } from './types';

export const checkTableSqlite:BaseFunctionSqlite = (connect, nameTable) => new Promise((resolve, reject) => {
  connect.transaction(
    (tx) => {
      const sql = `SELECT name FROM sqlite_master WHERE type='table' AND name= ?`
      tx.executeSql(
        sql, 
        [nameTable],
        (tx, res) => {
          if(nameTable){
            const isTable = res.rows.item(0) && (res.rows.item(0) as {name: string}).name === nameTable;
            if(isTable){ 
              resolve({ status: true, msg: `Таблица ${nameTable} существует` })
              return;
            }
            resolve({ status: false, msg: `Таблица ${nameTable} не найдена` });  
          }else{
            const tables:any = [];
            for (let i = 0; i < res.rows.length; i++) {
              tables.push(res.rows.item(i))
            }
            resolve({ status: true, msg: 'Список найденных таблиц', tables })
          }
        },
        (tx, err) => {  console.log(err);  },
      )
    },
    (err) => { reject({status: false, msg: `Ошибка транзакции checkTable: ${err}`}) },    
    () => {  }
  )
})
