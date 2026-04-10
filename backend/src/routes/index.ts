import { Router } from "express";
import { APP_DISPLAY_NAME, APP_SLUG } from "../config/app.ts";
import { exampleRouter } from "./example.routes.ts";
import authRoutes from "./auth-routes";
import shopRoutes from "./shop-routes";


export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    app: APP_DISPLAY_NAME,
    slug: APP_SLUG,
  });
});

apiRouter.use("/examples", exampleRouter);


const router = Router();
router.use("/auth", authRoutes);
router.use("/shops", shopRoutes);

export default router;
