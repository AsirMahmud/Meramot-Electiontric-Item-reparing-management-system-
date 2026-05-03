"use client";

import dynamic from "next/dynamic";

const FloatingAiChatButton = dynamic(
  () => import("@/components/chat/FloatingAiChatButton"),
  { ssr: false }
);

export default function LazyAiChat() {
  return <FloatingAiChatButton />;
}
