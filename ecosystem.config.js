module.exports = {
  apps: [
    {
      name: "almuhtada-api",
      cwd: __dirname,
      script: "./app.js",
      instances: 1,

      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },

      autorestart: true,
      restart_delay: 3000,
      max_memory_restart: "500M",

      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      time: true,
    },
  ],
};