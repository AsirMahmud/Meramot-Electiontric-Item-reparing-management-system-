import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  addItemToCart,
  checkoutCart,
  getMyActiveCarts,
  removeCartItem,
  updateCartItem,
} from "../controllers/cart-controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", getMyActiveCarts);
router.post("/items", addItemToCart);
router.patch("/items/:itemId", updateCartItem);
router.delete("/items/:itemId", removeCartItem);
router.post("/:cartId/checkout", checkoutCart);

export default router;