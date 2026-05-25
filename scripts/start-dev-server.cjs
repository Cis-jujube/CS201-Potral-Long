/* eslint-disable @typescript-eslint/no-require-imports */
const http = require("http");
const next = require("next");

const port = Number(process.env.PORT || "3300");
const host = process.env.HOST || "127.0.0.1";

const app = next({
  dev: true,
  dir: process.cwd(),
});

const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    http.createServer((req, res) => handle(req, res)).listen(port, host, () => {
      console.log(`ready on http://${host}:${port}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
