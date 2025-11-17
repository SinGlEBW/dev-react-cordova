
import { type BaseReturnProps } from '../../types';
import { type Database } from '../types';

export interface UpdateWhere {
  where: object;
  condition?: "AND" | "OR";
}

export interface UpdatePayloadProps{
  connect: Database, 
  nameTable: string, 
  payload: object, 
  config: UpdateWhere,
  isUpdateAt?: boolean
}
export type UpdateDataSqlite = (payload:UpdatePayloadProps) => Promise<BaseReturnProps>;