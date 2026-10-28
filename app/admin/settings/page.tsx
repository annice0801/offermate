/**
 * /admin/settings 系統設定
 * ------------------------------------------------------------
 * 伺服器讀出目前設定，交給 <SettingsForm /> 編輯；support 只能看不能存。
 */
import { connection } from "next/server";
import SettingsForm from "@/components/admin/settings-form";
import { PageHeader } from "@/components/admin/ui";
import { getCurrentUser } from "@/lib/auth";
import { MODEL } from "@/lib/openai";
import { canEditAdmin } from "@/lib/roles";
import { getSettings } from "@/lib/settings";

export default async function AdminSettingsPage() {
  await connection(); // 只在真正有請求時執行（見 app/admin/layout.tsx）
  const [settings, me] = await Promise.all([getSettings(), getCurrentUser()]);

  return (
    <>
      <PageHeader title="系統設定" description={`目前面試使用的模型：${MODEL}（可用 .env.local 的 OPENAI_MODEL 修改）`} />
      <SettingsForm
        initial={{
          requireLogin: settings.requireLogin,
          pricing: settings.pricing.map((p) => ({ model: p.model, inputPerM: p.inputPerM, cachedInputPerM: p.cachedInputPerM, outputPerM: p.outputPerM })),
          webSearchPerCallUsd: settings.webSearchPerCallUsd,
          usdToTwd: settings.usdToTwd,
        }}
        currentModel={MODEL}
        canEdit={canEditAdmin(me?.role)}
      />
    </>
  );
}
