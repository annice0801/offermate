/**
 * 後台共用的小元件（Server Component 也能用）
 * 卡片統一用白底 + 細邊框 + 淡陰影，和前台的毛玻璃區隔，資料比較好讀。
 */
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PLAN_LABELS, ROLE_LABELS, STATUS_LABELS, type Plan, type Role, type UserStatus } from "@/lib/roles";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export const CARD = "admin-card rounded-2xl"; // admin-card 定義在 globals.css

export function Panel({ title, children, className = "", actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`${CARD} min-w-0 p-4 ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** 單一數字的指標卡：大數字 + 標籤 + 補充說明 */
export function StatTile({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "bad" | "warn" }) {
  return (
    <div className={`${CARD} px-4 py-3`}>
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-0.5 text-xl font-semibold tabular-nums ${tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : ""}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/**
 * 指標卡：圖示 + 標籤 + 大數字 + 和上一期比較的變化
 *   change    → 變化比例（0.12 = +12%），null 表示上一期沒有資料
 *   goodWhenUp → 上升是好事嗎？錯誤率、成本這類「上升要注意」的傳 false，箭頭顏色會反過來
 * 變化一律「箭頭 + 文字」，不只靠紅綠色。
 */
export function KpiCard({
  Icon,
  label,
  value,
  change,
  changeText,
  goodWhenUp = true,
  hint,
}: {
  Icon: LucideIcon;
  label: string;
  value: ReactNode;
  change?: number | null;
  changeText?: string; // 自訂變化文字（例如錯誤率用「百分點」）
  goodWhenUp?: boolean;
  hint?: ReactNode;
}) {
  const up = (change ?? 0) > 0;
  const flat = change === 0 || change === undefined;
  const good = flat ? null : up === goodWhenUp;
  return (
    <div className={`${CARD} flex items-center gap-3 px-4 py-3`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-xl leading-tight font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
        {change === null ? (
          <span className="text-muted">上一期無資料</span>
        ) : flat ? (
          <span className="text-muted">— 與上一期持平</span>
        ) : (
          <span className={`font-medium ${good ? "text-good" : "text-bad"}`}>
            {up ? "▲" : "▼"} {changeText ?? `${Math.abs(Math.round((change ?? 0) * 100))}%`}
          </span>
        )}
        {hint && <span className="text-muted">{hint}</span>}
      </p>
      </div>
    </div>
  );
}

/** 和上一期比較的變化比例；上一期是 0 時回傳 null（無法計算百分比） */
export function changeOf(cur: number, prev: number) {
  if (prev === 0) return cur === 0 ? 0 : null;
  return (cur - prev) / prev;
}

const ROLE_STYLE: Record<Role, string> = {
  user: "bg-ink/5 text-muted",
  support: "bg-sky/30 text-ink",
  admin: "bg-ink text-white",
};
const PLAN_STYLE: Record<Plan, string> = {
  free: "bg-ink/5 text-muted",
  pro: "bg-accent-soft text-accent",
  enterprise: "bg-lilac/40 text-ink",
};

export function RoleBadge({ role }: { role: Role }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${ROLE_STYLE[role]}`}>{ROLE_LABELS[role]}</span>;
}

export function PlanBadge({ plan }: { plan: Plan }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${PLAN_STYLE[plan]}`}>{PLAN_LABELS[plan]}</span>;
}

/** 狀態一律「圖示 + 文字」，不只靠顏色 */
export function StatusBadge({ status }: { status: UserStatus }) {
  return status === "suspended" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-bad-soft px-2 py-0.5 text-xs font-medium whitespace-nowrap text-bad">⛔ {STATUS_LABELS.suspended}</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-good-soft px-2 py-0.5 text-xs font-medium whitespace-nowrap text-good">● {STATUS_LABELS.active}</span>
  );
}

export function Avatar({ src, name, size = 8 }: { src: string; name: string; size?: 8 | 12 }) {
  const cls = size === 12 ? "size-12 text-lg" : "size-8 text-sm";
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" referrerPolicy="no-referrer" className={`${cls} shrink-0 rounded-full object-cover`} />
  ) : (
    <span className={`${cls} grid shrink-0 place-items-center rounded-full bg-accent-soft font-semibold text-accent uppercase`}>{name[0]}</span>
  );
}

export const EVENT_LABELS: Record<string, string> = {
  interview_start: "開始面試",
  interview_answer: "回答題目",
  interview_report: "產生診斷書",
  download_pdf: "下載 PDF",
  download_png: "下載 PNG",
  client_error: "前端錯誤",
};

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-paper/70 px-4 py-8 text-center text-sm text-muted">{children}</p>;
}
