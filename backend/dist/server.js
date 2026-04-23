import app from "./app.js";
import prisma from "./models/prisma.js";
import { env } from "./config/env.js";
async function start() {
    try {
        await prisma.$connect();
        app.listen(env.port, () => {
            console.log(`Backend running on port ${env.port}`);
        });
    }
    catch (error) {
        console.error("Failed to start backend:", error);
        process.exit(1);
    }
}
void start();
//# sourceMappingURL=server.js.map