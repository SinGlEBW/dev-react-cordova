export const openDbSqlite = () => {
  //db может быть, но openDBs пуст, а значит соединение закрыто
  const nameDbSqlite = 'default.db';
  if(!window.db || (nameDbSqlite && !window.db.openDBs[nameDbSqlite]) ){//!Object.keys(window.db.openDBs).length 
    
    return window.db = window.sqlitePlugin.openDatabase({
      name: nameDbSqlite,
      location: 'default',
      androidDatabaseProvider: 'system'
    });
    
  }
  return window.db
}
