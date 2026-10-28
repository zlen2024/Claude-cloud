// i18n ringkas: t(kunci, pembolehubah). Bahasa lalai ms. Pilihan disimpan dalam localStorage.
import ms from "./ms.json";
import en from "./en.json";
import { store } from "../storage.js";

const DICT = { ms, en };
let lang = "ms";
const listeners = new Set();

export const getLang = () => lang;
export const onLangChange = (fn) => listeners.add(fn);

export function t(key, vars = {}) {
  const s = DICT[lang][key] ?? DICT.ms[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** Terapkan terjemahan pada elemen statik: data-i18n (teks), data-i18n-attr="attr:key;attr:key". */
export function applyStatic(root) {
  if (typeof document === "undefined") return;
  root ??= document;
  for (const el of root.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll("[data-i18n-attr]")) {
    for (const pair of el.dataset.i18nAttr.split(";")) {
      const [attr, key] = pair.split(":");
      if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
    }
  }
  document.documentElement.lang = lang === "ms" ? "ms" : "en";
}

export function setLang(next, { persist = true } = {}) {
  if (!DICT[next]) return;
  lang = next;
  if (persist) store.set("lang", next);
  applyStatic();
  for (const fn of listeners) fn(next);
}

export function initLang() {
  const saved = store.get("lang");
  lang = DICT[saved] ? saved : "ms"; // lalai BM; pilihan pengguna disimpan
  applyStatic();
}

export const _dictForTests = DICT;
