import express from "express";
import * as controller from "../controllers/chatController.js";
const router = express.Router();

router.post("/chat", controller.chat);
router.delete("/chat", controller.clear);

export default router;