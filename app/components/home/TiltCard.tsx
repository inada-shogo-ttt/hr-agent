"use client";

import {
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
}

export function TiltCard({
  children,
  className = "",
  intensity = 7,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const reset = () => {
    const node = ref.current;
    if (!node) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      node.style.setProperty("--tilt-x", "0deg");
      node.style.setProperty("--tilt-y", "0deg");
      node.style.setProperty("--glare-x", "50%");
      node.style.setProperty("--glare-y", "50%");
      node.classList.remove("is-tilting");
    });
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      node.style.setProperty("--tilt-x", `${(0.5 - y) * intensity}deg`);
      node.style.setProperty("--tilt-y", `${(x - 0.5) * intensity}deg`);
      node.style.setProperty("--glare-x", `${x * 100}%`);
      node.style.setProperty("--glare-y", `${y * 100}%`);
      node.classList.add("is-tilting");
    });
  };

  return (
    <div
      ref={ref}
      className={`lp-tilt-card ${className}`}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      onBlur={reset}
    >
      {children}
    </div>
  );
}
