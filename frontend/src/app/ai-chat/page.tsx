"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import {
  chatWithAi,
  createAiChatSession,
  getAiChatSessions,
  saveAiChatMessage,
} from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  text: string;
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
};

type ChatPreview = {
  id: string;
  title: string;
  subtitle: string;
};

const CHAT_STORAGE_KEY = "meramot-ai-chat-sessions";
const ACTIVE_CHAT_STORAGE_KEY = "meramot-ai-active-chat-id";

const DEFAULT_GREETING =
  "Hi, I’m Meramot AI. Tell me what’s happening with your device, and I’ll help you figure out the next step.";

function createDefaultChat(id = "draft-chat", title = "General Support"): ChatSession {
  return {
    id,
    title,
    messages: [
      {
        role: "assistant",
        text: DEFAULT_GREETING,
      },
    ],
  };
}

function renderFormattedText(text: string) {
  return text.split("\n").map((line, lineIndex) => {
    const isBullet = line.trim().startsWith("- ");

    return (
      <div
        key={lineIndex}
        className={isBullet ? "ml-5 list-item" : line.trim() === "" ? "h-3" : ""}
      >
        {line.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) => {
          if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
            return <strong key={partIndex}>{part.slice(2, -2)}</strong>;
          }

          return <Fragment key={partIndex}>{part}</Fragment>;
        })}
      </div>
    );
  });
}

function makePreview(messages: Message[], fallback: string): string {
  const firstUser = messages.find((msg) => msg.role === "user")?.text?.trim();
  if (!firstUser) return fallback;
  return firstUser.length > 38 ? `${firstUser.slice(0, 38)}...` : firstUser;
}

