
export interface BaseReturnProps {
  status: boolean;
  msg: string;
}

export interface ResultGetDataSqlite extends BaseReturnProps {
  values: [] | { [key in string]: any }[];
}


export interface Params {
  where?: {[key in string]: string};
  whereKey?: Record<string, string[]>;
  ignoreWhere?: Record<string, string[]>;
  condition?: "AND" | "OR";
}

export interface BaseSqliteOptions {
  isCreateDate?: boolean;
  rewriteTable?: boolean;
}


export interface UpdateWhere {
  where: {[key in string]: string};
  // condition?: "AND" | "OR";
}

// export type BaseFunctionSqlite = (connect: Database, nameTable: string) => Promise<BaseReturnProps & { tables?: string[] }>;
export interface StorageDriverProps{
  dropTable(nameTable: string): Promise<BaseReturnProps>;
  getData(nameTable: string, params?: Omit<Params, 'condition'>, isParse?: boolean): Promise<ResultGetDataSqlite>;
  setData(nameTable: string, key: string | number, payload: object, options?: BaseSqliteOptions): Promise<BaseReturnProps>;
  updateData(nameTable: string, payload: object, { where }: UpdateWhere): Promise<BaseReturnProps>;
  removeData(nameTable: string, params?: Params): Promise<BaseReturnProps>;
  checkTable(nameTable: string): Promise<BaseReturnProps>;
  query(sql: string): Promise<BaseReturnProps>;
  openDB(): any;
  closeDB(): void;
  isSupported(): boolean;
}


export type DriverType = 'sqlite' | 'indexedDB';


export interface StorageOptions {
  driver: DriverType[];
  defaultDriver?: DriverType;
  dbName?: string;
}

export type DriverOptions = Pick<StorageOptions, 'dbName'>


