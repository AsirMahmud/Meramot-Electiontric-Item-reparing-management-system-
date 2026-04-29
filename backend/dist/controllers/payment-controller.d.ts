import type { Request, Response } from "express";
type AuthenticatedRequest = Request & {
    user?: {
        id: string;
        role: string;
        username?: string;
        email?: string;
    };
};
export declare function initiateSslCommerzPayment(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function handleSslCommerzSuccess(req: Request, res: Response): Promise<void | Response<any, Record<string, any>>>;
export declare function handleSslCommerzIpn(req: Request, res: Response): Promise<void | Response<any, Record<string, any>>>;
export declare function handleSslCommerzFail(req: Request, res: Response): Promise<void>;
export declare function handleSslCommerzCancel(req: Request, res: Response): Promise<void>;
export declare function getMyPaymentById(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function listPaymentsForAdmin(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function querySslCommerzTransaction(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function initiateSslCommerzRefund(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function querySslCommerzRefund(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export {};
//# sourceMappingURL=payment-controller.d.ts.map