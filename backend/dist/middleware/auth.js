import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authentication required" });
    }
    const token = header.slice(7);
    try {
        const payload = jwt.verify(token, env.jwtSecret);
        req.user = {
            id: payload.sub,
            username: payload.username,
            email: payload.email,
            role: payload.role,
        };
        return next();
    }
    catch {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}
export function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
    }
    if (req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Admin access required" });
    }
    return next();
}
//# sourceMappingURL=auth.js.map