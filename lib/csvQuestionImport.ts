// CSV থেকে বাল্ক প্রশ্ন ইম্পোর্ট — parsing + validation, client (preview) আর
// server (route.ts) দুই জায়গাতেই এই একই কোড ব্যবহার হয়, যাতে "client এ যা
// ভ্যালিড দেখাল" আর "server এ যা আসলে insert হলো" কখনো out-of-sync না হয়।
//
// কেন সরাসরি Supabase Table Editor দিয়ে CSV import করা যায় না:
// ১) headers মিলবে না — "প্রশ্ন", "অপশন (ক)" ইত্যাদি বাংলা header, table এর
//    আসল column নাম question_text/option_a ইত্যাদি ইংরেজি।
// ২) correct_option কলামে DB শুধু 'A'|'B'|'C'|'D' মানে, CSV তে থাকে বাংলা
//    ক/খ/গ/ঘ।
// ৩) exam_id একটা required foreign key, CSV তে থাকে না (কোন exam এ যাবে
//    সেটা admin এখানে বেছে দেয়, প্রতি row তে না)।
// ৪) order_index — DB নিজে atomic advisory-lock RPC দিয়ে ঠিক করে (দেখো
//    create_question_atomic, supabase/step15), CSV/client থেকে পাঠানো হয় না।
//
// তাই raw table-editor import এর বদলে এই app এর নিজের bulk-import route
// (app/api/exams/[examId]/questions/bulk-import/route.ts) ব্যবহার করা হয় —
// এটা প্রতিটা row কে ওই একই create_question_atomic RPC দিয়ে, ঠিক single
// question form এর মতোই validate করে insert করে, শুধু loop এ।

export interface ParsedQuestionRow {
  rowNumber: number; // 1-based, header বাদে — error message এ দেখানোর জন্য
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation: string | null;
}

export interface CsvImportResult {
  rows: ParsedQuestionRow[];
  errors: { rowNumber: number; message: string }[];
}

