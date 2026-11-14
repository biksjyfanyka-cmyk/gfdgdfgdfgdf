"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function randomCode() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => abc[Math.floor(Math.random() * abc.length)]).join("");
}

export default function Lobby() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("baldicraft-name");
    if (saved) setName(saved);
  }, []);

  const go = (c: string) => {
    const n = name.trim() || "Ученик" + Math.floor(Math.random() * 99);
    localStorage.setItem("baldicraft-name", n);
    router.push(`/room/${c.toUpperCase()}?name=${encodeURIComponent(n)}`);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-b from-sky-300 via-sky-200 to-lime-200 px-4 py-10">
      <section className="w-full max-w-lg rounded-3xl bg-white/95 p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="text-5xl">📐</span>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-green-700">BaldiCraft</h1>
            <p className="text-sm text-slate-600">Кооперативный воксельный хоррор в браузере</p>
          </div>
        </div>

        <p className="mt-5 text-slate-700">
          Строй и ломай блоки, собирайте вместе <b>7 тетрадей по математике</b> и не дайте Балди себя поймать.
          Чем больше тетрадей — тем быстрее Балди. До 8 игроков в одной комнате.
        </p>

        <label className="mt-6 block text-sm font-semibold text-slate-700">Твоё имя</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={14}
          placeholder="Ученик"
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-lg outline-none focus:border-green-600"
        />

        <button
          onClick={() => go(randomCode())}
          className="mt-4 w-full rounded-xl bg-green-600 py-3 text-lg font-bold text-white transition hover:bg-green-700"
        >
          🏫 Создать комнату (кооп)
        </button>

        <div className="mt-4 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            maxLength={8}
            placeholder="КОД КОМНАТЫ"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-lg uppercase tracking-widest outline-none focus:border-blue-600"
          />
          <button
            disabled={code.length < 3}
            onClick={() => go(code)}
            className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-40"
          >
            Войти
          </button>
        </div>

        <div className="mt-6 flex items-center justify-between border-t pt-4 text-sm text-slate-500">
          <span>Управление: WASD · Shift · Пробел · мышь</span>
          <a href="/exe" className="font-semibold text-green-700 underline">Как сделать .exe</a>
        </div>
      </section>
    </main>
  );
}
