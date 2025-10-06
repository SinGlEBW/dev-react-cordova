import { StorageDriverProps } from "../types";

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
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("updateAt", "updateAt", { unique: false });
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

      // ✅ Проверяем что таблица вообще существует
      if (!this.db.objectStoreNames.contains(nameTable)) {
        return { status: false, msg: `Таблица ${nameTable} не существует` };
      }

      return new Promise((resolve) => {
        debugger
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

      const store = this.getStore(nameTable, "readwrite");

      const record = {
        id: key,
        ...payload,
        ...(options?.isCreateDate !== false && {
          createdAt: new Date().toISOString(),
          updateAt: new Date().toISOString(),
        }),
      };

      return new Promise((resolve) => {
        const request = store.add(record);

        request.onsuccess = () => {
          resolve({ status: true, msg: `Данные добавлены в ${nameTable}` });
        };

        request.onerror = () => {
          // Если запись с таким key уже существует - делаем update
          if (request.error?.name === "ConstraintError") {
            this.updateData(nameTable, payload, { where: { id: key } })
              .then(resolve)
              .catch(() => resolve({ status: false, msg: `Ошибка обновления данных в ${nameTable}` }));
          } else {
            resolve({ status: false, msg: `Ошибка добавления данных в ${nameTable}` });
          }
        };
      });
    } catch (error) {
      return { status: false, msg: `Ошибка: ${error}` };
    }
  };

  updateData: StorageDriverProps["updateData"] = async (nameTable, payload, { where }) => {
    try {
      await this.ensureTableExists(nameTable);
      const store = this.getStore(nameTable, "readwrite");

      const id = (where as any).id;
      if (!id) {
        return { status: false, msg: "Для IndexedDB необходимо указать ID в where" };
      }

      return new Promise((resolve) => {
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          const existing = getRequest.result;
          if (!existing) {
            resolve({ status: false, msg: "Запись не найдена" });
            return;
          }

          const updatedRecord = {
            ...existing,
            ...payload,
            updateAt: new Date().toISOString(),
          };

          const putRequest = store.put(updatedRecord);
          putRequest.onsuccess = () => {
            resolve({ status: true, msg: `Данные обновлены в ${nameTable}` });
          };
          putRequest.onerror = () => {
            resolve({ status: false, msg: `Ошибка обновления данных в ${nameTable}` });
          };
        };

        getRequest.onerror = () => {
          resolve({ status: false, msg: `Ошибка поиска записи в ${nameTable}` });
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

      return new Promise((resolve) => {
        const request = store.getAll();
        const values: any[] = [];

        request.onsuccess = () => {
          let results = request.result;

          if (params?.where) {
            results = results.filter((item) => {
              return Object.entries(params.where!).every(([key, value]) => item[key] === value);
            });
          }

          values.push(...results);

          resolve({
            status: true,
            values: values.length ? values : [],
            msg: values.length ? "Данные найдены" : "Данных нет в таблице",
          });
        };

        request.onerror = () => {
          resolve({ status: false, values: [], msg: `Ошибка получения данных из ${nameTable}` });
        };
      });
    } catch (error) {
      return { status: false, values: [], msg: `Ошибка: ${error}` };
    }
  };

  removeData: StorageDriverProps["removeData"] = async (nameTable, params) => {
    try {
      await this.ensureTableExists(nameTable);
      const store = this.getStore(nameTable, "readwrite");

      if (params?.where && (params.where as any).id) {
        return new Promise((resolve) => {
          const request = store.delete((params.where as any).id);

          request.onsuccess = () => {
            resolve({ status: true, msg: "Данные удалены по ID" });
          };

          request.onerror = () => {
            resolve({ status: false, msg: "Ошибка удаления данных по ID" });
          };
        });
      } else if (params?.where && Object.keys(params.where).length > 0) {
        return new Promise((resolve) => {
          const getRequest = store.getAll();

          getRequest.onsuccess = () => {
            const results = getRequest.result;
            const recordsToDelete = results.filter((item) => {
              return Object.entries(params.where!).every(([key, value]) => item[key] === value);
            });

            if (recordsToDelete.length === 0) {
              resolve({ status: false, msg: "Записи для удаления не найдены" });
              return;
            }

            // Удаляем все найденные записи
            const deletePromises = recordsToDelete.map((record) => {
              return new Promise((resolveDelete) => {
                const deleteRequest = store.delete(record.id);
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
      } else {
        return new Promise((resolve) => {
          const request = store.clear();

          request.onsuccess = () => {
            resolve({ status: true, msg: `Все данные из ${nameTable} удалены` });
          };

          request.onerror = () => {
            resolve({ status: false, msg: `Ошибка очистки ${nameTable}` });
          };
        });
      }
    } catch (error) {
      return { status: false, msg: `Ошибка: ${error}` };
    }
  };
}
