const { app, BrowserWindow } = require("electron");
const http = require("http");
const next = require("next");

process.env.NODE_ENV = "production";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/mydb";

let server;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.setMenuBarVisibility(false);

  const nextApp = next({ dev: false, dir: __dirname });
  const handle = nextApp.getRequestHandler();

  nextApp.prepare().then(() => {
    server = http.createServer((req, res) => {
      handle(req, res);
    });

    server.listen(3456, "127.0.0.1", () => {
      win.loadURL("http://127.0.0.1:3456");
    });
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (server) server.close();
  if (process.platform !== "darwin") app.quit();
});
