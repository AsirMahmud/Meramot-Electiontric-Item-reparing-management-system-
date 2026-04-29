import type { NextFunction, Response } from "express";
import type { AuthedRequest } from "../middleware/auth.js";
/**
 * Middleware that attaches `req.user` when a valid Bearer token is present
 * but does NOT reject the request when the token is missing.
 */
export declare function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void;
export declare function getShopReviews(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function canReviewShop(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createReview(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateReview(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=review-controller.d.ts.map