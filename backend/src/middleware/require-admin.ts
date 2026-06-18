import { Request, Response, NextFunction } from "express";

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: string;
  };
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Admin access only",
    });
  }

  next();
};