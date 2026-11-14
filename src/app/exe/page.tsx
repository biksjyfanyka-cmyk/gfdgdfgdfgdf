const mainJs = `// desktop/main.js
const { app, BrowserWindow } = require("electron");

// Адрес твоего сервера BaldiCraft (там же живёт мультиплеер и база данных)
const GAME_URL = process.env.GAME_URL || "https://ВАШ-САЙТ.example.com";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    title: "BaldiCraft",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true },
  });
  win.loadURL(GAME_URL);
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());`;

const pkgJson = `{
  "name": "baldicraft-desktop",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "dist": "electron-builder --win portable"
  },
  "build": {
    "appId": "com.example.baldicraft",
    "productName": "BaldiCraft",
    "win": { "target": "portable" }
  },
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0"
  }
}`;

function Code({ children }: { children: string }) {
  return <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm text-green-200">{children}</pre>;
}

export default function ExePage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <a href="/" className="text-sm font-semibold text-green-700 underline">← В лобби</a>
      <h1 className="mt-3 text-3xl font-black text-slate-900">Как получить BaldiCraft в виде .exe</h1>

      <div className="mt-4 rounded-xl border-l-4 border-yellow-500 bg-yellow-50 p-4 text-slate-800">
        <b>Важно про «декомпилировать»:</b> декомпиляция — это разбор чужой готовой программы, и для этой игры она не нужна.
        BaldiCraft здесь написан с нуля, исходники у тебя уже есть. Чтобы получить <code>.exe</code>, игру не декомпилируют,
        а <b>упаковывают</b> (компилируют в установщик). Самый простой путь — Electron.
      </div>

      <h2 className="mt-8 text-xl font-bold">Шаг 1. Выложи сервер</h2>
      <p className="mt-1 text-slate-700">
        Мультиплеер работает через сервер Next.js + PostgreSQL. Задеплой проект (или оставь его запущенным на своём ПК/VPS).
        Для игры по интернету всем нужен один и тот же адрес. Для LAN: <code>npm run build && npm start</code> и открой
        <code> http://IP-ТВОЕГО-ПК:3000</code>.
      </p>

      <h2 className="mt-6 text-xl font-bold">Шаг 2. Создай папку desktop/</h2>
      <p className="mt-1 text-slate-700">Файл <code>desktop/package.json</code>:</p>
      <Code>{pkgJson}</Code>
      <p className="mt-3 text-slate-700">Файл <code>desktop/main.js</code>:</p>
      <Code>{mainJs}</Code>

      <h2 className="mt-6 text-xl font-bold">Шаг 3. Собери exe</h2>
      <Code>{`cd desktop
npm install
npm run dist     # → desktop/dist/BaldiCraft 1.0.0.exe (portable)`}</Code>
      <p className="mt-2 text-slate-700">
        Получится один файл <code>.exe</code>, который открывает игру в отдельном окне. Друзья запускают его и вводят
        тот же код комнаты.
      </p>

      <h2 className="mt-6 text-xl font-bold">Альтернативы</h2>
      <ul className="mt-1 list-disc pl-6 text-slate-700">
        <li><b>Tauri</b> — exe в ~5 МБ вместо ~100 МБ у Electron (нужен Rust).</li>
        <li><b>PWA</b> — в Chrome/Edge: меню → «Установить приложение», без exe вообще.</li>
        <li>Если захочешь декомпилировать <i>чужую</i> Unity-игру — это нарушает лицензию автора, я с этим не помогаю.</li>
      </ul>
    </main>
  );
}
