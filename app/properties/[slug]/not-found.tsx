import Link from "next/link";

export default function PropertyNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-5 py-10 text-slate-950">
      <div className="max-w-xl rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
          404
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Объект не найден
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Возможно, ссылка устарела или объект уже снят с публикации.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Вернуться в каталог
        </Link>
      </div>
    </main>
  );
}
