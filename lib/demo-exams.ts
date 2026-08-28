// DB-তে এখনো বাস্তব পরীক্ষা যোগ না হলে UI কেমন দেখাবে বোঝানোর জন্য ডামি ডেটা।
// বাস্তব পরীক্ষা যোগ হওয়ার সাথে সাথেই এগুলো আর দেখানো হবে না — শুধু fallback হিসেবে ব্যবহৃত।

export interface DemoExam {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

export const DEMO_RUNNING_EXAM: DemoExam = {
  id: "demo-running",
  title: "উচ্চতর গণিত পরীক্ষা — ০২",
  start_time: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  end_time: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
  duration_minutes: 50,
};

export const DEMO_UPCOMING_EXAM: DemoExam = {
  id: "demo-upcoming",
  title: "রসায়ন মডেল টেস্ট — ০১",
  start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
  duration_minutes: 45,
};

export const DEMO_FINISHED_EXAM: DemoExam = {
  id: "demo-finished",
  title: "পদার্থবিজ্ঞান প্র্যাকটিস পরীক্ষা — ০৩",
  start_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  end_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 40 * 60 * 1000).toISOString(),
  duration_minutes: 40,
};
