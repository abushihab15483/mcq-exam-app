import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Column<T> {
  header: string;
  accessor: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  // নির্দিষ্ট কোনো row কে আলাদা রঙে হাইলাইট করতে (যেমন: leaderboard এ নিজের row)
  // — বাকি সব ব্যবহারে (admin student/question list) optional, প্রভাব নেই
  rowClassName?: (row: T) => string | undefined;
}

// admin এর student list, question list, leaderboard — সবগুলোতে এই একই Table ব্যবহার হবে,
// শুধু columns পাল্টে দিলেই হয়
export default function Table<T>({ columns, data, rowKey, emptyMessage, rowClassName }: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-card border border-border bg-white p-8 text-center text-ink-soft font-body">
        {emptyMessage ?? "কোনো তথ্য নেই"}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-white">
      <table className="w-full text-left font-body">
        <thead>
          <tr className="border-b border-border bg-black/[0.02]">
            {columns.map((col) => (
              <th key={col.header} className="px-4 py-3 text-sm font-medium text-ink-soft">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={rowKey(row)} className={cn("border-b border-border last:border-0", rowClassName?.(row))}>
              {columns.map((col) => (
                <td key={col.header} className={cn("px-4 py-3 text-sm text-ink", col.className)}>
                  {col.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
