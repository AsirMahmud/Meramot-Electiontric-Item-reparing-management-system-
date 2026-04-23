import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import prisma from "../models/prisma.js";
export async function requireDeliveryAuth(req, res, next) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
    if (!token) {
        return res.status(401).json({ message: "Missing delivery authorization token" });
    }
    try {
        const decoded = jwt.verify(token, env.jwtSecretDelivery);
        if (decoded.aud !== "delivery" || !decoded.sub) {
            return res.status(401).json({ message: "Invalid delivery token" });
        }
        const user = await prisma.user.findUnique({
            where: { id: decoded.sub },
            select: { id: true, role: true, status: true },
        });
        if (!user || user.role !== "DELIVERY") {
            return res.status(403).json({ message: "Delivery access denied" });
        }
        if (user.status !== "ACTIVE") {
            return res.status(403).json({ message: "Delivery account is suspended" });
        }
        req.deliveryAuth = {
            userId: user.id,
            riderProfileId: user.id,
            registrationStatus: "APPROVED",
        };
        return next();
    }
    catch {
        return res.status(401).json({ message: "Invalid or expired delivery token" });
    }
}
/** Blocks partners until an admin approves registration (GET /me is exempt). */
export function requireApprovedDeliveryPartner(req, res, next) {
    const status = req.deliveryAuth?.registrationStatus;
    if (status !== "APPROVED") {
        return res.status(403).json({
            message: status === "PENDING"
                ? "Delivery partner registration is pending admin approval"
                : "Delivery partner registration is not approved",
        });
    }
    return next();
}
//# sourceMappingURL=delivery-auth-middleware.js.map