
import { getStatusAndDataJson } from "../helpers";
import { type DriverOptions, type StorageDriverProps } from "../types";
import { checkTableSqlite, dropTableSqlite, openDbSqlite, querySqlite } from './base';
import { getDataSqlite, } from './getAndRemote/getDataSqlite';
import { removeDataSqlite } from './getAndRemote/removeDataSqlite';
import { setDataSqlite } from './set/setDataSqlite';
import { updateDataSqlite } from './update/updateDataSqlite';

export class SqliteDriver{
  private isCreateDate = true;
  private dbName: string = '';
  private version: number = 1;
 
  constructor(options: DriverOptions) {
    
    this.dbName = options?.dbName || "app-database";
  }
  openDB: StorageDriverProps["openDB"] = () => openDbSqlite();
  closeDB = () => (window.db ? window.db.close() : console.log("Не возможно закрыть базу"));

  query: StorageDriverProps["query"] = (sql) => {
    return new Promise((resolve, reject) => {
      querySqlite(this.openDB(), sql).then(resolve).catch(reject);
    });
  };

  checkTable: StorageDriverProps["checkTable"] = (nameTable) => {
    return new Promise((resolve, reject) => {
      checkTableSqlite(this.openDB(), nameTable).then(resolve).catch(reject);
    });
  };

  setData: StorageDriverProps["setData"] = (nameTable, key, payload, options) => {
    return new Promise((resolve, reject) => {
      setDataSqlite(this.openDB(), nameTable, key, payload, options).then(resolve).catch(reject);
    });
  };

  updateData: StorageDriverProps["updateData"] = (nameTable, payload, { where }) => {
    return new Promise((resolve, reject) => {
      this.getData(nameTable, { where })
        .then(({ status, values }) => {
          const isUpdateAt = values[0] && "createdAt" in values[0];
          updateDataSqlite({
            connect: this.openDB(),
            nameTable,
            payload,
            config: { where },
            isUpdateAt,
          })
            .then(resolve)
            .catch(reject);
        })
        .catch(reject);
    });
  };

  getData: StorageDriverProps["getData"] = (nameTable, params, isParse = false) => {
    return new Promise((resolve, reject) => {
      const propsParams = params || {};

      getDataSqlite(this.openDB(), nameTable, propsParams)
        .then((data) => {
          if (isParse && data.values.length) {
            for (let i = 0; i < data.values.length; i++) {
              const ob = data.values[i];
              for (const [key, value] of Object.entries(ob)) {
                if (["createdAt", "updateAt", "id"].includes(key)) continue;
                const [isJson, parseData] = getStatusAndDataJson(value);
                if (isJson) {
                  data.values[i][key] = parseData;
                }
              }
            }
          }
          resolve(data);
        })
        .catch(reject);
    });
  };

  removeData: StorageDriverProps["removeData"] = (nameTable, params) => {
    return new Promise((resolve, reject) => {
      const propsParams = params ? params : {};
      removeDataSqlite(this.openDB(), nameTable, propsParams) //{where, whereKey, ignoreWhere, stringWhere, condition}
        .then(resolve)
        .catch(reject);
    });
  };

  dropTable: StorageDriverProps["dropTable"] = (nameTable) => {
    //TODO: Таблицы может не быть но выводит сообщение успешное удаление
    return new Promise((resolve, reject) => {
      dropTableSqlite(this.openDB(), nameTable).then(resolve).catch(reject);
    });
  };
  isSupported(): boolean {
    return !!(window.cordova && window.sqlitePlugin);
  }
}


