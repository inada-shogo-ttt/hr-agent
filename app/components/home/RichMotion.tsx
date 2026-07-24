"use client";

import { useEffect } from "react";

export function RichMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const header = document.querySelector<HTMLElement>("[data-lp-header]");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");
    let scrollFrame = 0;
    let pointerFrame = 0;
    let pointerX = 0.5;
    let pointerY = 0.35;

    const updateScroll = () => {
      scrollFrame = 0;
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      const progress = Math.min(window.scrollY / maxScroll, 1);
      root.style.setProperty("--lp-progress", progress.toFixed(4));
      root.style.setProperty("--lp-scroll-y", `${window.scrollY}px`);
      root.style.setProperty("--lp-ribbon-a", `${progress * -60}px`);
      root.style.setProperty("--lp-ribbon-b", `${progress * -100}px`);
      root.style.setProperty("--lp-use-case-shift", `${progress * -120}px`);
      header?.classList.toggle("is-scrolled", window.scrollY > 18);
    };

    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(updateScroll);
    };

    const updatePointer = () => {
      pointerFrame = 0;
      root.style.setProperty("--lp-mx", `${(pointerX * 100).toFixed(2)}%`);
      root.style.setProperty("--lp-my", `${(pointerY * 100).toFixed(2)}%`);
      root.style.setProperty("--lp-pointer-x", (pointerX - 0.5).toFixed(4));
      root.style.setProperty("--lp-pointer-y", (pointerY - 0.5).toFixed(4));
      root.style.setProperty("--lp-shift-x", `${(pointerX - 0.5) * 36}px`);
      root.style.setProperty("--lp-shift-y", `${(pointerY - 0.5) * 30}px`);
      root.style.setProperty("--lp-shift-x-inverse", `${(0.5 - pointerX) * 42}px`);
      root.style.setProperty("--lp-shift-y-inverse", `${(0.5 - pointerY) * 32}px`);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!finePointer.matches || reducedMotion.matches) return;
      pointerX = event.clientX / Math.max(window.innerWidth, 1);
      pointerY = event.clientY / Math.max(window.innerHeight, 1);
      if (!pointerFrame) {
        pointerFrame = window.requestAnimationFrame(updatePointer);
      }
    };

    updateScroll();
    updatePointer();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
      header?.classList.remove("is-scrolled");
    };
  }, []);

  return (
    <>
      <div className="lp-progress" aria-hidden>
        <span />
      </div>
      <div className="lp-cursor-glow" aria-hidden />
    </>
  );
}
