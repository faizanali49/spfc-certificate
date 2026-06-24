// photo-server/ecosystem.config.cjs
//
// PM2 process manager config — keeps the photo server running in the
// background on your VPS, automatically restarts it if it crashes, and
// makes sure it starts again after a server reboot.
//
// Usage (after npm install -g pm2):
//   pm2 start ecosystem.config.cjs
//   pm2 save
//   pm2 startup        (follow the printed instructions, run once)

module.exports = {
  apps: [
    {
      name: "cert-photo-server",
      script: "./src/server.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      watch: false,
      max_memory_restart: "200M",
    },
  ],
};
