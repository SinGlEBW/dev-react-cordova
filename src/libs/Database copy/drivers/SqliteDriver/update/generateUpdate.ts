import { convertByTypeForDB } from "../../../helpers";
import { UpdatePayloadProps } from './types';


export type GenerateSQLUpdateProps = Omit<UpdatePayloadProps, 'connect'>

export const generateSQLUpdate = ({nameTable, payload, config: { where }, isUpdateAt}: GenerateSQLUpdateProps) => {
  const values: any[] = [];

  const setParts: string[] = [];
  for (const [key, value] of Object.entries(payload)) {
    setParts.push(`${key} = ?`);
    values.push(convertByTypeForDB(value));
  }

  if (isUpdateAt) {
    setParts.unshift("updateAt = datetime('now','localtime')");
  }

  const sql = `UPDATE ${nameTable} SET ${setParts.join(", ")}`;

  if (where && Object.keys(where).length) {
    const whereParts: string[] = [];
    for (const [key, value] of Object.entries(where)) {
      whereParts.push(`${key} = ?`);
      values.push(convertByTypeForDB(value));
    }
  } else {
    throw new Error("WHERE условие обязательно для UPDATE запроса");
  }

  return { values, sql };
};
