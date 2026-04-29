import { Response } from "express";
import { AuthedRequest } from "../middleware/auth.js";
export declare function getDeliveryMe(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function listMyDeliveries(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function acceptMyDelivery(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateLocation(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateMyDeliveryStatus(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getDeliveryPayoutSummary(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function requestDeliveryPayout(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getDeliveryChatMessages(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function sendDeliveryChatMessage(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=delivery-controller.d.ts.map