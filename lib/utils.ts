// Misc shared helpers

// Class name merge helper — Button/Card/Input এ conditional class জোড়া লাগাতে ব্যবহার হবে
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

// তারিখ readable format এ দেখানোর জন্য — admin panel, result page এ লাগবে
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("bn-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// সেকেন্ড থেকে mm:ss ফরম্যাটে আনার জন্য — TimerBar কম্পোনেন্টে লাগবে (Step 4)
export function formatSeconds(totalSeconds: number): string {
  const m = Math.max(0, Math.floor(totalSeconds / 60));
  const s = Math.max(0, Math.floor(totalSeconds % 60));
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// DB এর UTC ISO string কে <input type="datetime-local"> এর জন্য browser এর local
// সময়ে বদলায় (ExamForm এডিট করার সময় সঠিক সময় দেখানোর জন্য — Step 6)
export function toLocalDateTimeInputValue(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}
