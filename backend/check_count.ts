import prisma from "./src/models/prisma.js";
async function main() {
  const count = await prisma.vendorApplication.count();
  console.log(`VendorApplication Count: ${count}`);
  process.exit(0);
}
main();
