import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth.js";
export declare function createRepairRequest(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function listMyRequests(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function acceptRequestBid(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function declineRequestBid(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function respondToFinalQuote(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateRequestStatus(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=request-controller.d.ts.map