type ChatTurn = {
    role: "user" | "assistant";
    text: string;
};
type AiChatInput = {
    message: string;
    history?: ChatTurn[];
};
export declare function generateAiRepairReply(input: AiChatInput): Promise<{
    ok: boolean;
    skipped: boolean;
    reply: string;
    raw?: undefined;
} | {
    ok: boolean;
    skipped: boolean;
    reply: any;
    raw: any;
}>;
export {};
//# sourceMappingURL=ai-chat-service.d.ts.map