import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

type AuthTokenPayload = {
  sub: string;
  role?: string;
  username?: string;
  email?: string;
};

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: string;
    username?: string;
    email?: string;
  };
};

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;

    req.user = {
      id: payload.sub,
      role: payload.role ?? "CUSTOMER",
      username: payload.username,
      email: payload.email,
    };

    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};