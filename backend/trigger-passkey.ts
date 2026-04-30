import { generateAndSendAdminPasskey } from "./src/services/admin-passkey-service.js";

async function run() {
  console.log("Triggering first passkey email...");
  await generateAndSendAdminPasskey();
  console.log("Done.");
  process.exit(0);
}

run();
