/**
 * /login 頁面：只有一顆「使用 Google 登入」
 * ------------------------------------------------------------
 * 按鈕是一般連結（不是 fetch），因為要整頁導到 Google 同意畫面。
 * 第一次用 Google 登入就會自動建立帳號，所以不需要另外的註冊頁。
 * Google 登入失敗時，callback 會導回 /login?error=...，這裡顯示對應訊息。
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "登入 — OfferMate",
};

const ERRORS: Record<string, string> = {
  cancelled: "你取消了 Google 登入。",
  state: "登入逾時或連結無效，請再試一次。",
  google: "Google 登入失敗，請稍後再試。",
  config: "伺服器尚未設定 Google 登入，請聯絡網站管理員。",
  suspended: "這個帳號已被停權，如有疑問請透過「聯絡我們」與我們聯繫。",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? (ERRORS[error] ?? ERRORS.google) : "";

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-md place-items-center px-4 py-12">
      <div className="glass-strong animate-rise w-full rounded-3xl p-6 text-center sm:p-8">
        <p className="font-mono text-[11px] tracking-widest text-accent">WELCOME</p>
        <h1 className="mt-1 text-2xl font-semibold">登入 OfferMate</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">使用 Google 帳號登入，第一次登入會自動建立帳號。</p>

        {message && <p className="mt-5 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{message}</p>}

        <a
          href="/api/auth/google"
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-white py-3 text-sm font-medium transition hover:border-accent hover:shadow-md"
        >
          <GoogleIcon />
          使用 Google 登入
        </a>
      </div>
    </div>
  );
}

/** Google 官方「G」標誌（品牌規範要求使用原色） */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
