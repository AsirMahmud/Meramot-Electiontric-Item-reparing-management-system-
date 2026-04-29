import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth.js";
export declare function getShopReviews(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function canReviewShop(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createReview(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=review-controller.d.ts.map