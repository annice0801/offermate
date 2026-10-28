/**
 * MongoDB 連線（mongoose）
 * ------------------------------------------------------------
 * 連線字串放在 .env.local 的 MONGODB_URI。
 *
 * 為什麼要把連線存在 globalThis？
 *   - 開發時 Next.js 熱更新會重新執行模組，若每次都 connect 會累積一堆連線
 *   - 部署到 Vercel 時，同一個暖機中的函式實例也能重複使用同一條連線
 *
 * 用法（只能在後端 import，例如 Route Handler）：
 *   await connectDB();
 *   await PracticeSessionModel.create({ ... });
 */
import mongoose from "mongoose";

const globalForMongoose = globalThis as unknown as {
  mongooseConn?: Promise<typeof mongoose>;
};

export function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("尚未設定 MONGODB_URI，請在 .env.local 加上 MongoDB 連線字串。");

  if (!globalForMongoose.mongooseConn) {
    globalForMongoose.mongooseConn = mongoose.connect(uri).catch((err) => {
      // 連線失敗就清掉快取，下一次請求才會重新嘗試，而不是一直拿到同一個失敗的 Promise
      globalForMongoose.mongooseConn = undefined;
      throw err;
    });
  }
  return globalForMongoose.mongooseConn;
}
