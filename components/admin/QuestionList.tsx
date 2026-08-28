import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import type { Question } from "@/types";

interface QuestionListProps {
  questions: Question[];
  onEdit: (question: Question) => void;
  onDelete: (question: Question) => void;
}

export default function QuestionList({ questions, onEdit, onDelete }: QuestionListProps) {
  return (
    <Table
      rowKey={(q) => q.id}
      emptyMessage="এখনো কোনো প্রশ্ন যোগ করা হয়নি। উপরের বাটন দিয়ে প্রথম প্রশ্ন যোগ করো।"
      columns={[
        {
          header: "প্রশ্ন",
          accessor: (q) => <span className="line-clamp-1">{q.question_text}</span>,
          className: "max-w-xs",
        },
        { header: "সঠিক উত্তর", accessor: (q) => q.correct_option },
        {
          header: "কাজ",
          accessor: (q) => (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(q)}>
                এডিট
              </Button>
              <Button variant="danger" size="sm" onClick={() => onDelete(q)}>
                মুছে ফেলো
              </Button>
            </div>
          ),
        },
      ]}
      data={questions}
    />
  );
}
