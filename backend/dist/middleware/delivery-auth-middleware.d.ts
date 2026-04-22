import { NextFunction, Request, Response } from "express";
export declare function requireDeliveryAuth(req: Request, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
/** Blocks partners until an admin approves registration (GET /me is exempt). */
export declare function requireApprovedDeliveryPartner(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
//# sourceMappingURL=delivery-auth-middleware.d.ts.map