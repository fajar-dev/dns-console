module.exports = {
  apps: [
    {
      name: 'dns-console',
      cwd: __dirname,
      script: '.output/server/index.mjs',
      interpreter: process.env.BUN_BIN || 'bun',
      interpreter_args: '--no-install',
      exec_mode: 'fork',
      instances: 1,
      watch: false,
      autorestart: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 3000,
      kill_timeout: 45000,
      time: true,
      merge_logs: true,
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      env: {
        NODE_ENV: 'production',
        HOST: process.env.HOST || '127.0.0.1',
        PORT: process.env.PORT || '3000'
      }
    }
  ]
}
