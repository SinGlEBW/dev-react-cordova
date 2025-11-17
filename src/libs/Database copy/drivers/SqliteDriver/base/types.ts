import type { BaseReturnProps } from '../../types';
import { Database } from '../types';

export type BaseFunctionSqlite = (connect: Database, nameTable: string) => Promise<BaseReturnProps & { tables?: string[] }>;