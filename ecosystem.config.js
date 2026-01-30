module.exports = {
  apps: [
    {
      name: 'news-backend',
      script: './app.js',
      instances: 1,
      exec_mode: 'fork',

      // Auto restart
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',

      // Restart delay
      restart_delay: 4000,
      min_uptime: '10s',
      max_restarts: 10,

      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },

      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Cron untuk restart otomatis setiap hari jam 3 pagi
      cron_restart: '0 3 * * *',

      // Exponential backoff restart delay
      exp_backoff_restart_delay: 100
    }
  ],

  // Deploy configuration untuk VPS
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-vps-ip',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/backend-news-express.git',
      path: '/var/www/news-backend',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /var/www/news-backend'
    }
  }
};
