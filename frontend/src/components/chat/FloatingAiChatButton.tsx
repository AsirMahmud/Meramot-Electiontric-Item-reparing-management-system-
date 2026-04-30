"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Position = {
  x: number;
  y: number;
};

const EDGE_MARGIN = 12;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function FloatingAiChatButton() {
  const pathname = usePathname();
  const userPagePrefixes = [
    "/",
    "/shops",
    "/cart",
    "/orders",
    "/profile",
    "/requests",
    "/checkout",
  ];

  const blockedPrefixes = [
    "/ai-chat",
    "/login",
    "/signup",
    "/register",
    "/admin",
    "/vendor",
    "/delivery",
    "/delivery-admin",
  ];

  const isBlockedPage = blockedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  const isUserPage = userPagePrefixes.some((prefix) => {
    if (prefix === "/") return pathname === "/";
    return pathname === prefix || pathname.startsWith(prefix + "/");
  });

  const shouldHide = isBlockedPage || !isUserPage;

  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const buttonRef = useRef<HTMLAnchorElement>(null);

  const getBounds = useCallback(() => {
    if (buttonRef.current) {
      return {
        width: buttonRef.current.offsetWidth,
        height: buttonRef.current.offsetHeight,
      };
    }
    return { width: 140, height: 48 }; // safe fallback
  }, []);

  const clampToViewport = useCallback(
    (pos: Position) => {
      const b = getBounds();
      return {
        x: clamp(pos.x, EDGE_MARGIN, window.innerWidth - b.width - EDGE_MARGIN),
        y: clamp(pos.y, EDGE_MARGIN, window.innerHeight - b.height - EDGE_MARGIN),
      };
    },
    [getBounds]
  );

  // Mount + restore saved position
  useEffect(() => {
    setMounted(true);

    const saved = window.localStorage.getItem("meramot-ai-chat-position");
    let initial: Position;

    if (saved) {
      try {
        initial = JSON.parse(saved) as Position;
      } catch {
        initial = {
          x: window.innerWidth - 160 - EDGE_MARGIN,
          y: window.innerHeight - 56 - EDGE_MARGIN,
        };
      }
    } else {
      initial = {
        x: window.innerWidth - 160 - EDGE_MARGIN,
        y: window.innerHeight - 56 - EDGE_MARGIN,
      };
    }

    // Defer clamp until after first paint so buttonRef is measured
    requestAnimationFrame(() => {
      const b = buttonRef.current
        ? { width: buttonRef.current.offsetWidth, height: buttonRef.current.offsetHeight }
        : { width: 140, height: 48 };
      setPosition({
        x: clamp(initial.x, EDGE_MARGIN, window.innerWidth - b.width - EDGE_MARGIN),
        y: clamp(initial.y, EDGE_MARGIN, window.innerHeight - b.height - EDGE_MARGIN),
      });
    });
  }, []);

  // Persist position (debounced to avoid tight loops)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!mounted) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      window.localStorage.setItem(
        "meramot-ai-chat-position",
        JSON.stringify(position)
      );
    }, 300);
  }, [position, mounted]);

  // Keep inside on resize
  useEffect(() => {
    function keepInside() {
      setPosition((prev) => clampToViewport(prev));
    }
    window.addEventListener("resize", keepInside);
    return () => window.removeEventListener("resize", keepInside);
  }, [clampToViewport]);

  function startDrag(clientX: number, clientY: number) {
    movedRef.current = false;
    setDragging(true);
    dragOffsetRef.current = {
      x: clientX - position.x,
      y: clientY - position.y,
    };
  }

  function updateDrag(clientX: number, clientY: number) {
    const b = getBounds();
    const nextX = clamp(
      clientX - dragOffsetRef.current.x,
      EDGE_MARGIN,
      window.innerWidth - b.width - EDGE_MARGIN
    );
    const nextY = clamp(
      clientY - dragOffsetRef.current.y,
      EDGE_MARGIN,
      window.innerHeight - b.height - EDGE_MARGIN
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
        willChange: dragging ? "left, top" : "auto",
      }}
    >
      <Link
        ref={buttonRef}
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
        className={`group flex items-center gap-2 rounded-full bg-[#214c34] px-3 py-2 text-white shadow-[0_8px_24px_rgba(36,66,41,0.3)] ring-1 ring-white/10 transition sm:gap-3 sm:px-4 sm:py-3 ${
          dragging
            ? "cursor-grabbing select-none"
            : "cursor-grab hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(36,66,41,0.4)]"
        }`}
      >
        {/* Icon — recognizable sparkles/AI symbol */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20 sm:h-10 sm:w-10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 sm:h-5.5 sm:w-5.5"
          >
            <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M3 5h4" />
            <path d="M19 17v4" />
            <path d="M17 19h4" />
          </svg>
        </div>

        {/* Always-visible short label on mobile, full label on desktop */}
        <div>
          <p className="text-xs font-bold leading-tight sm:text-sm">AI Chat</p>
          <p className="hidden text-[10px] text-white/70 sm:block">
            Ask anything
          </p>
        </div>
      </Link>
    </div>
  );
}