/**
 * /api/resumes — 會員的履歷（需登入）
 * ------------------------------------------------------------
 *   GET  → 列出自己的履歷（不回傳全文，只給檔名、頁數、字數、開頭預覽）
 *   POST → 上傳 PDF（multipart，欄位名 file）→ 解析成文字後存進資料庫
 *
 * 限制：只收 PDF、檔案 4MB 以內（Vercel 單次請求上限約 4.5MB）、每人最多 5 份。
 * 掃描成圖片的 PDF 沒有文字可以讀，會直接回錯誤請使用者改用文字版 PDF。
 */
import { extractText, getDocumentProxy } from "unpdf";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { MAX_RESUMES, MAX_RESUME_CHARS, ResumeModel } from "@/lib/models/resume";

const MAX_BYTES = 4 * 1024 * 1024;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "請先登入" }, { status: 401 });

  await connectDB();
  const resumes = await ResumeModel.find({ userId: user.id }).sort({ createdAt: -1 }).lean();
  return Response.json({
    resumes: resumes.map((r) => ({
      id: String(r._id),
      fileName: r.fileName,
      pages: r.pages,
      chars: r.text.length,
      preview: r.text.slice(0, 80),
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "請先登入才能上傳履歷" }, { status: 401 });

  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("file");
    file = value instanceof File ? value : null;
  } catch {
    return Response.json({ error: "上傳格式錯誤" }, { status: 400 });
  }
  if (!file) return Response.json({ error: "請選擇履歷檔案" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "檔案太大了，請上傳 4MB 以內的 PDF" }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  // 用檔頭判斷是不是 PDF（%PDF），不只看副檔名
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    return Response.json({ error: "只支援 PDF 格式的履歷" }, { status: 400 });
  }

  await connectDB();
  if ((await ResumeModel.countDocuments({ userId: user.id })) >= MAX_RESUMES) {
    return Response.json({ error: `最多只能保存 ${MAX_RESUMES} 份履歷，請先刪除舊的` }, { status: 400 });
  }

  let text = "";
  let pages = 0;
  try {
    const pdf = await getDocumentProxy(bytes);
    const result = await extractText(pdf, { mergePages: true });
    pages = result.totalPages;
    // NFKC：很多 PDF（例如 Mac 用蘋方字體輸出的）會把「小、工、口、人」這類常用字存成長得一樣的
    // 康熙部首字元（U+2F00 起），AI 和搜尋都會認不出來，這裡統一轉回一般的中文字。
    // 接著整理空白：多個空白合成一個、多個空行合成一個
    text = result.text
      .normalize("NFKC")
      .replace(/[ \t ]+/g, " ")
      .replace(/\n\s*\n+/g, "\n\n")
      .trim()
      .slice(0, MAX_RESUME_CHARS);
  } catch (err) {
    console.error("[resumes] PDF 解析失敗", err instanceof Error ? err.message : err);
    return Response.json({ error: "這份 PDF 無法讀取，可能有密碼保護或檔案損毀" }, { status: 400 });
  }
  if (text.length < 50) {
    return Response.json({ error: "讀不到這份 PDF 的文字，可能是掃描成圖片的檔案。請改用可以選取文字的 PDF" }, { status: 400 });
  }

  const fileName = (file.name || "履歷.pdf").slice(0, 100);
  const resume = await ResumeModel.create({ userId: user.id, fileName, text, pages });
  return Response.json(
    {
      resume: {
        id: String(resume._id),
        fileName,
        pages,
        chars: text.length,
        preview: text.slice(0, 80),
        createdAt: resume.createdAt,
      },
    },
    { status: 201 },
  );
}
