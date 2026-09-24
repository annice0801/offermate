/**
 * /interview 頁面
 * ------------------------------------------------------------
 * 頁面本身是 Server Component，只負責設定 metadata 與外框；
 * 真正有互動（表單、對話、呼叫 API）的部分交給 Client Component <InterviewApp />。
 * 這是 App Router 常見的寫法：「伺服器外殼 + 客戶端互動核心」。
 */
import type { Metadata } from "next";
import InterviewApp from "@/components/interview/interview-app";

export const metadata: Metadata = {
  title: "模擬面試 — OfferMate",
};

export default function InterviewPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <InterviewApp />
    </div>
  );
}
