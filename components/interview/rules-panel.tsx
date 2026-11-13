/**
 * 設定頁的「面試官規則」區塊（選填）
 * ------------------------------------------------------------
 *   - 常用規則：點一下開關（壓力面試、深挖履歷、英文面試…），定義在 lib/types.ts 的 RULE_PRESETS
 *   - 自訂規則：自己寫，例如「一定要問我為什麼離開上一份工作」，最多 5 條
 * 規則會放進每一題的提示詞，面試官出題時優先遵守。
 */
"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { CUSTOM_RULE_LIMIT, RULE_PRESETS, type RulePresetKey } from "@/lib/types";

interface Props {
  presets: RulePresetKey[];
  onPresetsChange: (v: RulePresetKey[]) => void;
  customRules: string[];
  onCustomRulesChange: (v: string[]) => void;
}

export default function RulesPanel({ presets, onPresetsChange, customRules, onCustomRulesChange }: Props) {
  const [draft, setDraft] = useState("");
  const full = customRules.length >= CUSTOM_RULE_LIMIT.count;

  function toggle(key: RulePresetKey) {
    onPresetsChange(presets.includes(key) ? presets.filter((k) => k !== key) : [...presets, key]);
  }

  function add() {
    const rule = draft.trim();
    if (!rule || full) return;
    onCustomRulesChange([...customRules, rule.slice(0, CUSTOM_RULE_LIMIT.length)]);
    setDraft("");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {RULE_PRESETS.map((r) => {
          const on = presets.includes(r.key);
          return (
            <button
              key={r.key}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(r.key)}
              title={r.description}
              className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                on ? "bg-ink text-white" : "bg-white/70 text-ink hover:bg-white"
              }`}
            >
              {on ? "✓ " : ""}
              {r.label}
            </button>
          );
        })}
      </div>
      {presets.length > 0 && (
        <p className="text-xs text-muted">
          {RULE_PRESETS.filter((r) => presets.includes(r.key))
            .map((r) => `${r.label}：${r.description}`)
            .join("・")}
        </p>
      )}

      {customRules.length > 0 && (
        <ul className="space-y-1.5">
          {customRules.map((r, i) => (
            <li key={`${r}-${i}`} className="flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">{r}</span>
              <button
                type="button"
                onClick={() => onCustomRulesChange(customRules.filter((_, j) => j !== i))}
                className="grid size-6 shrink-0 place-items-center rounded-md text-muted hover:bg-ink/5 hover:text-ink"
                aria-label="刪除這條規則"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter 加入規則，而不是送出整張表單
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          maxLength={CUSTOM_RULE_LIMIT.length}
          disabled={full}
          placeholder={full ? `最多 ${CUSTOM_RULE_LIMIT.count} 條` : "自訂規則，例如：一定要問我為什麼離開上一份工作"}
          className="min-w-0 flex-1 rounded-xl border border-white bg-white/60 px-3 py-2 text-sm outline-none transition placeholder:text-muted/60 focus:bg-white focus:ring-4 focus:ring-accent-bright/20 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || full}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white/80 px-3 text-sm font-medium transition hover:bg-white disabled:opacity-50"
        >
          <Plus className="size-4" />
          加入
        </button>
      </div>
    </div>
  );
}
