import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth.js";
export declare function getMyActiveCarts(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function addItemToCart(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateCartItem(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function removeCartItem(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function checkoutCart(req: AuthedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=cart-controller.d.ts.map