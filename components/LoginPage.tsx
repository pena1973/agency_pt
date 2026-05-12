"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { siteTranslations } from "@/lib/i18n/site";
import { useSiteLocale } from "@/lib/i18n/use-site-locale";
import { AgencyLogo } from "./AgencyLogo";
import { LanguageSwitcher } from "./LanguageSwitcher";

type AuthMode = "login" | "register";
type SubmitState = "idle" | "submitting" | "success" | "error";
type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: "admin" | "realtor" | "client";
};

type LoginFormState = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type RegisterFormState = {
  email: string;
  password: string;
};

const passwordPattern =
  /^(?=.*[A-Za-zА-Яа-я])(?=.*\d)(?=.*[^A-Za-zА-Яа-я\d]).{1,8}$/;

const initialLoginFormState: LoginFormState = {
  email: "",
  password: "",
  rememberMe: true,
};

const initialRegisterFormState: RegisterFormState = {
  email: "",
  password: "",
};

export function LoginPage() {
  const router = useRouter();
  const [language, setSiteLanguage] = useSiteLocale();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginFormState, setLoginFormState] =
    useState<LoginFormState>(initialLoginFormState);
  const [registerFormState, setRegisterFormState] =
    useState<RegisterFormState>(initialRegisterFormState);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const t = siteTranslations[language];
  const l = {
    pt: {
      intro: "O registo ajuda a guardar filtros de pesquisa, favoritos e lista de comparacao para nao recomecar a selecao em cada visita.",
      register: "Registar",
      checking: "A verificar a sessao atual...",
      loggedIn: "Ja iniciou sessao como",
      role: "Nivel de acesso",
      goAdmin: "Ir para admin",
      goCatalog: "Ir para catalogo",
      refresh: "Atualizar",
      password: "Palavra-passe",
      remember: "Lembrar-me neste dispositivo",
      signingIn: "A entrar...",
      signIn: "Entrar",
      recover: "Recuperar por email",
      passwordHint: "Ate 8 caracteres: letra, numero e simbolo",
      registering: "A registar...",
      loginFailed: "Nao foi possivel iniciar sessao.",
      registerFailed: "Nao foi possivel concluir o registo.",
      loginSuccess: "Sessao iniciada com sucesso.",
      registerSuccess: "Registo concluido com sucesso.",
      logoutFailed: "Nao foi possivel terminar a sessao.",
    },
    en: {
      intro: "Registration helps save search filters, favorite listings, and the compare list so you do not start over each visit.",
      register: "Register",
      checking: "Checking current session...",
      loggedIn: "You are already signed in as",
      role: "Access role",
      goAdmin: "Go to admin",
      goCatalog: "Go to catalog",
      refresh: "Refresh",
      password: "Password",
      remember: "Remember me on this device",
      signingIn: "Signing in...",
      signIn: "Sign in",
      recover: "Recover by email",
      passwordHint: "Up to 8 characters: letter, number, and symbol",
      registering: "Registering...",
      loginFailed: "Could not sign in.",
      registerFailed: "Could not complete registration.",
      loginSuccess: "Signed in successfully.",
      registerSuccess: "Registration completed successfully.",
      logoutFailed: "Could not end the session.",
    },
    ru: {
      intro: "Регистрация поможет сохранить параметры поиска, избранные объекты и список сравнения, чтобы не начинать подбор заново при каждом визите.",
      register: "Регистрация",
      checking: "Проверяем текущую сессию...",
      loggedIn: "Вы уже вошли как",
      role: "Роль доступа",
      goAdmin: "Перейти в админку",
      goCatalog: "Перейти в каталог",
      refresh: "Обновить",
      password: "Пароль",
      remember: "Запомнить меня на этом устройстве",
      signingIn: "Входим...",
      signIn: "Войти",
      recover: "Восстановить через email",
      passwordHint: "До 8 символов: буква, цифра и знак",
      registering: "Регистрируем...",
      loginFailed: "Не удалось выполнить вход.",
      registerFailed: "Не удалось завершить регистрацию.",
      loginSuccess: "Вход выполнен успешно.",
      registerSuccess: "Регистрация выполнена успешно.",
      logoutFailed: "Не удалось завершить сеанс.",
    },
    uk: {
      intro: "Реєстрація допоможе зберегти параметри пошуку, обрані об'єкти й список порівняння, щоб не починати підбір заново під час кожного візиту.",
      register: "Реєстрація",
      checking: "Перевіряємо поточну сесію...",
      loggedIn: "Ви вже увійшли як",
      role: "Роль доступу",
      goAdmin: "Перейти в адмінку",
      goCatalog: "Перейти в каталог",
      refresh: "Оновити",
      password: "Пароль",
      remember: "Запам'ятати мене на цьому пристрої",
      signingIn: "Входимо...",
      signIn: "Увійти",
      recover: "Відновити через email",
      passwordHint: "До 8 символів: літера, цифра і знак",
      registering: "Реєструємо...",
      loginFailed: "Не вдалося виконати вхід.",
      registerFailed: "Не вдалося завершити реєстрацію.",
      loginSuccess: "Вхід виконано успішно.",
      registerSuccess: "Реєстрацію виконано успішно.",
      logoutFailed: "Не вдалося завершити сеанс.",
    },
  }[language];

  const isLoginValid = useMemo(() => {
    return (
      loginFormState.email.trim().length > 0 &&
      passwordPattern.test(loginFormState.password.trim())
    );
  }, [loginFormState.email, loginFormState.password]);

  const isRegisterValid = useMemo(() => {
    return (
      registerFormState.email.trim().length > 0 &&
      passwordPattern.test(registerFormState.password.trim())
    );
  }, [registerFormState.email, registerFormState.password]);

  useEffect(() => {
    let isCancelled = false;

    async function loadCurrentUser() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("session");
        }

        const payload = (await response.json()) as {
          user?: AuthenticatedUser | null;
        };

        if (!isCancelled) {
          setCurrentUser(payload.user ?? null);
        }
      } catch {
        if (!isCancelled) {
          setCurrentUser(null);
        }
      } finally {
        if (!isCancelled) {
          setIsCheckingSession(false);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isLoginValid) {
      return;
    }

    setSubmitState("submitting");
    setStatusMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginFormState),
      });

      const payload = (await response.json()) as {
        error?: string;
        redirectTo?: string;
        user?: AuthenticatedUser;
      };

      if (!response.ok || !payload.user || !payload.redirectTo) {
        setSubmitState("error");
        setStatusMessage(payload.error ?? l.loginFailed);
        return;
      }

      setCurrentUser(payload.user);
      setSubmitState("success");
      setStatusMessage(l.loginSuccess);
      router.push(payload.redirectTo);
      router.refresh();
    } catch {
      setSubmitState("error");
      setStatusMessage(l.loginFailed);
    }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isRegisterValid) {
      return;
    }

    setSubmitState("submitting");
    setStatusMessage("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerFormState),
      });

      const payload = (await response.json()) as {
        error?: string;
        redirectTo?: string;
        user?: AuthenticatedUser;
      };

      if (!response.ok || !payload.user || !payload.redirectTo) {
        setSubmitState("error");
        setStatusMessage(payload.error ?? l.registerFailed);
        return;
      }

      setCurrentUser(payload.user);
      setSubmitState("success");
      setStatusMessage(l.registerSuccess);
      router.push(payload.redirectTo);
      router.refresh();
    } catch {
      setSubmitState("error");
      setStatusMessage(l.registerFailed);
    }
  }

  async function handleLogout() {
    setSubmitState("submitting");
    setStatusMessage("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("logout");
      }

      setCurrentUser(null);
      setSubmitState("idle");
      setLoginFormState(initialLoginFormState);
      setRegisterFormState(initialRegisterFormState);
      router.refresh();
    } catch {
      setSubmitState("error");
      setStatusMessage(l.logoutFailed);
    }
  }

  return (
    <main className="site-page-background min-h-screen text-slate-950">
      <section className="mx-auto flex min-h-screen max-w-[1380px] items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="-my-6 flex items-center sm:-my-8 lg:-my-10">
                <AgencyLogo priority className="h-[52px] w-auto sm:h-[62px]" />
              </Link>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <LanguageSwitcher language={language} onChange={setSiteLanguage} />
                <Link
                  href="/"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                >
                  {t.backToCatalog}
                </Link>
              </div>
            </div>

            <div className="mt-10 max-w-2xl">
              <p className="mt-5 text-base leading-8 text-slate-600">
                {l.intro}
              </p>
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <div className="inline-flex rounded-[20px] border border-slate-200 bg-white p-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setSubmitState("idle");
                  setStatusMessage("");
                }}
                className={`rounded-2xl px-6 py-3 text-sm font-semibold transition ${
                  mode === "login"
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                {t.login}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setSubmitState("idle");
                  setStatusMessage("");
                }}
                className={`rounded-2xl px-6 py-3 text-sm font-semibold transition ${
                  mode === "register"
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                {l.register}
              </button>
            </div>

            {isCheckingSession ? (
              <div className="mt-8 rounded-[24px] border border-slate-200 bg-[#fbfdff] px-5 py-4 text-sm text-slate-600">
                {l.checking}
              </div>
            ) : currentUser ? (
              <div className="mt-8 grid gap-5">
                <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-7 text-emerald-900">
                  <p>
                    {l.loggedIn} <strong>{currentUser.email}</strong>.
                  </p>
                  <p>
                    {l.role}:{" "}
                    <strong>
                      {currentUser.role === "admin"
                        ? "admin"
                        : currentUser.role === "realtor"
                        ? "realtor"
                        : "client"}
                    </strong>
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                  <Link
                    href={currentUser.role === "admin" ? "/admin" : "/"}
                    className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    {currentUser.role === "admin"
                      ? l.goAdmin
                      : l.goCatalog}
                  </Link>
                  <button
                    type="button"
                    onClick={() => router.refresh()}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                  >
                    {l.refresh}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-700"
                  >
                    {t.logout}
                  </button>
                </div>
              </div>
            ) : mode === "login" ? (
              <form className="mt-8 grid gap-5" onSubmit={handleLoginSubmit}>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Email
                  </span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={loginFormState.email}
                    onChange={(event) => {
                      setLoginFormState((currentState) => ({
                        ...currentState,
                        email: event.target.value,
                      }));
                      setSubmitState("idle");
                      setStatusMessage("");
                    }}
                    placeholder="you@example.com"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {l.password}
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
                      setSubmitState("idle");
                      setStatusMessage("");
                    }}
                    placeholder={l.password}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

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
                  {l.remember}
                </label>

                <div className="grid gap-3 pt-2 sm:grid-cols-[1fr_auto]">
                  <button
                    type="submit"
                    disabled={!isLoginValid || submitState === "submitting"}
                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {submitState === "submitting" ? l.signingIn : l.signIn}
                  </button>

                  <button
                    type="button"
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                  >
                    {l.recover}
                  </button>
                </div>
              </form>
            ) : (
              <form className="mt-8 grid gap-5" onSubmit={handleRegisterSubmit}>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Email
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
                      setSubmitState("idle");
                      setStatusMessage("");
                    }}
                    placeholder="you@example.com"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {l.password}
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
                      setSubmitState("idle");
                      setStatusMessage("");
                    }}
                    placeholder={l.passwordHint}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <div className="grid gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={!isRegisterValid || submitState === "submitting"}
                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {submitState === "submitting"
                      ? l.registering
                      : l.register}
                  </button>
                </div>
              </form>
            )}

            {statusMessage ? (
              <div
                className={`mt-5 rounded-[24px] px-5 py-4 text-sm leading-7 ${
                  submitState === "error"
                    ? "border border-rose-200 bg-rose-50 text-rose-800"
                    : "border border-slate-200 bg-[#fbfdff] text-slate-600"
                }`}
              >
                <p>{statusMessage}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
