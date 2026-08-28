// Regression tests for lib/csvQuestionImport.ts (CSV বাল্ক প্রশ্ন ইম্পোর্ট)।
// Run with: node --experimental-strip-types --test tests/

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsvText, parseBulkQuestionsCsv } from "../../lib/csvQuestionImport.ts";

test("parseCsvText: handles quoted fields containing commas", () => {
  const csv = 'a,b,c\n"1,2",3,"4""5"';
  const rows = parseCsvText(csv);
  assert.deepEqual(rows, [
    ["a", "b", "c"],
    ["1,2", "3", '4"5'],
  ]);
});

test("parseCsvText: strips a leading BOM", () => {
  const csv = "\uFEFFa,b\n1,2";
  const rows = parseCsvText(csv);
  assert.deepEqual(rows, [
    ["a", "b"],
    ["1", "2"],
  ]);
});

const HEADER = "ক্র.নং,প্রশ্ন,অপশন (ক),অপশন (খ),অপশন (গ),অপশন (ঘ),সঠিক উত্তর";

test("parseBulkQuestionsCsv: valid Bengali-header rows parse with mapped correct_option", () => {
  const csv = `${HEADER}\n1,প্রশ্ন এক?,A,B,C,D,খ`;
  const { rows, errors } = parseBulkQuestionsCsv(csv);
  assert.equal(errors.length, 0);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].correct_option, "B");
  assert.equal(rows[0].question_text, "প্রশ্ন এক?");
});

test("parseBulkQuestionsCsv: also accepts English A/B/C/D headers and answers", () => {
  const csv = "question,option_a,option_b,option_c,option_d,correct_option\nWhat?,1,2,3,4,C";
  const { rows, errors } = parseBulkQuestionsCsv(csv);
  assert.equal(errors.length, 0);
  assert.equal(rows[0].correct_option, "C");
});

test("parseBulkQuestionsCsv: reports missing required headers instead of throwing", () => {
  const csv = "foo,bar\n1,2";
  const { rows, errors } = parseBulkQuestionsCsv(csv);
  assert.equal(rows.length, 0);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /header/);
});

test("parseBulkQuestionsCsv: flags a row with an unrecognized answer letter", () => {
  const csv = `${HEADER}\n1,প্রশ্ন,A,B,C,D,X`;
  const { rows, errors } = parseBulkQuestionsCsv(csv);
  assert.equal(rows.length, 0);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].rowNumber, 1);
});

test("parseBulkQuestionsCsv: flags a row with an empty option", () => {
  const csv = `${HEADER}\n1,প্রশ্ন,,B,C,D,ক`;
  const { rows, errors } = parseBulkQuestionsCsv(csv);
  assert.equal(rows.length, 0);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /অপশন \(ক\) খালি/);
});

test("parseBulkQuestionsCsv: skips fully blank rows without error", () => {
  const csv = `${HEADER}\n1,প্রশ্ন,A,B,C,D,ক\n,,,,,,\n`;
  const { rows, errors } = parseBulkQuestionsCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(errors.length, 0);
});

test("parseBulkQuestionsCsv: preserves CSV row order in rowNumber (order_index depends on this)", () => {
  const csv = `${HEADER}\n1,Q1,A,B,C,D,ক\n2,Q2,A,B,C,D,খ\n3,Q3,A,B,C,D,গ`;
  const { rows } = parseBulkQuestionsCsv(csv);
  assert.deepEqual(
    rows.map((r) => r.question_text),
    ["Q1", "Q2", "Q3"]
  );
});
