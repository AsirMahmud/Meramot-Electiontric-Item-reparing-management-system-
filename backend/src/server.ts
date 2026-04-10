import express from "express";
import cors from "cors";
import routes from "./routes";
import { env } from "./config/env.ts";
const app = express();
app.use(cors({ origin: env.frontendOrigin, credentials: true }));
app.use(express.json());
app.use("/api", routes);
app.listen(env.port, () => {
  console.log(`Backend running on port ${env.port}`);
});