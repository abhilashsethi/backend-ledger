import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";

const transactionRouter = Router();

transactionRouter.post("/", authMiddleware)

