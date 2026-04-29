import { Response } from "express";
import type { AuthedRequest } from "../middleware/auth.js";
export declare function getAiChatSessions(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createAiChatSession(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function saveAiChatMessage(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteAiChatSession(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=ai-chat-history-controller.d.ts.map