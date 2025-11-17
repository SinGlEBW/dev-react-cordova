import { convertByTypeForDB } from '../../../helpers';

export type GenerateSQLInsertInto = (nameTable: string, key: string | number, payload: object) => { values: any[], sql: string }
export const generateSQLInsertInto: GenerateSQLInsertInto = (nameTable, key, payload) => {
  const values: any[] = [];
  let sql = '';

  let countBracket = 0;
  const defaultSqlStr = `INSERT INTO ${nameTable} () VALUES ()`;
  
  for(let i = 0; i < defaultSqlStr.length; i++ ){
    sql += defaultSqlStr[i];
  
    if(defaultSqlStr[i] === '(' && countBracket === 1){
      for(let j = 0; j < values.length; j++){ sql += '?,' }
      sql = sql.replace(/,$/ig, '');
    }
  
    if(defaultSqlStr[i] === '(' && countBracket === 0){
      countBracket++;
      
      sql += `id,`;
      values.push(key);
      
      for(const fieldName in payload){
        sql += `${fieldName},`;
        const val = convertByTypeForDB(payload[fieldName]);
        values.push(val);
      }
      sql = sql.replace(/,$/ig, '');
    }
  }
  return { sql, values }
}
