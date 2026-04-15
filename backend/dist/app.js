import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
export function createApp() {
    const app = express();
    app.use(cors({
        origin: env.frontendOrigin,
        credentials: true,
    }));
    app.use(express.json());
    app.use("/api", routes);
    app.use((_req, res) => {
        res.status(404).json({ error: "Not found" });
    });
    return app;
}
//# sourceMappingURL=app.js.map