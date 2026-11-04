import { createPool } from 'mysql2/promise'

export function createLogPool(url: string) {
  return createPool({
    uri: url,
    connectionLimit: 5,
    maxIdle: 5,
    idleTimeout: 60000,
    waitForConnections: true,
    queueLimit: 50,
    connectTimeout: 5000,
    timezone: 'Z',
    supportBigNumbers: true,
    bigNumberStrings: true,
    enableKeepAlive: true,
    multipleStatements: false
  })
}
