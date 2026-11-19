import { useEffect, useRef } from 'react';

const SPARK_COLORS = [
  '#7c3aed', // vivid violet-600
  '#ec4899', // vibrant pink-500
  '#f59e0b', // bright amber-500
  '#d946ef', // bright fuchsia-500
  '#f43f5e', // crisp rose-500
  '#8b5cf6', // bright violet-500
];

const RAY_COUNT = 6;
const DOT_COUNT = 4;
const MAX_ACTIVE_BURSTS = 10;

/**
 * Ultra-lightweight, GPU-composited global click spark effect.
 * Uses direct DOM manipulation inside a `contain: strict` overlay so clicks
 * never trigger React re-renders or layout reflows.
 */
export function ClickSparkEffect() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handlePointerDown = (e: PointerEvent) => {
      // Only trigger on primary click / touch (ignore right-click)
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (reducedMotionQuery.matches) return;

      // Keep DOM bounded during rapid clicking
      while (container.childElementCount >= MAX_ACTIVE_BURSTS) {
        container.firstElementChild?.remove();
      }

      const burst = document.createElement('div');
      burst.className = 'click-spark-burst';
      burst.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;

      // Crisp glowing expanding ring
      const ring = document.createElement('span');
      ring.className = 'click-spark-ring';
      burst.appendChild(ring);

      const baseAngleDeg = Math.random() * 60;

      // 6 crisp radiating spark rays
      for (let i = 0; i < RAY_COUNT; i++) {
        const ray = document.createElement('span');
        ray.className = 'click-spark-ray';
        const deg = baseAngleDeg + (i * 360) / RAY_COUNT + (Math.random() - 0.5) * 14;
        const color = SPARK_COLORS[i % SPARK_COLORS.length];

        ray.style.setProperty('--rot', `${deg.toFixed(1)}deg`);
        ray.style.backgroundColor = color;
        ray.style.boxShadow = `0 0 8px ${color}`;
        burst.appendChild(ray);
      }

      // 4 sparkling jewel dots / diamonds between the rays
      for (let i = 0; i < DOT_COUNT; i++) {
        const dot = document.createElement('span');
        dot.className = i % 2 === 0 ? 'click-spark-dot click-spark-diamond' : 'click-spark-dot';

        const angleRad =
          ((baseAngleDeg + 30 + (i * 360) / DOT_COUNT + (Math.random() - 0.5) * 18) * Math.PI) / 180;
        const distance = 26 + Math.random() * 14;
        const tx = Math.cos(angleRad) * distance;
        const ty = Math.sin(angleRad) * distance;
        const size = i % 2 === 0 ? 7 : 6;
        const color = SPARK_COLORS[(i + 2) % SPARK_COLORS.length];

        dot.style.setProperty('--tx', `${tx.toFixed(1)}px`);
        dot.style.setProperty('--ty', `${ty.toFixed(1)}px`);
        dot.style.setProperty('--rot', `${(Math.random() * 90).toFixed(0)}deg`);
        dot.style.width = `${size}px`;
        dot.style.height = `${size}px`;
        dot.style.backgroundColor = color;
        dot.style.boxShadow = `0 0 9px ${color}`;

        burst.appendChild(dot);
      }

      container.appendChild(burst);

      window.setTimeout(() => {
        burst.remove();
      }, 580);
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  return <div ref={containerRef} className="click-spark-root" aria-hidden="true" />;
}

export default ClickSparkEffect;
