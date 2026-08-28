"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Input, Loader } from "@/components/ui";
import ReviewList from "@/components/student/ReviewList";
import LeaderboardTable from "@/components/student/LeaderboardTable";
import StorageWarning from "@/components/shared/StorageWarning";
import { formatSeconds } from "@/lib/utils";
import { getAttempt, saveAttempt } from "@/lib/attemptStorage";
import type { OptionKey } from "@/types";

interface OwnResult {
  visible: boolean;
  submitted: boolean;
  student_name?: string;
  student_institution?: string;
  score?: number;
  total?: number;
  duration_seconds?: number | null;
}
interface ReviewQuestion {
  id: string;
  question_text: string;
  options: Record<OptionKey, string>;
  correct_option: OptionKey;
  selected_option: OptionKey | null;
  is_correct: boolean;
  is_skipped: boolean;
  explanation: string | null;
}
interface LeaderboardRow {
  rank: number;
  student_name: string;
  score: number;
  total: number;
  duration_seconds?: number;
}

interface ResultLookupProps {
  examId: string;
  examTitle?: string;
  // /result/[examId] এ (নিজে সাবমিট করার পরপর redirect) — true, তাই সাথে সাথে
  // দেখায়। /result (fix, shared device দিয়ে অন্য কেউ যেকোনো সময় আসতে পারে) এ —
  // false, যাতে আগের কারো cached result ভুল করে না দেখিয়ে ফেলে।
  autoLoadFromStorage?: boolean;
}

