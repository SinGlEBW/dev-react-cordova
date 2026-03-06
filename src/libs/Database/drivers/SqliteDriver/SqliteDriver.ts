import { getStatusAndDataJson } from "../helpers";
import { type BaseSqliteOptions, type DriverOptions, type StorageDriverProps } from "../types";
import { checkTableSqlite, dropTableSqlite, openDbSqlite, querySqlite } from "./base";
import { getDataSqlite } from "./getAndRemote/getDataSqlite";
import { removeDataSqlite } from "./getAndRemote/removeDataSqlite";
import { setDataSqlite } from "./set/setDataSqlite";
import { updateDataSqlite } from "./update/updateDataSqlite";

export class SqliteDriver {
  private isCreateDate = true;
  private dbName: string = "";
  private version: number = 1;

  constructor(options: DriverOptions) {
    this.dbName = options?.dbName || "app-database";
  }
  //Добавить dropDB
  openDB: StorageDriverProps["openDB"] = () => openDbSqlite(this.dbName);
  closeDB = () => (window.db ? window.db.close() : console.log("Не возможно закрыть базу"));


  deleteDatabase: StorageDriverProps["deleteDatabase"] = async () => {
    const dbName = this.dbName
    try {
      // Закрываем текущее соединение если оно открыто
      this.closeDB();

      return new Promise((resolve, reject) => {
        // Удаляем базу данных через Cordova SQLite plugin
        window.sqlitePlugin.deleteDatabase(
          {
            name: dbName,
            location: "default",
          },
          // Success callback
          () => {
            console.log(`✅ База данных SQLite "${dbName}" успешно удалена`);

            // Очищаем глобальную ссылку если это текущая база
            if (window.db && window.db.openDBs && window.db.openDBs[dbName]) {
              delete window.db.openDBs[dbName];
              if (Object.keys(window.db.openDBs).length === 0) {
                // window.db = null;
              }
            }

            resolve({
              status: true,
              msg: `База данных "${dbName}" удалена`,
            });
          },
          // Error callback
          (error: any) => {
            console.error(`❌ Ошибка удаления базы SQLite "${dbName}":`, error);

            // Некоторые специфичные ошибки SQLite
            let errorMessage = error?.message || "неизвестная ошибка";

            // Обработка специфичных ошибок
            if (error?.code === 1 && errorMessage.includes("no such table")) {
              errorMessage = "База данных не существует";
            }

            resolve({
              status: false,
              msg: `Ошибка удаления базы данных: ${errorMessage}`,
            });
          },
        );
      });
    } catch (error) {
      return {
        status: false,
        msg: `Ошибка: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  };
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

  async setList(nameTable: string, list: Array<{ [key in string]: any } & { id: string | number }>, options: BaseSqliteOptions) {
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      this.setData(nameTable, item.id, item, options);
    }
    return { status: true, msg: `Список в ${nameTable} добавлен` };
  }

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
