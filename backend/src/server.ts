import express from "express";
import cors from "cors";
import routes from "./routes";
import { env } from "./config/env";

const app = express();

app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true,
  })
);

app.use(express.json());

app.use("/api", routes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(env.port, () => {
  console.log(`Backend running on port ${env.port}`);
});