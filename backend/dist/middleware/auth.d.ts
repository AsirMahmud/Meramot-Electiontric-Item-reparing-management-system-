import type { NextFunction, Request, Response } from "express";
export type AuthedRequest = Request & {
    user?: {
        id: string;
        username?: string;
        email?: string;
        role?: string;
    };
};
export declare function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
//# sourceMappingURL=auth.d.ts.map