"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

// Issue #10 fix — belt-and-suspenders safety net around <MathJax>.
//
// better-react-mathjax's own async typesetting failures don't actually
// reach here (they surface as unhandled promise rejections, not React
// render errors — the library already leaves the original text visible in
// that case). But a few paths in the library *do* throw synchronously
// inside an effect (e.g. "MathJax was not loaded" if this is ever used
// outside a MathProvider), and synchronous effect throws do propagate to
// the nearest error boundary. Catching those here means a single bad
// question can never take down the rest of the exam page.
export default class MathErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("MathJax render failed, falling back to plain text:", error);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
