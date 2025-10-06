const CONSTANST = {
  ID: 'INTEGER PRIMARY KEY',
  TEXT: 'TEXT NOT NULL',
  INTEGER: 'INTEGER NOT NULL',
  createdAt: "datetime default (datetime('now','localtime'))",
  updateAt: "datetime default (datetime('now','localtime'))",
} as const

type GenerateSQLCreateTable = (nameTable: string, payload: object, isCreateDate?: boolean) => { sql: string }

const generateSQLCreateTable:GenerateSQLCreateTable = (nameTable, payload, isCreateDate) => {

  let sql = '';
  if(!Object.entries(payload).length){ throw new Error('payload пуст'); } 

  const defaultSqlStr = `CREATE TABLE IF NOT EXISTS ${nameTable} ()`;//
  for( let i = 0; i < defaultSqlStr.length; i++ ){
    sql += defaultSqlStr[i];

    if(defaultSqlStr[i] === '('){
      sql += `id ${CONSTANST.ID},`;

      for(const key in payload){
        const value = payload[key];
         if (typeof value === 'number') {
          sql += `${key} ${CONSTANST.INTEGER},`;
        } else {
          sql += `${key} ${CONSTANST.TEXT},`; // string, boolean, object, array, etc.
        }
      }
      // sql += 'type TEXT NOT NULL,';
      // TODO: createdAt updateAt - не правильно работают 
      if(isCreateDate !== false){
        sql += `createdAt ${CONSTANST.createdAt},updateAt ${CONSTANST.updateAt},`
      } 
      sql = sql.replace(/,$/ig, '');
    }
  }
  return { sql } 
}

export { generateSQLCreateTable, type GenerateSQLCreateTable };