// --- ধাপ ১: raw CSV text -> string[][] ---
// একটা ছোট নিজস্ব parser লাগলো (কোনো external dependency ছাড়া) কারণ এই
// project এ csv-parse/papaparse কিছুই নেই আর এই format এ quoted field এর
// ভিতরে comma (যেমন প্রশ্নের মধ্যে "...হলে, f⁻¹(3)...") থাকে — সাধারণ
// .split(",") এতে ভেঙে যেত। RFC4180 এর মূল নিয়মগুলো (quoted field, escaped
// "" ভিতরে, quoted field এর ভিতরে newline) handle করা হয়েছে।
export function parseCsvText(text: string): string[][] {
  // BOM (Excel/Google Sheets থেকে export করা UTF-8 CSV তে প্রায়ই থাকে)
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++; // escaped quote, দুইটাই খেয়ে ফেলো
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\r") {
      // \r\n এর \r — পরের \n handle করবে, এখানে কিছু করার নেই
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  // শেষ field/row (trailing newline না থাকলে)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // পুরোপুরি খালি লাইন (একটা মাত্র খালি field) বাদ — CSV এর শেষে trailing
  // blank line থাকলে সেটাকে একটা "ভুট্টা" row হিসেবে গোনা যাবে না
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

// --- ধাপ ২: header row থেকে column index বের করা (flexible — বাংলা/ইংরেজি, বাড়তি স্পেস-নিরপেক্ষ) ---
const HEADER_ALIASES: Record<string, keyof Omit<ParsedQuestionRow, "rowNumber">> = {
  "প্রশ্ন": "question_text",
  question: "question_text",
  "question_text": "question_text",
  "অপশন (ক)": "option_a",
  "অপশন(ক)": "option_a",
  "option a": "option_a",
  option_a: "option_a",
  "অপশন (খ)": "option_b",
  "অপশন(খ)": "option_b",
  "option b": "option_b",
  option_b: "option_b",
  "অপশন (গ)": "option_c",
  "অপশন(গ)": "option_c",
  "option c": "option_c",
  option_c: "option_c",
  "অপশন (ঘ)": "option_d",
  "অপশন(ঘ)": "option_d",
  "option d": "option_d",
  option_d: "option_d",
  "সঠিক উত্তর": "correct_option",
  "correct answer": "correct_option",
  correct_option: "correct_option",
  "ব্যাখ্যা": "explanation",
  explanation: "explanation",
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

// সঠিক উত্তর কলামে বাংলা ক/খ/গ/ঘ অথবা ইংরেজি A/B/C/D — দুটোই গ্রহণযোগ্য
const ANSWER_MAP: Record<string, "A" | "B" | "C" | "D"> = {
  "ক": "A",
  "খ": "B",
  "গ": "C",
  "ঘ": "D",
  a: "A",
  b: "B",
  c: "C",
  d: "D",
};

export function parseBulkQuestionsCsv(csvText: string): CsvImportResult {
  const table = parseCsvText(csvText);
  if (table.length === 0) {
    return { rows: [], errors: [{ rowNumber: 0, message: "CSV ফাইলে কোনো ডেটা পাওয়া যায়নি" }] };
  }

  const headerRow = table[0];
  const colIndex: Partial<Record<keyof Omit<ParsedQuestionRow, "rowNumber">, number>> = {};
  headerRow.forEach((raw, idx) => {
    const key = HEADER_ALIASES[normalizeHeader(raw)];
    if (key && colIndex[key] === undefined) colIndex[key] = idx;
  });

  const required: (keyof Omit<ParsedQuestionRow, "rowNumber">)[] = [
    "question_text",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "correct_option",
  ];
  const missing = required.filter((k) => colIndex[k] === undefined);
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [
        {
          rowNumber: 0,
          message: `CSV এর header এ এই কলামগুলো পাওয়া যায়নি: ${missing.join(
            ", "
          )}। প্রথম সারি (header) ঠিক আছে কিনা দেখো (প্রশ্ন, অপশন (ক), অপশন (খ), অপশন (গ), অপশন (ঘ), সঠিক উত্তর)।`,
        },
      ],
    };
  }

  const rows: ParsedQuestionRow[] = [];
  const errors: { rowNumber: number; message: string }[] = [];

  for (let i = 1; i < table.length; i++) {
    const raw = table[i];
    const rowNumber = i; // header বাদে ১-based
    // পুরোপুরি খালি row (সব field trim করলে খালি) স্কিপ করো, error দেখিও না
    if (raw.every((c) => c.trim() === "")) continue;

    const get = (key: keyof Omit<ParsedQuestionRow, "rowNumber">) => {
      const idx = colIndex[key];
      return idx === undefined ? "" : (raw[idx] ?? "").trim();
    };

    const question_text = get("question_text");
    const option_a = get("option_a");
    const option_b = get("option_b");
    const option_c = get("option_c");
    const option_d = get("option_d");
    const rawAnswer = get("correct_option");
    const explanationRaw = get("explanation");

    const rowErrors: string[] = [];
    if (!question_text) rowErrors.push("প্রশ্ন খালি");
    if (!option_a) rowErrors.push("অপশন (ক) খালি");
    if (!option_b) rowErrors.push("অপশন (খ) খালি");
    if (!option_c) rowErrors.push("অপশন (গ) খালি");
    if (!option_d) rowErrors.push("অপশন (ঘ) খালি");

    const normalizedAnswer = ANSWER_MAP[rawAnswer.trim().toLowerCase()];
    if (!normalizedAnswer) {
      rowErrors.push(
        `"সঠিক উত্তর" এর মান বোঝা যায়নি: "${rawAnswer}" (ক/খ/গ/ঘ অথবা A/B/C/D হতে হবে)`
      );
    }

    if (rowErrors.length > 0) {
      errors.push({ rowNumber, message: rowErrors.join("; ") });
      continue;
    }

    rows.push({
      rowNumber,
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_option: normalizedAnswer,
      explanation: explanationRaw ? explanationRaw : null,
    });
  }

  return { rows, errors };
}
