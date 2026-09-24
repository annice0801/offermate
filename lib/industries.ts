/**
 * 產業下拉選單的選項
 * ------------------------------------------------------------
 * 用 group 分組，在 <select> 裡會以 <optgroup> 呈現，選項多時比較好找。
 * 職缺範本（templates.ts）的 industry 必須是這裡的其中一個值，選單才能正確顯示。
 */
export const INDUSTRY_GROUPS: { group: string; options: string[] }[] = [
  {
    group: "科技",
    options: ["軟體 / 網路服務", "SaaS / 企業軟體", "半導體", "電子製造 / 硬體", "遊戲開發", "人工智慧 / 資料科學", "資訊安全"],
  },
  {
    group: "金融與商業",
    options: ["金融 / 銀行", "金融科技", "保險", "投資 / 創投", "管理顧問", "會計 / 審計"],
  },
  {
    group: "消費與零售",
    options: ["電子商務", "零售 / 快消品", "餐飲 / 服務業", "旅遊 / 飯店", "時尚 / 美妝"],
  },
  {
    group: "行銷與內容",
    options: ["廣告行銷 / 品牌", "媒體 / 內容產業", "公關 / 傳播"],
  },
  {
    group: "產業與公共",
    options: ["生技醫療", "製造業 / 傳產", "物流 / 供應鏈", "能源 / 綠能", "營建 / 不動產", "教育", "政府 / 非營利組織"],
  },
];

/** 選單中「其他」選項的值：選了之後會出現輸入框讓使用者自行填寫 */
export const OTHER_INDUSTRY = "__other__";

/** 判斷某個產業字串是否在預設清單中（不在的話代表是使用者自行輸入的） */
export function isPresetIndustry(value: string) {
  return INDUSTRY_GROUPS.some((g) => g.options.includes(value));
}
