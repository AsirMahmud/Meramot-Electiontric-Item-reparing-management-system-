import { Router } from "express";
import { createRepairRequest, listMyRequests, updateRequestStatus } from "../controllers/request-controller.js";
import { requireAuth } from "../middleware/require-auth.js";

const router = Router();

router.use(requireAuth);
router.get("/mine", listMyRequests);
router.post("/", createRepairRequest);
router.patch("/:requestId/status", updateRequestStatus);

export default router;
