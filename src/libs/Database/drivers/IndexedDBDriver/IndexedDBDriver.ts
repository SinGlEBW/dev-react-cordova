import { getLocalDateTime } from "../helpers";
import { StorageDriverProps } from "../types";

/** Сколько ждём снятия блокировки, прежде чем вернуть ошибку. */
const BLOCKED_TIMEOUT_MS = 3000;

export class IndexedDBDriver {
  private dbName: string = "app-database";
  private connections = new Set<IDBDatabase>();
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;
  private schemaLock: Promise<unknown> = Promise.resolve();
  /**
   * true, пока идёт «закрытие» драйвера (closeDB/dispose/pagehide).
   * Нужен, чтобы upgrade-запросы, завершившиеся уже после закрытия
   * (например, в bfcache), не регистрировали своё соединение — иначе оно
   * останется жить в замороженной вкладке и будет блокировать чужие upgrade.
   */
  private closing = false;
  private onPageHide = () => this.closeAllConnections();

  constructor(options?: { dbName?: string }) {
    this.dbName = options?.dbName || "app-database";

    // Закрываем соединения при уходе со страницы (в т.ч. в bfcache),
    // чтобы «замороженная» вкладка не блокировала upgrade в других вкладках.
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", this.onPageHide);
    }
  }

  /**
   * Явное освобождение ресурсов. Вызывать, если драйвер создаётся/уничтожается
   * многократно (например, в React-компоненте), иначе listener будет копиться.
   */
  dispose(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("pagehide", this.onPageHide);
    }
    this.closeAllConnections();
  }

  // ---------------------------------------------------------------------------
  // Управление соединениями
  // ---------------------------------------------------------------------------

  private trackConnection(db: IDBDatabase): void {
    this.connections.add(db);

    // Если другая вкладка поднимает версию — закрываемся, чтобы не блокировать.
    db.onversionchange = () => {
      this.closeConnection(db);
      if (this.db === db) this.db = null;
    };

    // Дополнительная очистка (не везде поддерживается, но не мешает).
    db.onclose = () => {
      this.connections.delete(db);
      if (this.db === db) this.db = null;
    };
  }

  private closeConnection(db: IDBDatabase): void {
    this.connections.delete(db);
    try {
      db.close();
    } catch {
      /* ignore */
    }
  }

  private closeAllConnections(): void {
    this.closing = true;

    for (const db of this.connections) {
      try {
        db.close();
      } catch {
        /* ignore */
      }
    }
    this.connections.clear();
    this.db = null;
    this.dbPromise = null;
  }

  // ---------------------------------------------------------------------------
  // Мьютекс для операций, меняющих схему (upgrade version)
  // ---------------------------------------------------------------------------

  private withSchemaLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.schemaLock.then(fn, fn);
    this.schemaLock = run.catch(() => {});
    return run;
  }

  // ---------------------------------------------------------------------------
  // Утилиты
  // ---------------------------------------------------------------------------

  /**
   * Возвращает текущую версию БД.
   * null — не удалось определить (ошибка/приватный режим/блокировка).
   * ВАЖНО: вызывать только после closeAllConnections (внутри withSchemaLock),
   * иначе временное соединение может помешать чужому upgrade.
   */
  private async getCurrentDBVersion(): Promise<number | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open(this.dbName);
      request.onsuccess = () => {
        const db = request.result;
        const version = db.version;
        db.close();
        resolve(version);
      };
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
  }

  private getStore(nameTable: string, mode: IDBTransactionMode = "readonly") {
    if (!this.db) throw new Error("База данных не открыта");
    if (!this.db.objectStoreNames.contains(nameTable)) {
      throw new Error(`Таблица ${nameTable} не существует`);
    }
    const transaction = this.db.transaction([nameTable], mode);
    return transaction.objectStore(nameTable);
  }

  // ---------------------------------------------------------------------------
  // Публичный API
  // ---------------------------------------------------------------------------

  isSupported: StorageDriverProps["isSupported"] = () => {
    return !!window.indexedDB;
  };

  openDB: StorageDriverProps["openDB"] = async () => {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    // Сбрасываем флаг закрытия — начинаем новую «сессию» работы с БД.
    this.closing = false;

    this.dbPromise = (async () => {
      return new Promise<IDBDatabase>((resolve, reject) => {
        // Открытие без версии никогда не блокируется (версия не поднимается).
        const request = indexedDB.open(this.dbName);

        request.onsuccess = () => {
          const db = request.result;
          if (this.closing) {
            // Драйвер закрыли, пока запрос был в полёте — не регистрируем.
            try {
              db.close();
            } catch {
              /* ignore */
            }
            reject({ status: false, msg: "Драйвер закрыт" });
            return;
          }
          this.db = db;
          this.trackConnection(db);
          resolve(db);
        };

        request.onerror = () => {
          this.dbPromise = null;
          reject({ status: false, msg: "Ошибка открытия IndexedDB" });
        };
      });
    })();

    return this.dbPromise;
  };

  closeDB: StorageDriverProps["closeDB"] = () => {
    this.closeAllConnections();
  };

  deleteDatabase: StorageDriverProps["deleteDatabase"] = async () => {
    const dbName = this.dbName;
    try {
      this.closeAllConnections();

      return await new Promise((resolve) => {
        let settled = false;
        let blockedTimer: ReturnType<typeof setTimeout> | null = null;

        const finish = (result: { status: boolean; msg: string }) => {
          if (settled) return;
          settled = true;
          if (blockedTimer) clearTimeout(blockedTimer);
          resolve(result);
        };

        const request = indexedDB.deleteDatabase(dbName);

        request.onsuccess = () => {
          finish({ status: true, msg: `База данных "${dbName}" удалена` });
        };

        request.onerror = (event) => {
          const error = (event.target as IDBOpenDBRequest).error;
          finish({
            status: false,
            msg: `Ошибка удаления базы данных: ${error?.message || "неизвестная ошибка"}`,
          });
        };

        request.onblocked = () => {
          // Не завершаем сразу — даём другим вкладкам получить versionchange и закрыться.
          console.warn(`⚠️ Удаление базы "${dbName}" заблокировано, ждём...`);
          blockedTimer = setTimeout(() => {
            finish({
              status: false,
              msg: `Удаление заблокировано. Закройте другие вкладки с этим приложением`,
            });
          }, BLOCKED_TIMEOUT_MS);
        };
      });
    } catch (error) {
      return {
        status: false,
        msg: `Ошибка: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  };

  query: StorageDriverProps["query"] = async () => {
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

  // ---------------------------------------------------------------------------
  // Создание store
  // ---------------------------------------------------------------------------

  private async ensureTableExists(nameTable: string): Promise<void> {
    if (this.db && this.db.objectStoreNames.contains(nameTable)) return;

    await this.withSchemaLock(async () => {
      if (this.db && this.db.objectStoreNames.contains(nameTable)) return;

      this.closeAllConnections();
      // closeAllConnections выставил closing = true — сбрасываем,
      // потому что сейчас мы собираемся открыть БД заново.
      this.closing = false;

      const currentVersion = await this.getCurrentDBVersion();
      if (currentVersion === null) {
        throw new Error("Не удалось определить версию базы данных");
      }
      const newVersion = currentVersion + 1;

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        let blockedTimer: ReturnType<typeof setTimeout> | null = null;

        const finish = (err?: Error) => {
          if (settled) return;
          settled = true;
          if (blockedTimer) clearTimeout(blockedTimer);
          if (err) reject(err);
          else resolve();
        };

        const request = indexedDB.open(this.dbName, newVersion);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(nameTable)) {
            const store = db.createObjectStore(nameTable, { autoIncrement: false });
            store.createIndex("_key", "_key", { unique: true });
            store.createIndex("id", "id", { unique: false });
          }
        };

        request.onsuccess = () => {
          const db = request.result;
          if (this.closing) {
            // Драйвер закрыли, пока upgrade был в полёте (pagehide/bfcache).
            // Не регистрируем соединение, чтобы не блокировать чужие upgrade.
            try {
              db.close();
            } catch {
              /* ignore */
            }
            finish();
            return;
          }
          // Соединение регистрируем ВСЕГДА, даже если операция уже "провалена"
          // по таймауту, иначе оно утечёт и будет блокировать будущие upgrade'ы.
          this.db = db;
          this.trackConnection(db);
          finish();
        };

        request.onerror = () => {
          finish(new Error(`Не удалось создать таблицу ${nameTable}`));
        };

        request.onblocked = () => {
          console.warn(`⚠️ Создание таблицы ${nameTable} заблокировано, ждём...`);
          blockedTimer = setTimeout(() => {
            finish(
              new Error(`База заблокирована другим соединением. Закройте другие вкладки приложения`),
            );
          }, BLOCKED_TIMEOUT_MS);
        };
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Удаление store
  // ---------------------------------------------------------------------------

  dropTable: StorageDriverProps["dropTable"] = async (nameTable) => {
    return this.withSchemaLock(async () => {
      try {
        this.closeAllConnections();
        // Сбрасываем closing — сейчас будем открывать БД заново.
        this.closing = false;

        const currentVersion = await this.getCurrentDBVersion();
        if (currentVersion === null) {
          return { status: false, msg: `Не удалось определить версию базы данных` };
        }

        // Проверяем существование store на временном соединении.
        // null — не удалось проверить (гонка/блокировка); в этом случае
        // не врём пользователю «таблицы нет», а идём в upgrade как есть.
        const hasStore = await new Promise<boolean | null>((resolve) => {
          const req = indexedDB.open(this.dbName, currentVersion);
          req.onsuccess = () => {
            const db = req.result;
            const exists = db.objectStoreNames.contains(nameTable);
            db.close();
            resolve(exists);
          };
          req.onerror = () => resolve(null);
          req.onblocked = () => resolve(null);
        });

        if (hasStore === false) {
          return { status: false, msg: `Таблица ${nameTable} не существует` };
        }

        const newVersion = currentVersion + 1;

        return await new Promise<{ status: boolean; msg: string }>((resolve) => {
          let settled = false;
          let blockedTimer: ReturnType<typeof setTimeout> | null = null;

          const finish = (result: { status: boolean; msg: string }) => {
            if (settled) return;
            settled = true;
            if (blockedTimer) clearTimeout(blockedTimer);
            resolve(result);
          };

          const request = indexedDB.open(this.dbName, newVersion);

          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (db.objectStoreNames.contains(nameTable)) {
              db.deleteObjectStore(nameTable);
              console.log(`✅ Таблица ${nameTable} удалена в onupgradeneeded`);
            }
          };

          request.onsuccess = () => {
            const db = request.result;
            if (this.closing) {
              // Драйвер закрыли, пока upgrade был в полёте (pagehide/bfcache).
              try {
                db.close();
              } catch {
                /* ignore */
              }
              finish({ status: false, msg: `Драйвер закрыт` });
              return;
            }
            // Всегда регистрируем соединение, даже если уже истёк таймаут.
            this.db = db;
            this.trackConnection(db);
            console.log(`✅ База открыта с новой версией: ${db.version}`);
            finish({ status: true, msg: `Таблица ${nameTable} удалена` });
          };

          request.onerror = () => {
            finish({ status: false, msg: `Ошибка удаления таблицы ${nameTable}` });
          };

          request.onblocked = () => {
            console.warn(`⚠️ Удаление таблицы ${nameTable} заблокировано, ждём...`);
            blockedTimer = setTimeout(() => {
              finish({
                status: false,
                msg: `База заблокирована, закройте другие соединения`,
              });
            }, BLOCKED_TIMEOUT_MS);
          };
        });
      } catch (error) {
        return { status: false, msg: `Ошибка: ${error}` };
      }
    });
  };

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  setData: StorageDriverProps["setData"] = async (nameTable, key, payload, options) => {
    try {
      await this.ensureTableExists(nameTable);

      const record = {
        _key: key,
        ...payload,
        ...(options?.isCreateDate !== false && {
          createdAt: getLocalDateTime(),
          updateAt: getLocalDateTime(),
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
                ...("createdAt" in record && { updateAt: getLocalDateTime() }),
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
      const infoCheckTable = await this.checkTable(nameTable);
      if (!infoCheckTable.status) {
        return {
          ...infoCheckTable,
          values: [],
        };
      }

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
          const cleanValues = results.map(({ _key, ...cleanData }) => cleanData);

          if (cleanValues.length === 0) {
            resolve({
              status: false,
              values: [],
              msg: "Данных нет в таблице",
            });
          } else {
            resolve({
              status: true,
              values: cleanValues,
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

  // ---------------------------------------------------------------------------
  // Фильтры
  // ---------------------------------------------------------------------------

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

  private applyWhereKeyFilter(
    data: any[],
    whereKey: Record<string, string[]>,
    condition: "AND" | "OR" = "AND",
  ): any[] {
    return data.filter((item) => {
      const conditions = Object.entries(whereKey).map(([key, values]) => values.includes(item[key]));

      if (condition === "AND") {
        return conditions.every(Boolean);
      } else {
        return conditions.some(Boolean);
      }
    });
  }

  private applyIgnoreWhereFilter(
    data: any[],
    ignoreWhere: Record<string, string[]>,
    condition: "AND" | "OR" = "AND",
  ): any[] {
    return data.filter((item) => {
      const conditions = Object.entries(ignoreWhere).map(([key, values]) => !values.includes(item[key]));

      if (condition === "AND") {
        return conditions.every(Boolean);
      } else {
        return conditions.some(Boolean);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Удаление данных
  // ---------------------------------------------------------------------------

  removeData: StorageDriverProps["removeData"] = async (nameTable, params) => {
    try {
      await this.ensureTableExists(nameTable);
      const store = this.getStore(nameTable, "readwrite");

      const applyFilters = (results: any[]) => {
        let filtered = results;

        if (params?.where && Object.keys(params.where).length > 0) {
          filtered = filtered.filter((item) => {
            return Object.entries(params.where!).every(([key, value]) => item[key] === value);
          });
        }

        if (params?.whereKey && Object.keys(params.whereKey).length > 0) {
          filtered = filtered.filter((item) => {
            return Object.entries(params.whereKey!).every(([key, values]) => values.includes(item[key]));
          });
        }

        if (params?.ignoreWhere && Object.keys(params.ignoreWhere).length > 0) {
          filtered = filtered.filter((item) => {
            return Object.entries(params.ignoreWhere!).every(
              ([key, values]) => !values.includes(item[key]),
            );
          });
        }

        return filtered;
      };

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