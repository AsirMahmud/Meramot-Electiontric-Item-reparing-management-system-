import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ where: { role: 'VENDOR' }, include: { vendorApplications: true } });
  const missing = users.filter(u => u.vendorApplications.length === 0);
  console.log('Missing applications for vendors:', missing.length);
  if (missing.length > 0) {
    console.log(missing.map(u => ({ id: u.id, email: u.email, name: u.name })));
    // Create an APPROVED vendor application for each
    for (const u of missing) {
      await prisma.vendorApplication.create({
        data: {
          userId: u.id,
          ownerName: u.name || 'Unknown',
          businessEmail: u.email,
          phone: u.phone || '+880000000000',
          shopName: (u.name || 'Vendor') + ' Shop',
          address: 'Unknown',
          status: 'APPROVED',
        }
      });
      console.log('Created application for', u.email);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
