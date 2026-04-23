"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Position = {
  x: number;
  y: number;
};

const BUTTON_WIDTH = 220;
const BUTTON_HEIGHT = 72;
const EDGE_MARGIN = 16;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function FloatingAiChatButton() {
  const pathname = usePathname();
  const hiddenPrefixes = [
    "/ai-chat",
    "/admin",
    "/delivery",
    "/vendor",
    "/login",
    "/signup",
  ];

  const shouldHide = hiddenPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<Position>({
    x: 0,
    y: 0,
  });
  const [dragging, setDragging] = useState(false);

  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);

  useEffect(() => {
    setMounted(true);

    const saved = window.localStorage.getItem("meramot-ai-chat-position");

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Position;
        setPosition(parsed);
        return;
      } catch {
        // ignore broken saved data
      }
    }

    setPosition({
      x: window.innerWidth - BUTTON_WIDTH - EDGE_MARGIN,
      y: window.innerHeight - BUTTON_HEIGHT - EDGE_MARGIN,
    });
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(
      "meramot-ai-chat-position",
      JSON.stringify(position)
    );
  }, [position, mounted]);

  useEffect(() => {
    function keepInsideViewport() {
      setPosition((prev) => ({
        x: clamp(
          prev.x,
          EDGE_MARGIN,
          window.innerWidth - BUTTON_WIDTH - EDGE_MARGIN
        ),
        y: clamp(
          prev.y,
          EDGE_MARGIN,
          window.innerHeight - BUTTON_HEIGHT - EDGE_MARGIN
        ),
      }));
    }

    window.addEventListener("resize", keepInsideViewport);
    return () => window.removeEventListener("resize", keepInsideViewport);
  }, []);

  function startDrag(clientX: number, clientY: number) {
    movedRef.current = false;
    setDragging(true);
    dragOffsetRef.current = {
      x: clientX - position.x,
      y: clientY - position.y,
    };
  }

  function updateDrag(clientX: number, clientY: number) {
    const nextX = clamp(
      clientX - dragOffsetRef.current.x,
      EDGE_MARGIN,
      window.innerWidth - BUTTON_WIDTH - EDGE_MARGIN
    );
    const nextY = clamp(
      clientY - dragOffsetRef.current.y,
      EDGE_MARGIN,
      window.innerHeight - BUTTON_HEIGHT - EDGE_MARGIN
    );

    movedRef.current = true;
    setPosition({ x: nextX, y: nextY });
  }

  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      if (!dragging) return;
      updateDrag(event.clientX, event.clientY);
    }

    function onMouseUp() {
      if (!dragging) return;
      setDragging(false);
    }

    function onTouchMove(event: TouchEvent) {
      if (!dragging || event.touches.length === 0) return;
      const touch = event.touches[0];
      updateDrag(touch.clientX, touch.clientY);
    }

    function onTouchEnd() {
      if (!dragging) return;
      setDragging(false);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [dragging]);

  if (shouldHide || !mounted) return null;

  return (
    <div
      className="fixed z-[90]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <Link
        href="/ai-chat"
        aria-label="Open AI chat"
        draggable={false}
        onClick={(event) => {
          if (movedRef.current) {
            event.preventDefault();
            movedRef.current = false;
          }
        }}
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          startDrag(event.clientX, event.clientY);
        }}
        onTouchStart={(event) => {
          if (event.touches.length === 0) return;
          const touch = event.touches[0];
          startDrag(touch.clientX, touch.clientY);
        }}
        className={`group flex items-center gap-3 rounded-full bg-[#214c34] px-4 py-3 text-white shadow-[0_12px_30px_rgba(36,66,41,0.28)] ring-1 ring-white/10 transition ${
          dragging
            ? "cursor-grabbing select-none"
            : "cursor-grab hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(36,66,41,0.38)]"
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/16 ring-1 ring-white/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 10h.01M12 10h.01M15 10h.01M8.4 18.2 4 20l1.6-4.1A8 8 0 1 1 20 12"
            />
          </svg>
        </div>

        <div className="hidden sm:block">
          <p className="text-sm font-semibold leading-4">AI Help Chat</p>
          <p className="mt-1 text-xs text-white/80">
            Ask repair questions instantly
          </p>
        </div>
      </Link>
    </div>
  );
}