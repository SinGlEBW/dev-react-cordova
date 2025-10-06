import { convertByTypeForDB } from "../../helpers";
import { Params } from "../../types";

type ChunkSQL = "DELETE FROM" | "SELECT * FROM";

export const createGenerateSqlString = (chunkSQL: ChunkSQL) => {
  const buildWhereConditions = (conditionsObj: Record<string, any[]>, operator: "=" | "!=" = "=", condition: string = "OR"): { sql: string; values: any[] } => {
    const conditions: string[] = [];
    const values: any[] = [];

    for (const [key, keyValues] of Object.entries(conditionsObj)) {
      if (keyValues.length > 0) {
        const conditionParts = keyValues.map(() => `${key} ${operator} ?`);
        conditions.push(`(${conditionParts.join(` ${condition} `)})`);
        values.push(...keyValues.map(convertByTypeForDB));
      }
    }

    return {
      sql: conditions.join(" AND "),
      values,
    };
  };

  return (nameTable: string, { where, whereKey, ignoreWhere, condition = "OR" }: Params) => {
    const values: any[] = [];
    const whereConditions: string[] = [];

    if (where && Object.keys(where).length) {
      for (const [key, value] of Object.entries(where)) {
        whereConditions.push(`${key} = ?`);
        values.push(convertByTypeForDB(value));
      }
    }

    if (whereKey && Object.keys(whereKey).length) {
      const result = buildWhereConditions(whereKey, "=", condition);
      whereConditions.push(result.sql);
      values.push(...result.values);
    }

    if (ignoreWhere && Object.keys(ignoreWhere).length) {
      const result = buildWhereConditions(ignoreWhere!, "!=", condition);
      whereConditions.push(result.sql);
      values.push(...result.values);
    }

    let sql = `${chunkSQL} ${nameTable}`;

    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(" AND ")}`;
    } else if (chunkSQL === "DELETE FROM") {
      console.warn(`ВНИМАНИЕ: Будут удалены все записи в таблице ${nameTable}`);
    }

    return { values, sql };
  };
};
