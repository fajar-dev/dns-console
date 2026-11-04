import { openLogDatabase } from '../server/infrastructure/sqlite/database'

const database = openLogDatabase(process.env.NUXT_SQLITE_PATH)
try {
  console.log('SQLite database is up to date.')
} finally {
  database.close()
}
