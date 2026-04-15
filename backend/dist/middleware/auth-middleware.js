import jwt from "jsonwebtoken";
import prisma from "../models/prisma.js";
import { env } from "../config/env.js";
export async function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = header.slice("Bearer ".length).trim();
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const decoded = jwt.verify(token, env.jwtSecret);
        const userId = decoded.sub;
        if (!userId) {
            return res.status(401).json({ message: "Invalid token" });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                status: true,
            },
        });
        if (!user || user.status !== "ACTIVE") {
            return res.status(401).json({ message: "Unauthorized" });
        }
        req.authUser = user;
        return next();
    }
    catch {
        return res.status(401).json({ message: "Invalid token" });
    }
}
export function requireRoles(...allowed) {
    return (req, res, next) => {
        if (!req.authUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!allowed.includes(req.authUser.role)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        return next();
    };
}
//# sourceMappingURL=auth-middleware.js.map