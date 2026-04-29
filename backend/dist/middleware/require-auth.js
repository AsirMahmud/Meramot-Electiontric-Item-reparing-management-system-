import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
export const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }
    const token = authHeader.slice("Bearer ".length).trim();
    try {
        const payload = jwt.verify(token, env.jwtSecret);
        req.user = {
            id: payload.sub,
            role: payload.role ?? "CUSTOMER",
            username: payload.username,
            email: payload.email,
        };
        return next();
    }
    catch {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};
//# sourceMappingURL=require-auth.js.map