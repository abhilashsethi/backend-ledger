import { Router } from "express";
import { authMiddleware, authSystemUserMiddleware } from "../middleware/auth.middleware.js";
import { createInitialFundsTransactions, createTransaction } from "../controllers/transaction.controller.js";

const transactionRouter = Router();

transactionRouter.post("/", authMiddleware, createTransaction);
transactionRouter.post("/system/initial-funds", authSystemUserMiddleware, createInitialFundsTransactions);

export default transactionRouter
