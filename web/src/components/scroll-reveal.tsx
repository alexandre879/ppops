"use client";

import { useEffect } from "react";

const SELECTOR = ".reveal:not(.revealed), .reveal-group > :not(.revealed)";
const KEYFRAMES = [
  { opacity: 0, transform: "translateY(32px)" },
  { opacity: 1, transform: "none" },
];

/**
 * Slides `.reveal` elements (and the children of `.reveal-group`) in once, the first time they
 * scroll into view. They stay hidden only while the `js` class set in the layout is on <html>.
 * The animation does not stay applied after it ends, which keeps glass inside the element blurred.
 * Content added later (page navigation, project filters) is picked up by a MutationObserver.
 */
export function ScrollReveal() {
  useEffect(() => {
    (window as Window & { __nhmReveal?: boolean }).__nhmReveal = true;
    const pending = () => Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      const showAll = () => pending().forEach((el) => el.classList.add("revealed"));
      showAll();
      const mutations = new MutationObserver(showAll);
      mutations.observe(document.body, { childList: true, subtree: true });
      return () => mutations.disconnect();
    }

    const observed = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        let order = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          el.classList.add("revealed");
          el.animate(KEYFRAMES, {
            duration: 900,
            delay: Math.min(order++, 5) * 90,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "backwards",
          });
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    const scan = () => {
      for (const el of pending()) {
        if (observed.has(el)) continue;
        observed.add(el);
        io.observe(el);
      }
    };
    scan();
    let frame = 0;
    const mutations = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      io.disconnect();
    };
  }, []);

  return null;
}
