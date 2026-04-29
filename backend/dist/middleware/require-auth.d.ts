import { NextFunction, Request, Response } from "express";
export type AuthenticatedRequest = Request & {
    user?: {
        id: string;
        role: string;
        username?: string;
        email?: string;
    };
};
export declare const requireAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=require-auth.d.ts.map