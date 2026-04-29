import { Request, Response } from "express";
export declare function getDeliveryAdminStats(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function listDeliveryPartners(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function approveDeliveryPartner(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function rejectDeliveryPartner(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function listDeliveryOrders(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function assignDeliveryOrder(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getDeliveryOrderTimeline(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getAdminDeliveryChatMessages(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function sendAdminDeliveryChatMessage(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function listDeliveryPayoutRequests(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function approveDeliveryPayoutRequest(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=delivery-admin-controller.d.ts.map