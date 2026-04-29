import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth.js";
export declare function getVendorDashboard(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getVendorAnalytics(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function upsertVendorBid(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateVendorAssignedJobStatus(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function submitVendorFinalQuote(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=vendor-request-controller.d.ts.map