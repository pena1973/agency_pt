"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type AuthMode = "login" | "register";
type SubmitStatus = "idle" | "success";

type LoginFormState = {
  login: string;
  password: string;
  rememberMe: boolean;
};

type RegisterFormState = {
  email: string;
  password: string;
};

const passwordPattern = /^(?=.*[A-Za-zА-Яа-я])(?=.*\d)(?=.*[^A-Za-zА-Яа-я\d]).{1,8}$/;

const initialLoginFormState: LoginFormState = {
  login: "",
  password: "",
  rememberMe: true,
};

const initialRegisterFormState: RegisterFormState = {
  email: "",
  password: "",
};

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginFormState, setLoginFormState] =
    useState<LoginFormState>(initialLoginFormState);
  const [registerFormState, setRegisterFormState] = useState<RegisterFormState>(
    initialRegisterFormState
  );
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");

  const isLoginValid = useMemo(() => {
    return (
      loginFormState.login.trim().length > 0 &&
      passwordPattern.test(loginFormState.password.trim())
    );
  }, [loginFormState.login, loginFormState.password]);

  const isRegisterValid = useMemo(() => {
    return (
      registerFormState.email.trim().length > 0 &&
      passwordPattern.test(registerFormState.password.trim())
    );
  }, [
    registerFormState.email,
    registerFormState.password,
  ]);

  function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isLoginValid) {
      return;
    }

    setSubmitStatus("success");
  }

  function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isRegisterValid) {
      return;
    }

    setSubmitStatus("success");
  }

  return (
    <main className="min-h-screen bg-[#f8fbff] text-slate-950">
      <section className="mx-auto flex min-h-screen max-w-[1380px] items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-emerald-900 text-sm font-semibold text-white shadow-sm">
                  И
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
                    Агентство недвижимости
                  </div>
                  <div className="text-[2rem] font-semibold leading-none tracking-tight text-slate-950">
                    ИРИНА
                  </div>
                </div>
              </Link>

              <Link
                href="/"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
              >
                В каталог
              </Link>
            </div>

            <div className="mt-10 max-w-2xl">
              <p className="mt-5 text-base leading-8 text-slate-600">
                Регистрация поможет сохранить параметры поиска, избранные объекты
                и список сравнения, чтобы не начинать подбор заново при каждом
                визите.
              </p>
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <div className="inline-flex rounded-[20px] border border-slate-200 bg-white p-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setSubmitStatus("idle");
                }}
                className={`rounded-2xl px-6 py-3 text-sm font-semibold transition ${
                  mode === "login"
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Вход
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setSubmitStatus("idle");
                }}
                className={`rounded-2xl px-6 py-3 text-sm font-semibold transition ${
                  mode === "register"
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Регистрация
              </button>
            </div>

            {mode === "login" ? (
              <form className="mt-8 grid gap-5" onSubmit={handleLoginSubmit}>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Email
                  </span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={loginFormState.login}
                    onChange={(event) => {
                      setLoginFormState((currentState) => ({
                        ...currentState,
                        login: event.target.value,
                      }));
                      setSubmitStatus("idle");
                    }}
                    placeholder="you@example.com"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Пароль
                  </span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={loginFormState.password}
                    onChange={(event) => {
                      setLoginFormState((currentState) => ({
                        ...currentState,
                        password: event.target.value.slice(0, 8),
                      }));
                      setSubmitStatus("idle");
                    }}
                    placeholder="До 8 символов"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <div className="text-sm leading-7 text-slate-500">
                  Пароль: максимум 8 символов, минимум 1 буква, 1 цифра и 1 знак.
                </div>

                <label className="inline-flex items-center gap-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={loginFormState.rememberMe}
                    onChange={(event) =>
                      setLoginFormState((currentState) => ({
                        ...currentState,
                        rememberMe: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                  />
                  Запомнить меня на этом устройстве
                </label>

                <div className="grid gap-3 pt-2 sm:grid-cols-[1fr_auto]">
                  <button
                    type="submit"
                    disabled={!isLoginValid}
                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Войти
                  </button>

                  <button
                    type="button"
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                  >
                    Восстановить через email
                  </button>
                </div>
              </form>
            ) : (
              <form className="mt-8 grid gap-5" onSubmit={handleRegisterSubmit}>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Email для восстановления доступа
                  </span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={registerFormState.email}
                    onChange={(event) => {
                      setRegisterFormState((currentState) => ({
                        ...currentState,
                        email: event.target.value,
                      }));
                      setSubmitStatus("idle");
                    }}
                    placeholder="you@example.com"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Пароль
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={registerFormState.password}
                    onChange={(event) => {
                      setRegisterFormState((currentState) => ({
                        ...currentState,
                        password: event.target.value.slice(0, 8),
                      }));
                      setSubmitStatus("idle");
                    }}
                    placeholder="До 8 символов"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <div className="text-sm leading-7 text-slate-500">
                  Пароль: максимум 8 символов, минимум 1 буква, 1 цифра и 1 знак.
                </div>

                <div className="grid gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={!isRegisterValid}
                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Зарегистрироваться
                  </button>
                </div>
              </form>
            )}

            {submitStatus === "success" ? (
              <div className="mt-5 rounded-[24px] border border-slate-200 bg-[#fbfdff] px-5 py-4 text-sm leading-7 text-slate-600">
                {mode === "login" ? (
                  <p>Данные приняты. Следующим шагом я могу подключить настоящий вход.</p>
                ) : (
                  <p>
                    Данные регистрации приняты. Следующим шагом я могу подключить
                    сохранение пользователя в SQLite.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
