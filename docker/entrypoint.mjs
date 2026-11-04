const command = process.argv[2] || 'start'
if (!['start', 'migrate'].includes(command)) throw new Error('Container command must be start or migrate.')

if (command === 'migrate') await import('../scripts/migrate.mjs')
else await import('../.output/server/index.mjs')
