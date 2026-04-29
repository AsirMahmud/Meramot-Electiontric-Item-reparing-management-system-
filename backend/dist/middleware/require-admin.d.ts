import { Request, Response, NextFunction } from "express";
type AuthenticatedRequest = Request & {
    user?: {
        id: string;
        role: string;
    };
};
export declare const requireAdmin: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export {};
//# sourceMappingURL=require-admin.d.ts.map