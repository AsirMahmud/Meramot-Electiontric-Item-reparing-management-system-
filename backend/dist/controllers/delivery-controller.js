import prisma from "../models/prisma.js";
export async function getDeliveryMe(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const riderProfile = await prisma.riderProfile.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true,
                        phone: true,
                        role: true,
                        status: true,
                        avatarUrl: true,
                    },
                },
            },
        });
        // If no profile exists, they are pending profile creation/approval.
        // We return a safe stub so the frontend knows they are PENDING.
        if (!riderProfile) {
            return res.json({
                riderName: {
                    id: "",
                    userId: userId,
                    registrationStatus: "PENDING",
                    user: req.user,
                }
            });
        }
        return res.json({ riderName: riderProfile });
    }
    catch (error) {
        console.error("getDeliveryMe error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function listMyDeliveries(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        // For now, return empty array to prevent frontend crash
        return res.json({ deliveries: [] });
    }
    catch (error) {
        console.error("listMyDeliveries error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function acceptMyDelivery(req, res) {
    return res.status(400).json({ message: "Not implemented in this phase" });
}
export async function updateLocation(req, res) {
    return res.status(400).json({ message: "Not implemented in this phase" });
}
export async function updateMyDeliveryStatus(req, res) {
    return res.status(400).json({ message: "Not implemented in this phase" });
}
export async function getDeliveryPayoutSummary(req, res) {
    return res.status(400).json({ message: "Not implemented in this phase" });
}
export async function requestDeliveryPayout(req, res) {
    return res.status(400).json({ message: "Not implemented in this phase" });
}
export async function getDeliveryChatMessages(req, res) {
    return res.status(400).json({ message: "Not implemented in this phase" });
}
export async function sendDeliveryChatMessage(req, res) {
    return res.status(400).json({ message: "Not implemented in this phase" });
}
//# sourceMappingURL=delivery-controller.js.map