// Small, dependency-free helpers used by MathRenderer (Issue #10 fix).
//
// Kept deterministic and side-effect-free on purpose: these run on every
// question/option on every exam page, and the fallback path in particular
// must never throw — a broken render here would defeat the whole point of
// having a fallback.

// Matches MathProvider's configured inline-math delimiter: tex.inlineMath = [["$", "$"]].
// A pair of "$" with at least one character between them.
const INLINE_MATH_PATTERN = /\$[^$]+\$/;

/**
 * Does this text contain anything that MathJax would actually try to
 * typeset? Plain option/question text (the common case) skips MathJax
 * entirely — faster, and one less thing that can go wrong for text that
 * was never math in the first place.
 */
export function hasMathContent(text: string): boolean {
  if (!text) return false;
  return INLINE_MATH_PATTERN.test(text);
}

/**
 * Does ANY of these texts contain math? Used once per exam (over every
 * question_text + option_a..d) to decide whether MathJax needs to be loaded
 * at all for this exam — a pure-text exam (English/Bangla/history MCQ) never
 * pays for the ~1.2MB MathJax script + fonts. Same detection rule as
 * hasMathContent (single source of truth), just applied to many strings —
 * short-circuits on the first match.
 */
export function hasAnyMathContent(texts: (string | null | undefined)[]): boolean {
  return texts.some((t) => !!t && hasMathContent(t));
}

/**
 * Readable, safe fallback for when MathJax is unavailable (CDN/local asset
 * failed, load timed out, etc). We deliberately keep this simple:
 *   - strip the "$" delimiters so raw text doesn't look like a formatting
 *     glitch (e.g. "$x^2+1$" -> "x^2+1")
 *   - do nothing else — no LaTeX-to-text parsing, nothing that could throw
 *     on unusual input. The goal is "still readable", not "still typeset".
 *
 * This is plain text, always rendered as React children (never
 * dangerouslySetInnerHTML), so it's inherently XSS-safe regardless of
 * what a question author puts in it.
 */
export function plainMathFallback(text: string): string {
  if (!text) return text;
  return text.replace(/\$/g, "");
}
