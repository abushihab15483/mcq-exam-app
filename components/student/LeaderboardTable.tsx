import Table from "@/components/ui/Table";
import { cn, formatSeconds } from "@/lib/utils";

interface LeaderboardRow {
  rank: number;
  student_name: string;
  score: number;
  total: number;
  duration_seconds?: number;
}

interface LeaderboardTableProps {
  rows: LeaderboardRow[];
  // এই student এর নিজের row হাইলাইট করতে — কোনো unique id নাই leaderboard row
  // এ, তাই নাম + score + duration মিলিয়ে ম্যাচ করা হচ্ছে (single attempt/exam
  // context এ এইটুকুই যথেষ্ট, একই নাম-স্কোর-সময়ে দুইজন থাকার সম্ভাবনা নগণ্য)
  currentUser?: {
    student_name: string;
    score: number;
    duration_seconds?: number | null;
  } | null;
}

function isSameRow(row: LeaderboardRow, currentUser: LeaderboardTableProps["currentUser"]) {
  if (!currentUser) return false;
  return (
    row.student_name === currentUser.student_name &&
    row.score === currentUser.score &&
    (currentUser.duration_seconds == null || row.duration_seconds === currentUser.duration_seconds)
  );
}

// টেবিলের ৪ কলাম (ক্রম/নাম/নম্বর/সময়) ছোট মোবাইল স্ক্রিনে গাদাগাদি হয়ে পড়া কঠিন করে
// তুলছিল — ছোট স্ক্রিনে (sm এর নিচে) টেবিলের বদলে কম্প্যাক্ট কার্ড দেখানো হচ্ছে, একই
// `rows` data/ranking দিয়ে (কোনো নতুন fetch/লজিক নেই, sm ও তার উপরে টেবিলই থাকছে)।
export default function LeaderboardTable({ rows, currentUser }: LeaderboardTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-border bg-white p-8 text-center text-ink-soft font-body">
        এখনো কেউ পরীক্ষা শেষ করেনি
      </div>
    );
  }

  return (
    <>
      <div className="hidden sm:block">
        <Table
          rowKey={(row) => `${row.rank}-${row.student_name}`}
          emptyMessage="এখনো কেউ পরীক্ষা শেষ করেনি"
          rowClassName={(row) => (isSameRow(row, currentUser) ? "bg-emerald-700/15" : undefined)}
          columns={[
            { header: "ক্রম", accessor: (row) => row.rank },
            { header: "নাম", accessor: (row) => row.student_name },
            {
              header: "নম্বর",
              accessor: (row) => (
                <span className="font-mono">
                  {row.score}/{row.total}
                </span>
              ),
            },
            {
              header: "সময়",
              accessor: (row) =>
                row.duration_seconds != null ? (
                  <span className="font-mono text-ink-soft">{formatSeconds(row.duration_seconds)}</span>
                ) : (
                  "—"
                ),
            },
          ]}
          data={rows}
        />
      </div>

      <ul className="space-y-2 sm:hidden">
        {rows.map((row) => (
          <li
            key={`${row.rank}-${row.student_name}`}
            className={cn(
              "flex items-center gap-3 rounded-card border border-border bg-white px-4 py-3",
              row.rank <= 3 && "border-gold/40 bg-gold/5",
              isSameRow(row, currentUser) && "border-emerald-700/50 bg-emerald-700/15"
            )}
          >
            <span className="w-7 shrink-0 text-center text-sm font-semibold text-ink-soft" aria-hidden="true">
              {RANK_EMOJI[row.rank] ?? row.rank}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                <span className="sr-only">{row.rank} নম্বর স্থানে </span>
                {row.student_name}
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {row.duration_seconds != null ? `${formatSeconds(row.duration_seconds)} • ` : ""}
                {row.total} নম্বরের মধ্যে
              </p>
            </div>
            <span className="shrink-0 font-mono text-sm font-semibold text-ink">
              {row.score}/{row.total}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

const RANK_EMOJI: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
