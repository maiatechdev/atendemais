module.exports = {
  apps: [
    {
      name: 'atendemais',
      script: 'server.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
