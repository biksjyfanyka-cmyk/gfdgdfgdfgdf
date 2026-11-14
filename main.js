const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

let nextServer;

function waitForServer(url, callback) {
  const interval = setInterval(() => {
    http.get(url, (res) => {
      if (res.statusCode === 200 || res.statusCode === 404) {
        clearInterval(interval);
        callback();
      }
    }).on("error", () => {});
  }, 500);
}

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

  const nextBin = path.join(__dirname, "node_modules", "next", "dist", "bin", "next");
  nextServer = spawn(process.execPath, [nextBin, "start", "-p", "3456"], {
    cwd: __dirname,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", NODE_ENV: "production" },
  });

  waitForServer("http://localhost:3456", () => {
    win.loadURL("http://localhost:3456");
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (nextServer) nextServer.kill();
  if (process.platform !== "darwin") app.quit();
});
