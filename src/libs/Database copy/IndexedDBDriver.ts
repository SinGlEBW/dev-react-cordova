import { StorageDriverProps } from "./drivers/types";

export class IndexedDBDriver {
  private dbName: string = "app-database";
  private version: number = 1;
  private db: IDBDatabase | null = null;
  constructor(options?: { dbName?: string }) {
    this.dbName = options?.dbName || "app-database";
  }
  private async ensureTableExists(nameTable: string): Promise<void> {
    const currentVersion = await this.getCurrentDBVersion();

    await this.openDB();
    if (this.db?.objectStoreNames.contains(nameTable)) return;
    this.closeDB();

    return new Promise((resolve, reject) => {
      const newVersion = currentVersion + 1;
      const request = indexedDB.open(this.dbName, newVersion);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(nameTable)) {
          const store = db.createObjectStore(nameTable, {
            autoIncrement: false,
          });
          store.createIndex("_key", "_key", { unique: true });
          store.createIndex("id", "id", { unique: false });
          // store.createIndex("createdAt", "createdAt", { unique: false });
          // store.createIndex("updateAt", "updateAt", { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Не удалось создать таблицу ${nameTable}`));
      };
    });
  }
  private async getCurrentDBVersion(): Promise<number> {
    return new Promise((resolve) => {
      const request = indexedDB.open(this.dbName);
      request.onsuccess = () => {
        const db = request.result;
        const version = db.version;
        db.close();
        resolve(version);
      };
      request.onerror = () => resolve(0); // Если БД нет
    });
  }
  isSupported: StorageDriverProps["isSupported"] = () => {
    return !!window.indexedDB;
  };

  openDB: StorageDriverProps["openDB"] = async () => {
    if (this.db) return this.db;

    const currentVersion = await this.getCurrentDBVersion();
    const versionToOpen = currentVersion || 1;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, versionToOpen);

      request.onerror = () => reject({ status: false, msg: "Ошибка открытия IndexedDB" });
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = () => {
        // Базовые таблицы если нужно
      };
    });
  };

  closeDB: StorageDriverProps["closeDB"] = () => {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  };

  private getStore(nameTable: string, mode: IDBTransactionMode = "readonly") {
    if (!this.db) throw new Error("База данных не открыта");
    if (!this.db.objectStoreNames.contains(nameTable)) {
      throw new Error(`Таблица ${nameTable} не существует`);
    }
    const transaction = this.db.transaction([nameTable], mode);
    return transaction.objectStore(nameTable);
  }

  query: StorageDriverProps["query"] = async (sql) => {
    return { status: false, msg: "IndexedDB не поддерживает SQL запросы" };
  };

  checkTable: StorageDriverProps["checkTable"] = async (nameTable) => {
    try {
      await this.openDB();
      if (!this.db) return { status: false, msg: "База не открыта" };

      const tableExists = this.db.objectStoreNames.contains(nameTable);
      return {
        status: tableExists,
        msg: tableExists ? `Таблица ${nameTable} существует` : `Таблица ${nameTable} не найдена`,
      };
    } catch (error) {
      return { status: false, msg: `Ошибка проверки таблицы: ${error}` };
    }
  };

  dropTable: StorageDriverProps["dropTable"] = async (nameTable) => {
    try {
      await this.openDB();
      if (!this.db) return { status: false, msg: "База не открыта" };

      if (!this.db.objectStoreNames.contains(nameTable)) {
        return { status: false, msg: `Таблица ${nameTable} не существует` };
      }

      return new Promise((resolve) => {
        debugger;
        const currentVersion = this.db?.version || this.version;
        const newVersion = currentVersion + 1;
        this.closeDB();

        const request = indexedDB.open(this.dbName, newVersion);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (db.objectStoreNames.contains(nameTable)) {
            db.deleteObjectStore(nameTable);
            console.log(`✅ Таблица ${nameTable} удалена в onupgradeneeded`);
          }
        };

        request.onsuccess = () => {
          this.db = request.result;
          console.log(`✅ База открыта с новой версией: ${this.db.version}`);
          resolve({ status: true, msg: `Таблица ${nameTable} удалена` });
        };

        request.onerror = (error) => {
          console.error(`❌ Ошибка удаления таблицы:`, error);
          resolve({ status: false, msg: `Ошибка удаления таблицы ${nameTable}: ${error}` });
        };

        // ✅ Добавляем обработчик blocked (на случай если есть другие соединения)
        request.onblocked = () => {
          console.warn(`⚠️ База заблокирована другими соединениями`);
          resolve({ status: false, msg: `База заблокирована, закройте другие соединения` });
        };
      });
    } catch (error) {
      return { status: false, msg: `Ошибка: ${error}` };
    }
  };

  setData: StorageDriverProps["setData"] = async (nameTable, key, payload, options) => {
    try {
      await this.ensureTableExists(nameTable);

      const record = {
        _key: key,
        ...payload,
        ...(options?.isCreateDate !== false && {
          createdAt: new Date().toISOString(),
          updateAt: new Date().toISOString(),
        }),
      };

      try {
        const addStore = this.getStore(nameTable, "readwrite");
        await new Promise((resolve, reject) => {
          const request = addStore.add(record, key);
          request.onsuccess = () => resolve(true);
          request.onerror = () => reject(request.error);
        });
        return { status: true, msg: `Данные добавлены в ${nameTable}` };
      } catch (addError) {
        if ((addError as any)?.name === "ConstraintError") {
          try {
            const putStore = this.getStore(nameTable, "readwrite");
            await new Promise((resolve, reject) => {
              const request = putStore.put(record, key);
              request.onsuccess = () => resolve(true);
              request.onerror = () => reject(request.error);
            });
            return { status: true, msg: `Данные обновлены в ${nameTable}` };
          } catch (putError) {
            return { status: false, msg: `Ошибка обновления данных в ${nameTable}: ${putError}` };
          }
        } else {
          return { status: false, msg: `Ошибка добавления данных в ${nameTable}: ${addError}` };
        }
      }
    } catch (error) {
      return { status: false, msg: `Ошибка: ${error}` };
    }
  };

  updateData: StorageDriverProps["updateData"] = async (nameTable, payload, { where }) => {
    try {
      await this.ensureTableExists(nameTable);
      const store = this.getStore(nameTable, "readwrite");

      if (!where || Object.keys(where).length === 0) {
        return { status: false, msg: "Для обновления необходимо указать условия WHERE" };
      }

      return new Promise((resolve) => {
        const getRequest = store.getAll();

        getRequest.onsuccess = () => {
          const results = getRequest.result;

          const recordsToUpdate = results.filter((item) => {
            return Object.entries(where).every(([key, value]) => item[key] === value);
          });

          if (recordsToUpdate.length === 0) {
            resolve({ status: false, msg: "Записи для обновления не найдены" });
            return;
          }

          const updatePromises = recordsToUpdate.map((record) => {
            return new Promise((resolveUpdate) => {
              const updatedRecord = {
                ...record,
                ...payload,
                updateAt: new Date().toISOString(),
              };

              const storageKey = record._key;
              const putRequest = store.put(updatedRecord, storageKey);

              putRequest.onsuccess = () => resolveUpdate(true);
              putRequest.onerror = () => resolveUpdate(false);
            });
          });

          Promise.all(updatePromises).then((results) => {
            const successCount = results.filter(Boolean).length;
            resolve({
              status: true,
              msg: `Обновлено ${successCount} из ${recordsToUpdate.length} записей`,
            });
          });
        };

        getRequest.onerror = () => {
          resolve({ status: false, msg: "Ошибка поиска записей для обновления" });
        };
      });
    } catch (error) {
      return { status: false, msg: `Ошибка: ${error}` };
    }
  };

  getData: StorageDriverProps["getData"] = async (nameTable, params, isParse = false) => {
    try {
      await this.ensureTableExists(nameTable);
      const store = this.getStore(nameTable);
      const condition = "AND";
      return new Promise((resolve) => {
        const request = store.getAll();

        request.onsuccess = () => {
          let results = request.result;

          if (params?.whereKey && "_key" in params.whereKey) {
            const storageKeys = params.whereKey._key;
            results = results.filter((item) => storageKeys.includes(item._key));

            const { _key, ...otherWhereKey } = params.whereKey;
            if (Object.keys(otherWhereKey).length > 0) {
              results = this.applyWhereKeyFilter(results, otherWhereKey, condition);
            }
          } else {
            if (params?.where) {
              results = this.applyWhereFilter(results, params.where, condition);
            }

            if (params?.whereKey) {
              results = this.applyWhereKeyFilter(results, params.whereKey, condition);
            }
          }

          if (params?.ignoreWhere) {
            results = this.applyIgnoreWhereFilter(results, params.ignoreWhere, condition);
          }
          // const cleanValues = results.map(({ _key, ...cleanData }) => cleanData);

          if (results.length === 0) {
            resolve({
              status: false,
              values: [],
              msg: "Данных нет в таблице",
            });
          } else {
            resolve({
              status: true,
              values: results,
              msg: "Данные найдены",
            });
          }
        };

        request.onerror = () => {
          resolve({ status: false, values: [], msg: `Ошибка получения данных из ${nameTable}` });
        };
      });
    } catch (error) {
      return { status: false, values: [], msg: `Ошибка: ${error}` };
    }
  };

  private applyWhereFilter(data: any[], where: object, condition: "AND" | "OR" = "AND"): any[] {
    return data.filter((item) => {
      const conditions = Object.entries(where).map(([key, value]) => item[key] === value);
      if (condition === "AND") {
        return conditions.every(Boolean);
      } else {
        return conditions.some(Boolean);
      }
    });
  }

  private applyWhereKeyFilter(data: any[], whereKey: Record<string, string[]>, condition: "AND" | "OR" = "AND"): any[] {
    return data.filter((item) => {
      const conditions = Object.entries(whereKey).map(([key, values]) => values.includes(item[key]));

      if (condition === "AND") {
        return conditions.every(Boolean);
      } else {
        return conditions.some(Boolean);
      }
    });
  }
  private applyIgnoreWhereFilter(data: any[], ignoreWhere: Record<string, string[]>, condition: "AND" | "OR" = "AND"): any[] {
    return data.filter((item) => {
      const conditions = Object.entries(ignoreWhere).map(([key, values]) => !values.includes(item[key]));

      if (condition === "AND") {
        return conditions.every(Boolean);
      } else {
        return conditions.some(Boolean);
      }
    });
  }
  removeData: StorageDriverProps["removeData"] = async (nameTable, params) => {
    try {
      await this.ensureTableExists(nameTable);
      const store = this.getStore(nameTable, "readwrite");

      // Вспомогательная функция для фильтрации с учетом ignoreWhere
      const applyFilters = (results: any[]) => {
        let filtered = results;

        // Применяем where фильтр
        if (params?.where && Object.keys(params.where).length > 0) {
          filtered = filtered.filter((item) => {
            return Object.entries(params.where!).every(([key, value]) => item[key] === value);
          });
        }

        // Применяем whereKey фильтр
        if (params?.whereKey && Object.keys(params.whereKey).length > 0) {
          filtered = filtered.filter((item) => {
            return Object.entries(params.whereKey!).every(([key, values]) => values.includes(item[key]));
          });
        }

       
        if (params?.ignoreWhere && Object.keys(params.ignoreWhere).length > 0) {
          filtered = filtered.filter((item) => {
            return Object.entries(params.ignoreWhere!).every(
              ([key, values]) => !values.includes(item[key]) // Исключаем значения
            );
          });
        }

        return filtered;
      };

      // Удаление по _key через where (игнорируем ignoreWhere для точечного удаления)
      if (params?.where?._key) {
        return new Promise((resolve) => {
          const request = store.delete(params.where!._key);

          request.onsuccess = () => {
            resolve({ status: true, msg: "Данные удалены по ключу" });
          };

          request.onerror = () => {
            resolve({ status: false, msg: "Ошибка удаления данных по ключу" });
          };
        });
      }

      // Удаление по комбинированным условиям (where, whereKey, ignoreWhere)
      if (params && (params.where || params.whereKey || params.ignoreWhere)) {
        return new Promise((resolve) => {
          const getRequest = store.getAll();

          getRequest.onsuccess = () => {
            const results = getRequest.result;
            const recordsToDelete = applyFilters(results);

            if (recordsToDelete.length === 0) {
              resolve({ status: false, msg: "Записи для удаления не найдены" });
              return;
            }

            const deletePromises = recordsToDelete.map((record) => {
              return new Promise((resolveDelete) => {
                const deleteRequest = store.delete(record._key);
                deleteRequest.onsuccess = () => resolveDelete(true);
                deleteRequest.onerror = () => resolveDelete(false);
              });
            });

            Promise.all(deletePromises).then((results) => {
              const successCount = results.filter(Boolean).length;
              resolve({
                status: true,
                msg: `Удалено ${successCount} из ${recordsToDelete.length} записей`,
              });
            });
          };

          getRequest.onerror = () => {
            resolve({ status: false, msg: "Ошибка поиска записей для удаления" });
          };
        });
      }

      // Очистка всей таблицы (если нет условий)
      return new Promise((resolve) => {
        const request = store.clear();

        request.onsuccess = () => {
          resolve({ status: true, msg: `Все данные из ${nameTable} удалены` });
        };

        request.onerror = () => {
          resolve({ status: false, msg: `Ошибка очистки ${nameTable}` });
        };
      });
    } catch (error) {
      return { status: false, msg: `Ошибка: ${error}` };
    }
  };
}
