"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface FlowSequenceProps {
  children: ReactNode;
  className?: string;
}

export function FlowSequence({
  children,
  className = "",
}: FlowSequenceProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      node.dataset.active = "true";
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        node.dataset.active = "true";
        observer.disconnect();
      },
      { threshold: 0.25, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`lp-flow-sequence ${className}`}>
      {children}
    </div>
  );
}
