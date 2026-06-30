"use client";

import React, { useEffect, useRef, useState } from "react";

const INTERACTIVE_SELECTOR = "input,textarea,button,label,a,select,[data-no-drag-scroll]";

type DragScrollAreaProps = {
  children: React.ReactNode;
  className?: string;
};

export function DragScrollArea({ children, className = "" }: DragScrollAreaProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (event: MouseEvent) => {
      const start = panStartRef.current;
      const element = scrollRef.current;
      if (!start || !element) return;
      event.preventDefault();
      element.scrollLeft = start.left - (event.clientX - start.x);
      element.scrollTop = start.top - (event.clientY - start.y);
    };

    const onUp = () => {
      setDragging(false);
      panStartRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const onMouseDown = (event: React.MouseEvent) => {
    const element = scrollRef.current;
    if (!element) return;
    const target = event.target as HTMLElement;
    if (target.closest(INTERACTIVE_SELECTOR)) return;
    event.preventDefault();
    setDragging(true);
    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: element.scrollLeft,
      top: element.scrollTop,
    };
  };

  return (
    <div
      ref={scrollRef}
      className={`overscroll-contain ${dragging ? "cursor-grabbing select-none" : "cursor-grab"} ${className}`}
      onMouseDown={onMouseDown}
    >
      {children}
    </div>
  );
}
