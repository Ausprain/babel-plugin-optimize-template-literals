
export const enum TableName {
    USER = 'users',
    ORDER = 'orders'
}

export const enum SQL {
    CREATE_USER_TABLE = `
CREATE TABLE IF NOT EXISTS ${TableName.USER} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS user_name ON ${TableName.USER} (name);
`,
    CREATE_ORDER_TABLE = `
CREATE TABLE IF NOT EXISTS ${TableName.ORDER} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL
);
`
}

export const CREATE_TABLE_SQL = SQL.CREATE_USER_TABLE + SQL.CREATE_ORDER_TABLE