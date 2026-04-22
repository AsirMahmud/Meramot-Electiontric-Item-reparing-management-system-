import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
export declare function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
export declare function requireRoles(...allowed: UserRole[]): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=auth-middleware.d.ts.map