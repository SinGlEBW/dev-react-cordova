import { IndexedDBDriver } from './drivers/IndexedDBDriver/IndexedDBDriver';
import { SqliteDriver } from './drivers/SqliteDriver/SqliteDriver';
import { BaseReturnProps, BaseSqliteOptions, DriverType, Params, ResultGetDataSqlite, StorageDriverProps, StorageOptions, UpdateWhere } from './drivers/types';


export interface StorageProps extends StorageDriverProps{
  switchDriver(driverName: DriverType): boolean;
  getCurrentDriver(): DriverType;
}
export class Storage<T extends string> {
  private drivers: Map<DriverType, StorageDriverProps> = new Map();
  private currentDriver: StorageDriverProps;
  private options: StorageOptions;

  constructor(options: StorageOptions) {
    this.options = options;
    const payloadDb = {
      dbName:options.dbName || 'app-database',
    }
    // Инициализируем драйверы
    this.drivers.set('sqlite', new SqliteDriver(payloadDb));
    this.drivers.set('indexedDB', new IndexedDBDriver(payloadDb));

    // Выбираем доступный драйвер
    this.currentDriver = this.selectDriver();
  }

  private selectDriver(): StorageDriverProps {
    // Если указан defaultDriver и он доступен - используем его
    if (this.options.defaultDriver) {
      const driver = this.drivers.get(this.options.defaultDriver);
      if (driver?.isSupported()) return driver;
    }

    // Ищем первый доступный драйвер из списка
    for (const driverName of this.options.driver) {
      const driver = this.drivers.get(driverName);
      if (driver?.isSupported()) {
        console.log(`✅ Выбран драйвер: ${driverName}`);
        return driver;
      }
    }

    throw new Error('Нет доступных драйверов базы данных');
  }

  // Методы для управления драйверами
  getCurrentDriver(): DriverType {
    for (const [name, driver] of this.drivers) {
      if (driver === this.currentDriver) return name;
    }
    return 'indexedDB';
  }

  switchDriver(driverName: DriverType): boolean {
    const driver = this.drivers.get(driverName);
    if (driver && driver.isSupported()) {
      this.currentDriver = driver;
      return true;
    }
    return false;
  }

  // Основные методы (делегируются текущему драйверу)
  async getData(nameTable: T, params?: Params, isParse?: boolean): Promise<ResultGetDataSqlite> {
    return this.currentDriver.getData(nameTable, params, isParse);
  }

  async setData(nameTable: T, key: number | string, payload: object, options?: BaseSqliteOptions): Promise<BaseReturnProps> {
    return this.currentDriver.setData(nameTable, key, payload, options);
  }

  async updateData(nameTable: T, payload: object, where: UpdateWhere): Promise<BaseReturnProps> {
    return this.currentDriver.updateData(nameTable, payload, where);
  }

  async removeData(nameTable: T, params?: Params): Promise<BaseReturnProps> {
    return this.currentDriver.removeData(nameTable, params);
  }

  async checkTable(nameTable: T): Promise<BaseReturnProps> {
    return this.currentDriver.checkTable(nameTable);
  }

  async dropTable(nameTable: T): Promise<BaseReturnProps> {
    return this.currentDriver.dropTable(nameTable);
  }

  async query(sql: string): Promise<BaseReturnProps> {
    return this.currentDriver.query(sql);
  }

  // Управление соединением
  openDB(): any {
    return this.currentDriver.openDB();
  }

  closeDB(): void {
    this.currentDriver.closeDB();
  }
}