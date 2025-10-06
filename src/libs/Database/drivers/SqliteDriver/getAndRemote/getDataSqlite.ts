import { type Params, type ResultGetDataSqlite } from '../../types';
import { createGenerateSqlString } from './createGenerate';
import { Database } from '../types';

const generateSQLSelect = createGenerateSqlString('SELECT * FROM');

export type GetDataSqlite = (connect: Database, nameTable: string, params: Params) => Promise<ResultGetDataSqlite>;

export const getDataSqlite:GetDataSqlite = (connect, nameTable, params) => new Promise((resolve, reject) => {
  connect.transaction(
    (tx) => {     
      tx.executeSql(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [nameTable],
        (tx, res) => {
          const isTables = res.rows.item(0) && (res.rows.item(0) as {name: string}).name === nameTable; 
          if(isTables){      
            const { sql, values } = generateSQLSelect(nameTable, params)
            tx.executeSql(sql, values,
              (tx, res) => { 
                const values:any[] = [];
                for (let i = 0; i < res.rows.length; i++) {    values.push(res.rows.item(i))   }
                if(!values.length){
                  resolve({status: false, values, msg: 'Данных нет в таблице'});  
                }else{
                  resolve({status: true, values, msg: 'Данные найдены'});                                      
                }
              },
              (tx, err) => {console.error(err); }//ошибка должна всплыть  
            );
            return;
          }
          resolve({status: false, values: [],  msg: 'Таблицы нет'});                                        
        },
        (tx, err) => console.error(err)
      ); 
    },
    (error) => { reject({status: false, msg: error}); }, 
    () => {   }
  )
})



