import { Request, Response } from "express";
export declare function createVendorApplication(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function listVendorApplications(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function approveVendorApplication(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function rejectVendorApplication(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateMyVendorApplication(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteVendorApplication(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=vendor-application-controller.d.ts.map