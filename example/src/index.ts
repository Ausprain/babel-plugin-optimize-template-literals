import { CREATE_TABLE_SQL, TableName } from "./config"
import sqlite3 from 'sqlite3'

export class UserModel {
    private constructor(
        public id: number,
        public name: string
    ) { }

    static async create(id: number, name: string) {
        return new Promise((resolve, reject) => {
            db.prepare(`INSERT INTO ${TableName.USER} (id, name) VALUES (?, ?)`).run(id, name, (e: Error) => {
                if (e) reject(e)
                return new UserModel(id, name)
            })
        })
    }
    static async get(id: number) {
        return new Promise((resolve, reject) => {
            db.prepare(`SELECT * FROM ${TableName.USER} WHERE id = ?`).get(id, (e: Error, r: any) => {
                if (e) {
                    reject(e)
                } else {
                    resolve(new UserModel(r.id, r.name))
                }
            })
        })
    }
    async delete(): Promise<void> {
        return new Promise((resolve, reject) => {
            db.prepare(`DELETE FROM ${TableName.USER} WHERE id = ?`).run(this.id, (e: Error) => {
                if (e) reject(e)
                else resolve()
            })
        })
    }
}

const db = new sqlite3.Database(':memory:')

Promise.resolve(new Promise<void>((resolve, reject) => {
    db.serialize(() => {
        db.exec(CREATE_TABLE_SQL)
        const stmt = db.prepare(`INSERT INTO ${TableName.USER} (name) VALUES (?)`);
        for (let i = 0; i < 10; i++) {
            stmt.run("user " + i);
        }
        stmt.finalize();

        db.each(`SELECT id, name FROM ${TableName.USER}`, (e: Error, row: any) => {
            console.log(row.id + ": " + row.name);
        }, (e: Error) => {
            if (e) reject(e)
            else resolve()
        });
    })
})).then(() => {
    console.log('\x1b[48;5;10m%s\x1b[0m:\n%s\n', 'success', 'example pass')
}).catch(e => {
    console.log('\x1b[48;5;9m%s\x1b[0m:\n%s\n', 'fail', 'example failed')
})