"use client";

import { Button } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export interface ExportCsvRow {
  rank: number;
  student_name: string;
  student_phone: string;
  student_institution: string;
  score: number | null;
  total_questions: number | null;
  percentage: number | null;
  submitted_at: string;
}

interface ExportCsvButtonProps {
  examTitle: string;
  examId: string;
  rows: ExportCsvRow[];
}

// কমা/ডাবল-কোট/নিউলাইন থাকলে ডাবল-কোটে র‍্যাপ করা হয়, ভিতরের ডাবল-কোট ডাবল করে —
// standard CSV escaping (student_name/student_institution এ কমা থাকতে পারে)
function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function slugifyFilename(title: string): string {
  const slug = title.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "results";
}

export default function ExportCsvButton({ examTitle, examId, rows }: ExportCsvButtonProps) {
  function handleExport() {
    const header = ["Rank", "Name", "Phone", "Institution", "Score", "Percentage", "Submitted At"];
    const lines = [header.join(",")];

    for (const row of rows) {
      const score = row.score !== null && row.total_questions !== null ? `${row.score}/${row.total_questions}` : "";
      const percentage = row.percentage !== null ? `${row.percentage}%` : "";
      lines.push(
        [
          String(row.rank),
          csvEscape(row.student_name),
          csvEscape(row.student_phone),
          csvEscape(row.student_institution),
          csvEscape(score),
          csvEscape(percentage),
          csvEscape(formatDateTime(row.submitted_at)),
        ].join(",")
      );
    }

    // UTF-8 BOM ছাড়া Excel এ বাংলা টেক্সট mojibake দেখায়
    const csvContent = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugifyFilename(examTitle)}-${examId.slice(0, 8)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      CSV এক্সপোর্ট করো
    </Button>
  );
}
