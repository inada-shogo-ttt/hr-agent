"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "scale" | "spin";
  distance?: number;
  duration?: number;
}

export function Reveal({
  children,
  delay = 0,
  className = "",
  direction = "up",
  distance = 34,
  duration = 850,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const style = {
    "--reveal-delay": `${delay}ms`,
    "--reveal-distance": `${distance}px`,
    "--reveal-distance-negative": `${distance * -1}px`,
    "--reveal-duration": `${duration}ms`,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={`lp-reveal ${className}`}
      data-visible={visible ? "true" : "false"}
      data-direction={direction}
      style={style}
    >
      {children}
    </div>
  );
}
