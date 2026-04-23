import { Router } from "express";
import prisma from "../models/prisma.js";
const router = Router();
router.get("/", async (req, res) => {
    try {
        const shops = await prisma.shop.findMany();
        res.json(shops);
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error fetching shops");
    }
});
export default router;
//# sourceMappingURL=shops.js.map