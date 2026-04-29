import app from "./app.js";
import { env } from "./config/env.js";
import { startOrphanCleanupScheduler } from "./services/orphan-cleanup.js";

app.listen(env.port, () => {
  console.log(`Backend running on port ${env.port}`);
  startOrphanCleanupScheduler();
});