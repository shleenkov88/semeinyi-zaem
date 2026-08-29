#!/usr/bin/env node
import { writeFile } from "node:fs/promises";

const HOME = "https://www.cbr.ru/";
const TABLE = "https://www.cbr.ru/hd_base/keyrate/";

function parsePct(raw) {
  const n = Number(String(raw).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) && n > 0 && n < 40 ? n : null;
}

function parseRuDate(raw) {
  const m = String(raw).trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; FamilyLoan/1.0)",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

const html = await fetchText(HOME);
const text = stripTags(html);
const block = text.match(/Ключевая ставка\s+с\s+(\d{2}\.\d{2}\.\d{4})\s+(\d{1,2}[.,]\d{2})\s*%/i);
if (!block) throw new Error("CBR parse failed");
const effectiveFrom = parseRuDate(block[1]);
const rate = parsePct(block[2]);
if (!effectiveFrom || rate == null) throw new Error("CBR values failed");
const next = text.match(/Следующее заседание[\s\S]{0,80}?(\d{2}\.\d{2}\.\d{4})/i);

const today = new Date();
const asOf = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

const out = {
  rate,
  effectiveFrom,
  asOf,
  nextMeeting: next ? parseRuDate(next[1]) : null,
  source: "Банк России",
  sourceUrl: TABLE,
  fetchedAt: new Date().toISOString(),
  live: true,
};

await writeFile("cbr.json", `${JSON.stringify(out, null, 2)}\n`);
console.log("CBR", rate, effectiveFrom);