export default function AiChatPage() {
  const { data: session } = useSession();

  const [token, setToken] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    createDefaultChat(),
  ]);

  const [activeChatId, setActiveChatId] = useState("draft-chat");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const isLoggedIn = !!token;

  useEffect(() => {
    setToken(localStorage.getItem("meramot.token") || "");
  }, []);

  const firstName = useMemo(() => {
    const user = session?.user as
      | { name?: string | null; username?: string | null; email?: string | null }
      | undefined;

    return (
      user?.name?.trim()?.split(" ")[0] ||
      user?.username?.trim()?.split(" ")[0] ||
      user?.email?.trim()?.split("@")[0] ||
      "User"
    );
  }, [session]);

  const activeChat = useMemo(() => {
    return (
      chatSessions.find((chat) => chat.id === activeChatId) ?? chatSessions[0]
    );
  }, [chatSessions, activeChatId]);

  const previews: ChatPreview[] = useMemo(() => {
    return chatSessions.map((chat, index) => ({
      id: chat.id,
      title:
        index === 0 && chat.title === "General Support"
          ? "General Support"
          : chat.title,
      subtitle:
        chat.messages.length > 1
          ? `${Math.max(chat.messages.length - 1, 1)} messages`
          : "Just now",
    }));
  }, [chatSessions]);

  useEffect(() => {
    async function loadHistory() {
      setHistoryError("");

      if (isLoggedIn) {
        try {
          const savedChats = await getAiChatSessions(token);

          if (Array.isArray(savedChats) && savedChats.length > 0) {
            setChatSessions(savedChats);
            setActiveChatId(savedChats[0].id);
          } else {
            const defaultChat = createDefaultChat();
            setChatSessions([defaultChat]);
            setActiveChatId(defaultChat.id);
          }
        } catch {
          setHistoryError("Could not load saved AI chat history.");
          const defaultChat = createDefaultChat();
          setChatSessions([defaultChat]);
          setActiveChatId(defaultChat.id);
        } finally {
          setHistoryLoaded(true);
        }

        return;
      }

      const savedChats = localStorage.getItem(CHAT_STORAGE_KEY);
      const savedActiveChatId = localStorage.getItem(ACTIVE_CHAT_STORAGE_KEY);

      if (savedChats) {
        try {
          const parsedChats = JSON.parse(savedChats);

          if (Array.isArray(parsedChats) && parsedChats.length > 0) {
            setChatSessions(parsedChats);
            setActiveChatId(savedActiveChatId || parsedChats[0].id);
          }
        } catch {
          localStorage.removeItem(CHAT_STORAGE_KEY);
          localStorage.removeItem(ACTIVE_CHAT_STORAGE_KEY);
        }
      }

      setHistoryLoaded(true);
    }

    if (token !== "") {
      void loadHistory();
      return;
    }

    if (typeof window !== "undefined") {
      const localToken = localStorage.getItem("meramot.token") || "";

      if (!localToken) {
        void loadHistory();
      }
    }
  }, [isLoggedIn, token]);

  useEffect(() => {
    if (!historyLoaded || isLoggedIn) return;

    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatSessions));
    localStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, activeChatId);
  }, [chatSessions, activeChatId, historyLoaded, isLoggedIn]);

  function updateMessagesById(chatId: string, nextMessages: Message[]) {
    setChatSessions((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: nextMessages,
              title: makePreview(nextMessages, chat.title),
            }
          : chat
      )
    );
  }

  function createNewChat() {
    const id = isLoggedIn ? `draft-chat-${Date.now()}` : `guest-chat-${Date.now()}`;

    const newChat: ChatSession = {
      id,
      title: "New Chat",
      messages: [
        {
          role: "assistant",
          text: "Hi, I’m Meramot AI. Describe your repair issue, and I’ll help you troubleshoot it.",
        },
      ],
    };

    setChatSessions((prev) => [newChat, ...prev]);
    setActiveChatId(id);
    setInput("");
    setHistoryError("");
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;

    event.preventDefault();
    void handleSend();
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading || !activeChat) return;

    const originalChatId = activeChat.id;
    let currentChatId = activeChat.id;
    const baseMessages = activeChat.messages;

    const nextMessages: Message[] = [
      ...baseMessages,
      { role: "user", text: trimmed },
    ];

    setInput("");
    setLoading(true);
    setHistoryError("");

    try {
      if (isLoggedIn && currentChatId.startsWith("draft-chat")) {
        const createdChat = await createAiChatSession(
          makePreview(nextMessages, "New Chat"),
          token
        );

        currentChatId = createdChat.id;

        await saveAiChatMessage(currentChatId, "assistant", baseMessages[0].text, token);

        setChatSessions((prev) =>
          prev.map((chat) =>
            chat.id === originalChatId
              ? {
                  ...chat,
                  id: currentChatId,
                  title: makePreview(nextMessages, createdChat.title || "New Chat"),
                }
              : chat
          )
        );

        setActiveChatId(currentChatId);
      }

      setChatSessions((prev) =>
        prev.map((chat) =>
          chat.id === originalChatId || chat.id === currentChatId
            ? {
                ...chat,
                id: currentChatId,
                messages: nextMessages,
                title: makePreview(nextMessages, chat.title),
              }
            : chat
        )
      );

      if (isLoggedIn) {
        await saveAiChatMessage(currentChatId, "user", trimmed, token);
      }

      const result = await chatWithAi({
        message: trimmed,
        history: nextMessages.map((msg) => ({
          role: msg.role,
          text: msg.text,
        })),
      });

      const finalMessages: Message[] = [
        ...nextMessages,
        {
          role: "assistant",
          text: result.reply,
        },
      ];

      updateMessagesById(currentChatId, finalMessages);

      if (isLoggedIn) {
        await saveAiChatMessage(currentChatId, "assistant", result.reply, token);
      }
    } catch (error) {
      setHistoryError(
        isLoggedIn
          ? "Could not save this AI chat. Check the AI chat history API."
          : ""
      );

      updateMessagesById(originalChatId, [
        ...nextMessages,
        {
          role: "assistant",
          text:
            error instanceof Error
              ? error.message
              : "Sorry, something went wrong while contacting AI support.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar isLoggedIn={!!session?.user} firstName={firstName} />

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="rounded-[2.5rem] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_20px_50px_rgba(67,100,64,0.12)] md:p-6 dark:shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <button
                type="button"
                onClick={createNewChat}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent-dark)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                <span className="text-lg leading-none">+</span>
                New Chat
              </button>

              <div className="mt-5 space-y-3">
                {previews.map((chat) => {
                  const selected = chat.id === activeChatId;

                  return (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => setActiveChatId(chat.id)}
                      className={`flex w-full items-start gap-3 rounded-[1.4rem] px-3 py-3 text-left transition ${
                        selected
                          ? "bg-[var(--mint-100)] shadow-sm"
                          : "hover:bg-[var(--mint-50)]"
                      }`}
                    >
                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--mint-200)] text-[var(--accent-dark)]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="h-5 w-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                          />
                        </svg>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                          {chat.title}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {chat.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="flex min-h-[620px] flex-col rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm md:p-6">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--foreground)]">
                    AI Repair Assistant
                  </h1>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Ask about device issues, repair urgency, and next steps.
                  </p>

                  {historyError && (
                    <p className="mt-2 text-sm text-red-600">{historyError}</p>
                  )}
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mint-100)] text-[var(--accent-dark)]">
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
                      d="M9.75 3.75h4.5m-7.5 4.5h10.5m-9 4.5h7.5M8.25 21h7.5a2.25 2.25 0 0 0 2.25-2.25V8.121a2.25 2.25 0 0 0-.659-1.591l-1.871-1.871A2.25 2.25 0 0 0 13.879 4H8.25A2.25 2.25 0 0 0 6 6.25v12.5A2.25 2.25 0 0 0 8.25 21Z"
                    />
                  </svg>
                </div>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto py-6">
                {activeChat?.messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--mint-100)] text-[var(--accent-dark)] shadow-sm">
                        <span className="text-sm font-bold">AI</span>
                      </div>
                    )}

                    <div
                      className={`max-w-[78%] rounded-[1.4rem] px-4 py-3 text-sm leading-7 shadow-sm ${
                        msg.role === "user"
                          ? "bg-[var(--accent-dark)] text-white"
                          : "bg-[var(--mint-100)] text-[var(--foreground)]"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">
                        {renderFormattedText(msg.text)}
                      </div>
                    </div>

                    {msg.role === "user" && (
                      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--mint-100)] text-[var(--accent-dark)] shadow-sm">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="h-5 w-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 6.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.118a7.5 7.5 0 0 1 15 0"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--mint-100)] text-[var(--accent-dark)] shadow-sm">
                      <span className="text-sm font-bold">AI</span>
                    </div>
                    <div className="rounded-[1.4rem] bg-[var(--mint-100)] px-4 py-3 text-sm text-[var(--foreground)] shadow-sm">
                      Thinking...
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <div className="flex items-end gap-3 rounded-[1.6rem] bg-[var(--mint-100)] p-3 shadow-sm">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    rows={2}
                    placeholder="Type your message here..."
                    disabled={loading}
                    className="min-h-[56px] flex-1 resize-none rounded-[1.2rem] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={loading}
                    className="rounded-full bg-[var(--accent-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
                  >
                    Send
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}