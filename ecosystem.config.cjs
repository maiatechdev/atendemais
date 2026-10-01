module.exports = {
  apps: [
    {
      name: 'atendemais',
      script: 'server.js',
      cwd: __dirname,
      // O server.js não usa dotenv: sem esta flag, só o DATABASE_URL (lido pelo Prisma)
      // chegaria ao processo, e PORT, FRONTEND_URL e EXTERNAL_API_KEY seriam ignorados.
      // Requer Node 20.6+ e um arquivo .env na pasta do projeto.
      node_args: '--env-file=.env',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
