export const openDbSqlite = (nameDB: string) => {
  //db может быть, но openDBs пуст, а значит соединение закрыто
  // const nameDbSqlite = 'default.db';
  if(!window.db || (nameDB && !window.db.openDBs[nameDB]) ){//!Object.keys(window.db.openDBs).length 
    
    return window.db = window.sqlitePlugin.openDatabase({
      name: nameDB,
      location: 'default',
      androidDatabaseProvider: 'system'
    });
    
  }
  return window.db
}
