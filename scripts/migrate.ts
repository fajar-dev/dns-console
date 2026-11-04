import { readdir } from 'node:fs/promises'
import { createLogPool } from '../server/infrastructure/mysql-pool'

const url = process.env.NUXT_MYSQL_URL
if (!url) throw new Error('Set NUXT_MYSQL_URL before running database migrations.')
const pool = createLogPool(url)
const connection = await pool.getConnection()
let locked = false
try {
  const [lock] = await connection.query('SELECT GET_LOCK(SHA2(CONCAT(DATABASE(), \':dns_console_migrations\'), 256), 30) AS acquired')
  locked = Number((lock as { acquired: string | number }[])[0]?.acquired) === 1
  if (!locked) throw new Error('Could not acquire database migration lock.')
  await connection.query('CREATE TABLE IF NOT EXISTS console_migrations (name VARCHAR(255) PRIMARY KEY, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB')
  const directory = new URL('../database/migrations/', import.meta.url)
  for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
    const [existing] = await connection.execute('SELECT name FROM console_migrations WHERE name = ?', [name])
    if ((existing as unknown[]).length) continue
    await connection.query(await Bun.file(new URL(name, directory)).text())
    await connection.execute('INSERT INTO console_migrations (name) VALUES (?)', [name])
    console.log(`Applied ${name}`)
  }
  console.log('Database is up to date.')
} finally {
  if (locked) await connection.query('SELECT RELEASE_LOCK(SHA2(CONCAT(DATABASE(), \':dns_console_migrations\'), 256))')
  connection.release()
  await pool.end()
}
