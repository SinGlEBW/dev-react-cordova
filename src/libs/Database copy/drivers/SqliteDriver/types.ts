

interface Transaction {
  executeSql(statement: string, params?: any[], success?: TransactionStatementSuccessCallback, error?: TransactionStatementErrorCallback): void;
}
type OpenArgs = {
  name: string;
  location?: string;
  iosDatabaseLocation?: string;
  androidDatabaseImplementation?: number;
  androidLockWorkaround?: number;
  createFromLocation?: number;
} & {[key: string]: any;}

export interface Database {
  transaction(fn: TransactionFunction, error?: ErrorCallback, success?: SuccessCallback): void;
  readTransaction(fn: TransactionFunction, error?: ErrorCallback, success?: SuccessCallback): void;
  executeSql(statement: string, params?: any[], success?: StatementSuccessCallback, error?: ErrorCallback): void;
  sqlBatch(sqlStatements: Array<string | [string, any[]]>, success?: SuccessCallback, error?: ErrorCallback): void;
  close(success?: SuccessCallback, error?: ErrorCallback): void;
  openDBs: {[key in string]: OpenArgs}
}

interface Results <T>{
  rowsAffected: number;
  insertId?: number | undefined;
  rows: {
    length: number;
    item(i: number): T;
  };
}
type TransactionFunction = (tx: Transaction) => void;
type SuccessCallback = () => void;
type DatabaseSuccessCallback = (db: Database) => void;
type StatementSuccessCallback = <T>(results: Results<T>) => void;
type TransactionStatementSuccessCallback = <T>(tx: Transaction, results: Results<T>) => void;
type ErrorCallback = (err: Error) => void;
type TransactionStatementErrorCallback = (tx: Transaction, err: Error) => boolean | void;


interface DeleteArgs {
  name: string;
  location?: string | undefined;
  iosDatabaseLocation?: string | undefined;
}



interface SQLite {
  openDatabase(args: OpenArgs, success?: DatabaseSuccessCallback, error?: ErrorCallback): Database;
  deleteDatabase(args: DeleteArgs, success?: SuccessCallback, error?: ErrorCallback): void;
  selfTest(success?: SuccessCallback, error?: ErrorCallback): void;
  echoTest(ok?: (value: string) => void, error?: (msg: string) => void): void;
}

declare global {
  interface Window {
    sqlitePlugin: SQLite;
    db:Database
  }
}