// এই কম্পোনেন্টটাই আসলে "student এর সাথে ওয়েবসাইটের সম্পর্ক" এর জায়গা:
// কোনো password/login নেই — ফোন নাম্বার (যেটা দিয়ে exam শুরু করেছিল) দিয়েই
// server এ attempt খুঁজে বের করে result দেখানো হয়। এই ফোন নাম্বারটাই student এর
// "account" হিসেবে কাজ করে (attempts টেবিলে exam+phone unique)।
//
// প্রথমবার (এই ডিভাইসে সাথে সাথে, নিজে সাবমিট করার পর) — localStorage এ attempt_id
// সেভ থাকে বলে ফোন আবার লিখতে হয় না। অন্য ডিভাইস থেকে, বা শেয়ার করা ডিভাইসে অন্য
// কেউ পরে দেখতে চাইলে ফোন নাম্বার দিয়ে খুঁজে বের করতে হবে।
export default function ResultLookup({ examId, examTitle, autoLoadFromStorage = true }: ResultLookupProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  // attempt_id একা আর যথেষ্ট না — result/review endpoint এখন এই signed token
  // চায় (submit করার পর, অথবা নিচের phone+name lookup verify করার পর পাওয়া যায়)
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);

  const [own, setOwn] = useState<OwnResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [ownError, setOwnError] = useState<string | null>(null);

  // Review — কেবল ব্যবহারকারী "উত্তরপত্র দেখো" চাপলে fetch হয়। review !== null
  // মানেই একবার লোড হয়ে গেছে — ফের টগল করলে আর fetch হবে না (duplicate-fetch গার্ড)।
  const [review, setReview] = useState<ReviewQuestion[] | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);

  // Leaderboard — সেকশনটা viewport এ আসলে (IntersectionObserver) lazy-load হয়।
  // lbStatus দিয়েই duplicate fetch আটকানো হয় (idle→loading→loaded/error, আর কখনো ফিরে না)।
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [leaderboardVisible, setLeaderboardVisible] = useState(true);
  const [lbStatus, setLbStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const leaderboardSectionRef = useRef<HTMLDivElement | null>(null);

  // localStorage এ আগে থেকে attempt থাকলে (এইমাত্র সাবমিট করেছে, exam page থেকে
  // ?a=<attemptId> সহ redirect হয়ে এসেছে) — automatic লোড, ঠিক সেই attemptId এর
  // slot থেকেই (অন্য কোনো student এর slot থেকে না, শেয়ার্ড ডিভাইসে এটাই আসল fix)।
  // shared device এ (fix /result লিংকে, attemptId ছাড়া) এটা করা হয় না — নাহলে
  // আগের student এর result ভুল করে দেখিয়ে ফেলতে পারে।
  useEffect(() => {
    if (!autoLoadFromStorage) return;
    const attemptIdParam = searchParams.get("a");
    if (!attemptIdParam) return;
    // getAttempt never throws — corrupted/missing data safely resolves to null
    const info = getAttempt(examId, attemptIdParam);
    // token ছাড়া attemptId সেট করে লাভ নেই — নিচের fetch effect আটকে যাবে,
    // fallback: এই device এ token না থাকলে lookup ফর্মেই থাকতে হবে
    if (info?.accessToken) {
      setAttemptId(info.attemptId);
      setAccessToken(info.accessToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, searchParams]);

  // প্রাথমিক লোডে শুধু নিজের result — review ও leaderboard এখানে fetch হয় না,
  // যাতে স্কোর যত দ্রুত সম্ভব দেখা যায়। fetch fail করলে (network) আগে এখানে কোনো
  // catch ছিল না — loading চিরকাল আটকে থাকতো (own কখনো set হতো না)। এখন fail
  // করলে স্পষ্ট মেসেজ + retry বাটন দেখানো হয়।
  function loadOwnResult() {
    if (!attemptId || !accessToken) return;
    setLoading(true);
    setOwnError(null);
    const tokenQs = `token=${encodeURIComponent(accessToken)}`;
    fetch(`/api/attempts/${attemptId}?${tokenQs}`)
      .then(async (r) => {
        if (r.status === 401) {
          // Result access token expire হয়ে গেছে (এটা exam-session token থেকে
          // আলাদা, ফলাফল হারিয়ে যায়নি) — student কে "401 Unauthorized" বা
          // "ফলাফল পাওয়া যায়নি" বলে ভয় দেখানো হচ্ছে না, শুধু আবার নাম+ফোন
          // চাওয়া হচ্ছে যাতে নতুন token ইস্যু হতে পারে (দেখো
          // app/api/attempts/lookup/route.ts)। এই attemptId/accessToken রিসেট
          // হয়ে যাচ্ছে যাতে নিচের lookup ফর্ম আবার দেখা যায়।
          setAttemptId(null);
          setAccessToken(null);
          setOwn(null);
          setLookupError("তোমার সেশনের মেয়াদ শেষ — আবার নাম ও ফোন নাম্বার দাও, ফলাফল ঠিকই আছে।");
          return null;
        }
        return r.json();
      })
      .then((ownData) => {
        if (ownData) setOwn(ownData);
      })
      .catch(() => setOwnError("ফলাফল লোড করা যায়নি, আবার চেষ্টা করো"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOwnResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, accessToken]);

  // "উত্তরপত্র দেখো" চাপলেই কেবল review fetch হয়। review !== null থাকলে (আগেই
  // লোড হয়ে গেছে) বা ইতিমধ্যে লোড হচ্ছে থাকলে আবার fetch করা হয় না।
  function loadReview() {
    if (review !== null || reviewLoading || !attemptId || !accessToken) return;
    setReviewLoading(true);
    setReviewError(null);
    const tokenQs = `token=${encodeURIComponent(accessToken)}`;
    fetch(`/api/attempts/${attemptId}/review?${tokenQs}`)
      .then(async (r) => {
        if (r.status === 401) {
          // এখানেও একই কারণ (token expired) — result হারায়নি, শুধু আবার
          // lookup করলে review-ও আবার দেখা যাবে
          setAttemptId(null);
          setAccessToken(null);
          setOwn(null);
          setReview(null);
          setLookupError("তোমার সেশনের মেয়াদ শেষ — আবার নাম ও ফোন নাম্বার দাও, ফলাফল ঠিকই আছে।");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setReview(data.review ?? []);
      })
      .catch(() => setReviewError("উত্তরপত্র লোড করা যায়নি, আবার চেষ্টা করো"))
      .finally(() => setReviewLoading(false));
  }

  function handleToggleReview() {
    setShowReview((v) => !v);
    loadReview();
  }

  // leaderboard section viewport এ visible হলেই (একবারই) fetch হয় — user স্ক্রল
  // না করলে অহেতুক request যায় না। lbStatus "idle" ছাড়া আর কিছুতে হলে re-fetch হয় না।
  function loadLeaderboard() {
    setLbStatus("loading");
    fetch(`/api/leaderboard/${examId}`)
      .then((r) => r.json())
      .then((lbData) => {
        setRows(lbData.rows ?? []);
        setLeaderboardVisible(lbData.visible !== false);
        setLbStatus("loaded");
      })
      .catch(() => setLbStatus("error"));
  }

  useEffect(() => {
    if (!own || !own.submitted || !own.visible) return;
    if (lbStatus !== "idle") return;
    const el = leaderboardSectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          observer.disconnect();
          loadLeaderboard();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [own, examId, lbStatus]);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupError(null);
    if (!name.trim()) {
      setLookupError("নাম দাও");
      return;
    }
    if (!phone.trim()) {
      setLookupError("ফোন নাম্বার দাও");
      return;
    }
    setLooking(true);
    try {
      const qs = new URLSearchParams({
        exam_id: examId,
        name: name.trim(),
        phone: phone.trim(),
      });
      const res = await fetch(`/api/attempts/lookup?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error ?? "খুঁজে পাওয়া যায়নি");
        setLooking(false);
        return;
      }
      // এই attempt এর নিজের slot এ সেভ হচ্ছে (attemptId দিয়ে key করা) — এই
      // ব্রাউজারে অন্য কোনো student এর attempt slot এখানে ছোঁয়া হচ্ছে না।
      saveAttempt(examId, {
        attemptId: data.attempt_id,
        accessToken: data.access_token,
      });
      setAttemptId(data.attempt_id);
      setAccessToken(data.access_token);
    } catch {
      setLookupError("নেটওয়ার্ক সমস্যা, আবার চেষ্টা করো");
    } finally {
      setLooking(false);
    }
  }

  // ফোন নাম্বার এখনো দেওয়া হয়নি — lookup ফর্ম দেখাও
  if (!attemptId) {
    return (
      <Card className="py-8">
        <h2 className="font-display text-lg font-semibold text-ink mb-1 text-center">ফলাফল দেখো</h2>
        <p className="text-ink-soft text-sm mb-6 text-center">
          {examTitle ? `"${examTitle}"` : "পরীক্ষা"} শুরু করার সময় যেই নাম ও ফোন নাম্বার দিয়েছিলে সেটা দাও
        </p>
        <StorageWarning />
        <form onSubmit={handleLookup} className="space-y-4">
          <Input
            label="নাম"
            placeholder="তোমার নাম"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="ফোন নাম্বার"
            placeholder="01712345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="numeric"
            error={lookupError ?? undefined}
          />
          <Button type="submit" disabled={looking} className="w-full">
            {looking ? "খোঁজা হচ্ছে..." : "ফলাফল দেখো"}
          </Button>
        </form>
      </Card>
    );
  }

  if (loading) {
    return <Loader size="md" className="py-10" />;
  }

  if (ownError && !own) {
    return (
      <Card className="text-center py-10">
        <p className="text-danger mb-3">{ownError}</p>
        <Button variant="outline" onClick={loadOwnResult}>
          আবার চেষ্টা করো
        </Button>
      </Card>
    );
  }

  if (!own) {
    return <Loader size="md" className="py-10" />;
  }

  if (!own.submitted) {
    return (
      <Card className="text-center py-10">
        <p className="text-ink-soft">এই attempt এর উত্তর এখনো জমা দেওয়া হয়নি।</p>
      </Card>
    );
  }

  if (!own.visible) {
    return (
      <Card className="text-center py-10">
        <p className="text-ink-soft">উত্তর জমা হয়েছে। পরীক্ষা শেষ হওয়ার পর ফলাফল দেখতে পারবে।</p>
      </Card>
    );
  }

  const total = own.total ?? 0;
  const score = own.score ?? 0;
  const correct = review?.filter((q) => q.is_correct).length ?? score;
  const skipped = review?.filter((q) => q.is_skipped).length ?? 0;
  const wrong = total - correct - skipped;
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;

  function searchAnotherNumber() {
    // এই student এর URL থেকে attemptId সরিয়ে দাও, যাতে refresh করলে আবার এই
    // attempt auto-load না হয়ে যায় — কিন্তু localStorage এর collection থেকে
    // কিছু মোছা হচ্ছে না, কারণ এই একই ব্রাউজারে অন্য student দের attempt slot ও
    // ওখানে থাকতে পারে (shared-lab fix — একজনের "অন্য নাম্বার খোঁজো" চাপ যেন
    // কারো ডেটা মুছে না দেয়)।
    if (autoLoadFromStorage) {
      router.replace(`/result/${examId}`);
    }
    setAttemptId(null);
    setAccessToken(null);
    setOwn(null);
    setOwnError(null);
    setReview(null);
    setReviewError(null);
    setRows([]);
    setLeaderboardVisible(true);
    setLbStatus("idle");
    setName("");
    setPhone("");
    setShowReview(false);
  }

  return (
    <div className="space-y-8">
      <Card className="py-8">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-semibold text-ink">পরীক্ষা শেষ হয়েছে</h1>
          <p className="text-ink-soft mt-1">{own.student_name}, তোমার ফলাফল নিচে দেওয়া হলো</p>
          {own.student_institution && (
            <p className="text-ink-faint text-sm mt-0.5">{own.student_institution}</p>
          )}
          <button
            onClick={searchAnotherNumber}
            className="mt-2 text-sm text-ink-faint underline hover:text-ink-soft"
          >
            এটা তোমার ফলাফল না? অন্য নাম ও ফোন নাম্বার দিয়ে খোঁজো
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox label="প্রাপ্ত নম্বর" value={`${score}/${total}`} />
          <StatBox label="শতকরা হার" value={`${percent}%`} />
          <StatBox label="সঠিক" value={correct} tone="success" />
          <StatBox label="ভুল" value={wrong} tone="danger" />
          {skipped > 0 && <StatBox label="স্কিপ করা" value={skipped} />}
          {own.duration_seconds != null && (
            <StatBox label="সময় নিয়েছে" value={formatSeconds(own.duration_seconds)} />
          )}
        </div>
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={handleToggleReview} disabled={reviewLoading}>
            {showReview
              ? "উত্তরপত্র লুকাও"
              : reviewLoading
              ? "লোড হচ্ছে..."
              : "📋 উত্তরপত্র দেখো (কোনটা ভুল হয়েছে)"}
          </Button>
        </div>
      </Card>

      {showReview && (
        <div>
          <h2 className="font-display text-lg font-semibold text-ink mb-3">উত্তরপত্র পর্যালোচনা</h2>
          {reviewLoading && <Loader size="sm" className="py-6" />}
          {reviewError && <p className="text-center text-danger py-6">{reviewError}</p>}
          {review && <ReviewList questions={review} />}
        </div>
      )}

      <div ref={leaderboardSectionRef}>
        <h2 className="font-display text-lg font-semibold text-ink mb-3">লিডারবোর্ড</h2>
        {lbStatus === "idle" || lbStatus === "loading" ? (
          <Loader size="sm" className="py-6" />
        ) : lbStatus === "error" ? (
          <div className="text-center py-6">
            <p className="text-danger mb-2">লিডারবোর্ড লোড করা যায়নি</p>
            <button type="button" onClick={loadLeaderboard} className="text-sm font-semibold text-ink underline">
              আবার চেষ্টা করো
            </button>
          </div>
        ) : leaderboardVisible ? (
          <LeaderboardTable
            rows={rows}
            currentUser={
              own
                ? { student_name: own.student_name ?? "", score: score, duration_seconds: own.duration_seconds }
                : null
            }
          />
        ) : (
          <p className="text-center text-ink-soft">লিডারবোর্ড পরীক্ষা শেষ হওয়ার পর দেখা যাবে।</p>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, tone }: { label: string; value: string | number; tone?: "success" | "danger" }) {
  return (
    <div className="rounded-card border border-border bg-black/[0.02] px-3 py-4 text-center">
      <div
        className={`text-xl font-semibold ${
          tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-ink"
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-ink-soft mt-0.5">{label}</div>
    </div>
  );
}
