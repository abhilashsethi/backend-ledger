import express from 'express';
import authRoutes from "./routes/auth.routes.js"
import cookieParser from 'cookie-parser';
import accountRouter from "./routes/account.routes.js"

const app = express();

app.use(express.json());
app.use(cookieParser())

app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRouter);


export default app;