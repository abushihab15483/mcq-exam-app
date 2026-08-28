"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TimerBar from "@/components/student/TimerBar";
import ProgressBar from "@/components/student/ProgressBar";
import QuestionCard from "@/components/student/QuestionCard";
import MathProvider from "@/components/shared/MathProvider";
import MathJaxWarning from "@/components/shared/MathJaxWarning";
import StorageWarning from "@/components/shared/StorageWarning";
import { Button, Modal, Loader } from "@/components/ui";
import { computeAttemptDeadline } from "@/lib/time";
import { hasAnyMathContent } from "@/lib/math";
import { safeStorage } from "@/lib/safeStorage";
import { getAttempt, singleUnambiguousAttempt, updateAttempt } from "@/lib/attemptStorage";
import { beaconSubmitFinal, beaconSubmitIntent, pingSubmitIntent } from "@/lib/submitIntent";
import type { OptionKey, PublicQuestion } from "@/types";

interface AttemptInfo {
  attemptId: string;
  startedAt: string;
  durationMinutes: number;
  studentName: string;
  accessToken: string;
}

// Real Supabase data দিয়ে exam স্ক্রিন (Step 6):
// - attempt info + এখন পর্যন্ত দেওয়া উত্তর localStorage থেকে restore হয় (reload-safe)
// - প্রশ্ন GET /api/exams/[examId]/questions থেকে আসে (correct answer ছাড়া)
// - প্রতিটা উত্তর দেওয়ার সাথে সাথে localStorage এ সেভ হয়
// - সময় শেষ হলে (টাইমার দিয়ে বা reload করে দেখলে) স্বয়ংক্রিয়ভাবে POST /api/submit হয়
export default function ExamPage({ params }: { params: { examId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [attempt, setAttempt] = useState<AttemptInfo | null>(null);
  const [examTitle, setExamTitle] = useState("");
  // exam এর global end_time — UI এর timer/deadline এই ভ্যালু ছাড়া সঠিকভাবে দেখাতে পারবে না
  // (student এর duration exam এর end_time কে overflow করতে পারবে না, নিচে ব্যবহার হচ্ছে)
  const [examEndTime, setExamEndTime] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  // প্রশ্ন লোড করার সময় নেটওয়ার্ক/সার্ভার সমস্যা হলে — blank exam screen না
  // দেখিয়ে এই মেসেজ + retry বাটন দেখানো হয়। localStorage এ থাকা answers এতে
  // কখনো ছোঁয়া হয় না, তাই retry করলেই আগের উত্তর সহ প্রশ্ন আবার লোড হয়।
  const [loadError, setLoadError] = useState<string | null>(null);
  // Step 14 — 403/401 থেকে /questions ("exam বন্ধ", "attempt এর সময় শেষ",
  // "ইতিমধ্যে জমা হয়ে গেছে" ইত্যাদি definitive access decision) — এই স্টেট
  // সেট থাকলে UI লক হয়ে যায় আর কোনো auto-submit হয় না (নিচের render দেখো)।
  // loadError (5xx/network — transient, retryable) থেকে ইচ্ছাকৃতভাবে আলাদা।
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // useState(submitting) reset হয়ে যেতে পারে React batching/StrictMode এ — তাই আসল
  // "একবারই submit request পাঠানো হবে" গ্যারান্টিটা synchronous ref দিয়ে রাখা হচ্ছে,
  // যাতে ডাবল-ক্লিক বা timer-expiry + manual click একসাথে হলেও দুইটা request না যায়
  const submittingRef = useRef(false);
  // Step 13, Layer 3: deadline এর ঠিক আগে শুধু একটা lightweight intent ping
  // পাঠানো হয় (নিচের effect দেখো) — real/visible submit (UI lock, "জমা হচ্ছে"
  // দেখানো, redirect) না, শুধু server-এ এই মুহূর্তের answers snapshot freeze
  // করার জন্য। আসল submit শুধু TimerBar এর onExpire (ঠিক deadline এ, নিচে
  // দেখো) থেকেই আসে — আগে এই ref দিয়ে গার্ড করা পুরো submitExam() ই deadline
  // এর ১২ সেকেন্ড আগে ফায়ার হয়ে যেত, যার ফলে টাইমারে সময় বাকি থাকতেই
  // student এর উত্তর জমা হয়ে যাচ্ছিল ও সে confuse হচ্ছিল — সেই বাগ ফিক্স।
  const pingFiredRef = useRef(false);
  // pagehide/visibilitychange beacon handler-কে সবসময় সর্বশেষ answers/attempt
  // state দিতে হবে, কিন্তু listener বারবার attach/detach করতে চাই না —
  // তাই একটা ref এ current state sync রাখা হচ্ছে (stale closure এড়াতে)।
  const latestRef = useRef<{
    answers: Record<string, OptionKey>;
    attempt: AttemptInfo | null;
    unavailable: boolean;
  }>({
    answers: {},
    attempt: null,
    unavailable: false,
  });

  // একবার POST /api/submit — নিজে কোনো retry করে না, শুধু ফলাফলকে ৩ ভাগে ভাগ করে
  // দেয় যাতে submitExam ঠিক করতে পারে retry করা appropriate কিনা:
  // - success: সার্ভার confirm করেছে
  // - terminal: আবার একই request পাঠালেও ফলাফল বদলাবে না (deadline_passed,
  //   already-invalid attempt, ইত্যাদি) — retry করলে শুধু deadline bypass করার
  //   একটা ভুল চেষ্টা হতো, তাই এখানে retry করা হয় না
  // - retryable: network/৫xx/rate-limit — সাময়িক সমস্যা, আবার চেষ্টা করা নিরাপদ
  async function postSubmitOnce(
    attemptId: string,
    finalAnswers: Record<string, OptionKey>,
    accessToken: string
  ): Promise<
    | { kind: "success"; data: { access_token?: string } }
    | { kind: "terminal"; message: string }
    | { kind: "retryable"; message: string; retryAfterMs?: number }
  > {
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempt_id: attemptId, answers: finalAnswers, token: accessToken }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        return { kind: "success", data };
      }
      if (res.status === 429) {
        const retryAfterSeconds = Number(res.headers.get("Retry-After"));
        return {
          kind: "retryable",
          message: data?.error ?? "একটু বেশি চেষ্টা হয়ে গেছে",
          retryAfterMs: Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : undefined,
        };
      }
      if (res.status >= 500) {
        return { kind: "retryable", message: data?.error ?? "সার্ভারে সাময়িক সমস্যা" };
      }
      // 400/401/403/404 — যেমন "deadline_passed" — এগুলো terminal
      return { kind: "terminal", message: data?.error ?? "জমা দেওয়া যায়নি" };
    } catch {
      // fetch নিজেই fail করলো (offline/DNS/timeout) — retryable
      return { kind: "retryable", message: "ইন্টারনেট সংযোগ পাওয়া যায়নি" };
    }
  }

  const submitExam = useCallback(
    async (finalAnswers: Record<string, OptionKey>, attemptId: string, accessToken: string) => {
      if (submittingRef.current) return; // ইতিমধ্যে একটা submit চলছে — নতুন call উপেক্ষা করো
      submittingRef.current = true;
      setSubmitting(true);
      setSubmitError(null);

      // Step 13/17, Layer 2/7: আসল submit request পাঠানোর ঠিক আগে একটা ছোট/দ্রুত
      // intent ping পাঠানো হচ্ছে — এটা deadline এর আগে সার্ভারে পৌঁছালে
      // attempts.frozen_answers/frozen_answers_at এ DB-এর নিজের ঘড়ি দিয়ে এই
      // মুহূর্তের answers freeze হয়ে যায়, যেটা পরে /api/submit কে (যদি সেটার
      // বড় answers payload নেটওয়ার্ক delay-তে deadline এর একটু পরে পৌঁছায়)
      // একটা bounded technical buffer এর ভিতরে finalize করার সুযোগ দেয়।
      //
      // Step 17 fix: আগে এই ping fire-and-forget ছিল, আর সাথে সাথেই নিচের আসল
      // submit request চলে যেত — দুইটা প্রায় একই সময়ে network এ থাকায় কোনটা
      // আগে server এ পৌঁছাবে তার guarantee ছিল না (exact deadline মুহূর্তে
      // submit_attempt আগে পৌঁছে গেলে frozen snapshot ছাড়াই reject হয়ে যাওয়ার
      // ছোট সম্ভাবনা ছিল)। এখন ping-টা একটা bounded সময় (২ সেকেন্ড) পর্যন্ত
      // await করা হয় — সাধারণ (online) অবস্থায় ping সবসময় আগেই server এ
      // পৌঁছে/শেষ হয়, তাই request_submission সবসময় submit_attempt এর আগে চলে,
      // race window বন্ধ হয়ে যায়। ping ধীর/ব্যর্থ হলেও এই timeout এর পরই আসল
      // submit চলে যায় — কখনো পুরো submit flow আটকে থাকে না, শুধু বেশি ধীর
      // ক্ষেত্রে buffer সুবিধাটা পাওয়া না-ও যেতে পারে (আগের মতোই, block হয় না)।
      await Promise.race([
        pingSubmitIntent(attemptId, accessToken, finalAnswers),
        new Promise<void>((resolve) => setTimeout(resolve, 2000)),
      ]);

      // Auto-retry backoff — network blip এ answers হারায় না, সার্ভার confirm
      // না করা পর্যন্ত localStorage থেকে answers মোছা হয় না, আর "submitted"ও
      // দেখানো হয় না। মোট ~৩০ সেকেন্ড ধরে কয়েকবার চেষ্টা করে, তারপর থেমে যায়
      // (localStorage এ answers থেকেই যায়, নিচের বাটন দিয়ে আবার চেষ্টা করা যাবে)।
      const backoffMs = [1000, 2000, 4000, 8000, 15000];

      for (let attemptIndex = 0; ; attemptIndex++) {
        const result = await postSubmitOnce(attemptId, finalAnswers, accessToken);

        if (result.kind === "success") {
          // server confirm করার পরই localStorage clear + redirect — এর আগে না,
          // নাহলে network fail হলেও student এর answers হারিয়ে যেত
          safeStorage.remove(`mcq_answers_${attemptId}`);

          // submit response এ result access token আসে (দেখো lib/resultAccessToken.ts) —
          // এই attempt এর নিজের slot-এ merge করে রাখা হচ্ছে (অন্য কোনো student এর
          // slot না ছুঁয়ে), result page এই token ছাড়া /api/attempts/[attemptId]
          // বা .../review কল করতে পারবে না
          if (result.data?.access_token) {
            updateAttempt(params.examId, attemptId, { accessToken: result.data.access_token });
          }

          // attemptId URL এ বহন করে নিয়ে যাওয়া হচ্ছে, যাতে result page ঠিক এই
          // student এর ফলাফলই দেখায় — অন্য কেউ পরে একই ব্রাউজারে submit করলেও
          // এই ট্যাব ভুল ফলাফল দেখাবে না
          router.push(`/result/${params.examId}?a=${encodeURIComponent(attemptId)}`);
          return;
        }

        if (result.kind === "terminal") {
          // deadline সত্যিই পার হয়ে গেছে (বা অন্য terminal error) — retry করে
          // কোনো লাভ নেই, deadline পিছনে যাবে না। student কে মিথ্যা করে
          // "submit হয়েছে" বলা হচ্ছে না, answers localStorage এ অক্ষত থাকে।
          submittingRef.current = false;
          setSubmitting(false);
          setSubmitError(result.message);
          return;
        }

        // retryable — সাময়িক সমস্যা
        if (attemptIndex >= backoffMs.length) {
          // retry শেষ — থেমে যাচ্ছি, কিন্তু answers এখনো localStorage এ নিরাপদ,
          // student নিচের বাটনে চাপ দিয়ে আবার (নতুন করে retry loop শুরু) চেষ্টা করতে পারবে
          submittingRef.current = false;
          setSubmitting(false);
          setSubmitError("জমা দেওয়া যায়নি — ইন্টারনেট সমস্যা হতে পারে। তোমার উত্তর সেভ আছে, আবার চেষ্টা করো।");
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, result.retryAfterMs ?? backoffMs[attemptIndex]));
        // loop চলতে থাকে — submitting/submittingRef true-ই থাকে, তাই এর মধ্যে
        // ডাবল-ক্লিক বা timer-expiry থেকে আরেকটা submit শুরু হয় না
      }
    },
    [params.examId, router]
  );

  // প্রশ্ন লোড — retry বাটন থেকে আবার কল করা যায় বলে আলাদা function হিসেবে রাখা।
  // fetch নিজে fail করলে (offline/timeout/DNS) — আগে এটা ধরা পড়তো না, exam page
  // ০টা প্রশ্ন নিয়ে silently render হয়ে যেত। এখন সেটা catch করে loadError সেট
  // করা হয়, answers/attempt state অক্ষত থাকে।
  const loadQuestions = useCallback(
    async (info: AttemptInfo, savedAnswers: Record<string, OptionKey>) => {
      setLoadError(null);
      setUnavailableMessage(null);
      try {
        const res = await fetch(
          `/api/exams/${params.examId}/questions?attempt_id=${encodeURIComponent(info.attemptId)}&token=${encodeURIComponent(info.accessToken)}`
        );
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          // Step 14 — Critical fix: a 403/401 here means the server has
          // definitively decided this attempt cannot see questions right
          // now — exam window closed by admin, attempt already submitted,
          // or this attempt's own deadline has passed. It does NOT mean
          // "submit whatever is in localStorage" — a stale tab reloading
          // after admin closes the exam must never silently fire a
          // submission with incomplete/stale local answers. We lock the UI
          // and show the server's own message instead.
          //
          // A 5xx here is a different situation — transient server/DB
          // trouble, not a definitive access decision — so that still goes
          // through the existing retryable loadError UI (never auto-submit
          // either way, just don't treat it as "closed").
          if (res.status >= 500) {
            setLoadError("সার্ভারে সাময়িক সমস্যা হয়েছে। আপনার উত্তরগুলো এই ডিভাইসে সংরক্ষিত আছে। আবার চেষ্টা করুন।");
          } else {
            setUnavailableMessage(data?.error ?? "এই মুহূর্তে পরীক্ষা লভ্য নয়।");
          }
          return;
        }
        setExamTitle(data?.exam?.title ?? "");
        setExamEndTime(data?.exam?.end_time ?? null);
        setQuestions(data?.questions ?? []);

        // Tab বন্ধ করে সময় শেষ হওয়ার পর আবার খুললে — যা উত্তর সেভ ছিল তা দিয়েই auto-submit।
        // এখানে data.exam.end_time সরাসরি ব্যবহার করা হচ্ছে (state update async বলে
        // examEndTime state তখনো আপডেট হয়নি) — deadline = MIN(শুরু+duration, exam শেষ)
        const deadline = computeAttemptDeadline(info.startedAt, info.durationMinutes, data?.exam?.end_time);
        if (Date.now() >= deadline) {
          submitExam(savedAnswers, info.attemptId, info.accessToken);
        }
      } catch {
        // network fail — কোনো state clear হয়নি, answers localStorage এ নিরাপদ
        setLoadError("নেটওয়ার্কে সমস্যা হয়েছে। আপনার উত্তরগুলো এই ডিভাইসে সংরক্ষিত আছে। আবার চেষ্টা করুন।");
      } finally {
        setLoading(false);
      }
    },
    [params.examId, submitExam]
  );

  useEffect(() => {
    // Shared-lab fix: which attempt this tab belongs to is resolved from the
    // attemptId in the URL first (set by EntryForm/resume flow) — that way
    // two students on two tabs of the same browser never read/clobber each
    // other's session. Only if the URL has no attemptId (an old bookmark
    // from before this fix) do we fall back to "the one unfinished attempt
    // on this browser", and only when that's truly unambiguous — never
    // throws on missing/corrupted/old-schema data.
    const attemptIdParam = searchParams.get("a");
    const info = attemptIdParam
      ? getAttempt(params.examId, attemptIdParam)
      : singleUnambiguousAttempt(params.examId);

    if (!info || !info.attemptId || !info.startedAt || info.durationMinutes == null || !info.studentName) {
      router.replace(`/exam`);
      return;
    }
    const fullInfo: AttemptInfo = {
      attemptId: info.attemptId,
      startedAt: info.startedAt,
      durationMinutes: info.durationMinutes,
      studentName: info.studentName,
      accessToken: info.accessToken,
    };
    setAttempt(fullInfo);

    const savedAnswers = safeStorage.getJSON<Record<string, OptionKey>>(
      `mcq_answers_${fullInfo.attemptId}`,
      {}
    );
    setAnswers(savedAnswers);

    loadQuestions(fullInfo, savedAnswers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.examId, searchParams]);

  // latestRef সবসময় সবচেয়ে সাম্প্রতিক answers/attempt ধরে রাখে, যাতে নিচের
  // pagehide/beacon effect (যেটা mount এ একবারই attach হয়) stale answers না পাঠায়
  useEffect(() => {
    latestRef.current = { answers, attempt, unavailable: unavailableMessage !== null };
  }, [answers, attempt, unavailableMessage]);

  // Step 13, Layer 3 — pre-deadline intent ping (fix)। deadline এর ~১২ সেকেন্ড
  // আগে শুধু একটা lightweight ping (pingSubmitIntent) পাঠানো হয়, যাতে server-এ
  // এই মুহূর্তের answers snapshot আগেভাগেই freeze হয়ে থাকতে পারে — এটা কোনো
  // UI state (submitting/disabled বাটন) ছোঁয় না, student নিশ্চিন্তে টাইমার
  // চলাকালীন উত্তর দিতে/বদলাতে থাকতে পারে। আসল, দৃশ্যমান submit (UI lock করা,
  // "জমা হচ্ছে" দেখানো, ফলাফল পেজে redirect) শুধু TimerBar এর onExpire থেকেই
  // আসে — অর্থাৎ ঠিক deadline এ, তার আগে না। (আগে এখানে পুরো submitExam() ই
  // ডাকা হতো, যার ফলে টাইমারে ১২ সেকেন্ড বাকি থাকতেই উত্তর জমা হয়ে যেত এবং
  // student বিভ্রান্ত হতো — এটা সেই বাগের ফিক্স।)
  useEffect(() => {
    if (!attempt || questions.length === 0 || unavailableMessage) return;
    const PING_LEAD_MS = 12_000;
    const deadlineMs = computeAttemptDeadline(attempt.startedAt, attempt.durationMinutes, examEndTime);
    const fireAt = deadlineMs - PING_LEAD_MS;
    const msUntilFire = fireAt - Date.now();

    if (pingFiredRef.current) return;
    if (msUntilFire <= 0) {
      // পেজ লোড হতেই already lead window এর ভিতরে (যেমন reload করে ফেরত এলে) —
      // সাথে সাথেই ping পাঠানো উচিত, timer এর জন্য অপেক্ষা না করে। এটা এখনো
      // শুধু ping, submit না — সময় সত্যিই পার হয়ে থাকলে সেটা loadQuestions এ
      // আলাদাভাবে ধরা হয় (উপরে দেখো)।
      pingFiredRef.current = true;
      pingSubmitIntent(attempt.attemptId, attempt.accessToken, latestRef.current.answers);
      return;
    }

    const timer = setTimeout(() => {
      pingFiredRef.current = true;
      pingSubmitIntent(attempt.attemptId, attempt.accessToken, latestRef.current.answers);
    }, msUntilFire);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, examEndTime, questions.length, unavailableMessage]);

  // Step 13, Layer 6 — sendBeacon backup। ট্যাব বন্ধ হওয়া/নেভিগেট করা/hidden
  // হওয়ার মুহূর্তে normal fetch ব্রাউজার cancel করে দিতে পারে — sendBeacon
  // আলাদা transport যেটা এরকম মুহূর্তেও delivery চেষ্টা চালিয়ে যায় (guaranteed
  // না, শুধু best-effort সাপ্লিমেন্ট, primary retry loop-এর বিকল্প না)। ইতিমধ্যে
  // submit সফল/চলমান থাকলে, বা exam ইতিমধ্যে unavailable/closed হিসেবে চিহ্নিত
  // হয়ে গেলে (Step 14) — এখানে কিছু পাঠানো হয় না (backend এমনিতেই reject
  // করবে, কিন্তু অপ্রয়োজনীয় request না পাঠানোই ভালো)।
  useEffect(() => {
    function handlePageHide() {
      const { answers: currentAnswers, attempt: currentAttempt, unavailable } = latestRef.current;
      if (!currentAttempt || submittingRef.current || unavailable) return;
      beaconSubmitIntent(currentAttempt.attemptId, currentAttempt.accessToken, currentAnswers);
      if (Object.keys(currentAnswers).length > 0) {
        beaconSubmitFinal(currentAttempt.attemptId, currentAnswers, currentAttempt.accessToken);
      }
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") handlePageHide();
    }
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  function handleSelect(questionId: string, option: OptionKey) {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: option };
      if (attempt) safeStorage.setJSON(`mcq_answers_${attempt.attemptId}`, next);
      return next;
    });
  }

  // MathJax (~1.2MB script + fonts) শুধু তখনই load করা হবে যখন এই exam এর
  // অন্তত একটা প্রশ্ন/option এ সত্যিই math ($...$) আছে — নাহলে (ইংরেজি/বাংলা/
  // ইতিহাসের মতো non-math exam) student শুধু শুধু ভারী ফাইল download করত।
  // *** Rules of Hooks: এই useMemo সব conditional early-return (নিচে
  // loading/unavailable/loadError) এর আগে বসানো — নাহলে render-ভেদে hook call
  // এর সংখ্যা/ক্রম বদলে যেত, যেটা React এ crash করায়। questions খালি থাকলে
  // (এখনো লোড হয়নি) examHasMath স্বাভাবিকভাবেই false থাকে, প্রশ্ন লোড হওয়ার পর
  // সঠিক মান বসে — কোনো আলাদা guard লাগে না।
  const examHasMath = useMemo(
    () =>
      questions.some((q) =>
        hasAnyMathContent([q.question_text, q.option_a, q.option_b, q.option_c, q.option_d])
      ),
    [questions]
  );

  if (loading || !attempt) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-8">
        <Loader fullPage size="lg" />
      </main>
    );
  }

  // Step 14 — /questions থেকে 403/401 (exam admin বন্ধ করে দিয়েছে, attempt
  // আগেই জমা হয়ে গেছে, বা attempt এর নিজের সময় শেষ) — এটা একটা definitive,
  // server-decided অবস্থা, retry করলে বদলাবে না। তাই এখানে (retry বাটন সহ
  // loadError স্ক্রিনের বদলে) UI পুরোপুরি লক করে দেওয়া হচ্ছে — কোনো auto-submit
  // না, উত্তর এডিট করার বা জমা দেওয়ার কোনো উপায় না। localStorage এ যা answers
  // সেভ ছিল তা কখনো ছোঁয়া হয়নি, নিরাপদে থেকেই যায়, কিন্তু silently জমা দেওয়া
  // হয় না — server নিজেই status/deadline অনুযায়ী পুরো সিদ্ধান্ত নেয়।
  if (unavailableMessage) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-8">
        <div className="rounded-card border border-danger/30 bg-danger/5 px-4 py-4 text-sm text-danger" role="alert">
          <p className="font-semibold">এই পরীক্ষা এখন আর লভ্য নয়।</p>
          <p className="mt-1">{unavailableMessage}</p>
        </div>
      </main>
    );
  }

  // প্রশ্ন লোড fail করেছে (network/server) এবং কিছুই এখনো দেখানোর মতো নেই —
  // blank exam এর বদলে স্পষ্ট মেসেজ + retry। উত্তর সেভ করা থাকলে (আগের সেশন
  // থেকে) হারায়নি, retry করলেই আবার প্রশ্ন সহ দেখা যাবে।
  if (loadError && questions.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-8">
        <div className="rounded-card border border-danger/30 bg-danger/5 px-4 py-4 text-sm text-danger" role="alert">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              loadQuestions(attempt, answers);
            }}
            className="mt-2 font-semibold underline"
          >
            আবার চেষ্টা করো
          </button>
        </div>
      </main>
    );
  }

  const deadline = computeAttemptDeadline(attempt.startedAt, attempt.durationMinutes, examEndTime);
  // TimerBar এর progress-bar % ঠিকভাবে দেখানোর জন্য — student এর নিজের duration আর
  // exam এর global end_time এর মধ্যে যেটা আগে আসে সেই clamp করা সময়টাই "totalSeconds"
  // হওয়া উচিত, নাহলে exam.end_time এর কারণে সময় কমে গেলে progress bar শুরুতেই কম দেখাত
  const totalSeconds = Math.max(0, Math.round((deadline - new Date(attempt.startedAt).getTime()) / 1000));
  const answeredCount = Object.keys(answers).length;
  const total = questions.length;

  const examBody = (
      <main className="mx-auto max-w-2xl px-6 py-8">
        <div className="sticky top-0 z-10 -mx-6 mb-6 bg-paper/95 px-6 py-4">
          <StorageWarning />
          {/* examHasMath false হলে MathProvider mount-ই হয় না, তাই useMathStatus()
              সবসময় default context value ("loading") ফেরত দেবে, কখনো "failed" না —
              MathJaxWarning এমনিতেই status !== "failed" এ null রেন্ডার করে (দেখো
              MathJaxWarning.tsx), তাই এখানে আলাদা করে কিছু করা লাগছে না। */}
          {examHasMath && <MathJaxWarning />}
          <h1 className="font-display text-lg font-semibold text-ink mb-3">{examTitle}</h1>
          <div className="grid grid-cols-2 gap-6">
            <TimerBar
              deadline={deadline}
              totalSeconds={totalSeconds}
              onExpire={() => submitExam(answers, attempt.attemptId, attempt.accessToken)}
            />
            <ProgressBar answered={answeredCount} total={total} />
          </div>
        </div>

        <div className="space-y-5">
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              total={total}
              selected={answers[q.id] ?? null}
              onSelect={(opt) => handleSelect(q.id, opt)}
            />
          ))}
        </div>

        <div className="mt-8 flex flex-col items-end gap-2">
          {submitting && (
            <div
              role="status"
              className="w-full rounded-card border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-ink-soft"
            >
              জমা দেওয়া হচ্ছে — এই সময় পেজ বন্ধ করবেন না।
            </div>
          )}
          {submitError && !confirmOpen && (
            <div className="w-full rounded-card border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
              <p>{submitError}</p>
              <button
                type="button"
                onClick={() => submitExam(answers, attempt.attemptId, attempt.accessToken)}
                className="mt-1 font-semibold underline"
              >
                আবার চেষ্টা করো
              </button>
            </div>
          )}
          <Button onClick={() => setConfirmOpen(true)} disabled={submitting}>
            {submitting ? "জমা হচ্ছে..." : "উত্তর জমা দাও"}
          </Button>
        </div>

        <Modal open={confirmOpen} onClose={() => (submitting ? null : setConfirmOpen(false))} title="উত্তর জমা দিবে?">
          <p className="text-ink-soft mb-1">
            তুমি {total} টার মধ্যে {answeredCount} টা প্রশ্নের উত্তর দিয়েছ।
          </p>
          <p className="text-ink-soft mb-6">জমা দেওয়ার পর আর উত্তর পরিবর্তন করা যাবে না।</p>
          {submitting && (
            <p role="status" className="mb-4 text-sm text-ink-soft">
              জমা দেওয়া হচ্ছে — এই সময় পেজ বন্ধ করবেন না।
            </p>
          )}
          {submitError && (
            <p role="alert" className="mb-4 text-sm text-danger">
              {submitError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" disabled={submitting} onClick={() => setConfirmOpen(false)}>
              আরও দেখি
            </Button>
            <Button variant="danger" disabled={submitting} onClick={() => submitExam(answers, attempt.attemptId, attempt.accessToken)}>
              {submitting ? "জমা হচ্ছে..." : submitError ? "আবার চেষ্টা করো" : "উত্তর জমা দাও"}
            </Button>
          </div>
        </Modal>
      </main>
  );

  // examHasMath true হলেই শুধু MathProvider mount হয় (MathJax script load হয়) —
  // pure-text exam এ এই wrapper-ই কখনো render হয় না, তাই script কখনো request-ই
  // হয় না। examBody এর ভিতরের JSX অপরিবর্তিত (আগের মতোই), শুধু বাইরের wrapper-টা
  // এখন conditional।
  return examHasMath ? <MathProvider>{examBody}</MathProvider> : examBody;
}
