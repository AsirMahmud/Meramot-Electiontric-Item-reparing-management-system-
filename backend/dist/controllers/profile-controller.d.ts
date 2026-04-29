import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth.js";
export declare function getProfile(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateProfile(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=profile-controller.d.ts.map