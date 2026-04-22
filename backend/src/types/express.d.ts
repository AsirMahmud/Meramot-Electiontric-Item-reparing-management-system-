import "express";

declare global {
  namespace Express {
    interface Request {
      deliveryAuth?: {
        userId: string;
        riderProfileId: string;
        registrationStatus: "PENDING" | "APPROVED" | "REJECTED";
      };
      deliveryAdminAuth?: {
        userId: string;
      };
    }
  }
}

export {};
