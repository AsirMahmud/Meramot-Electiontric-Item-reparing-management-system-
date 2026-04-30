import re
import os

filepath_fin = r'C:\Users\USER\Desktop\Meeramoot-Electiontric-Item-reparing-management-system-\backend\src\routes\financial-ledger-routes.ts'

with open(filepath_fin, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Prisma select/include payloads to include invoice.shop
if 'invoice: {' not in content:
    # Find repairRequest: {
    content = re.sub(
        r'(repairRequest: \{)', 
        r'invoice: {\n          select: {\n            shop: {\n              select: {\n                id: true,\n                name: true,\n                staff: { where: { role: "OWNER" }, select: { userId: true } },\n              }\n            }\n          }\n        },\n        \1', 
        content
    )

# 2. Update resolution priority
# Old logic:
# const vendorFromRequestedShop = payment.repairRequest?.requestedShop?.staff?.[0]?.userId ?? null;
# const vendorFromRepairJob = payment.repairRequest?.repairJob?.shop?.staff?.[0]?.userId ?? null;
# const vendorUserId = vendorFromRequestedShop ?? vendorFromRepairJob;
new_logic = r'''  const vendorFromRepairJob = payment.repairRequest?.repairJob?.shop?.staff?.[0]?.userId ?? null;
  const vendorFromInvoice = payment.invoice?.shop?.staff?.[0]?.userId ?? null;
  const vendorFromRequestedShop = payment.repairRequest?.requestedShop?.staff?.[0]?.userId ?? null;
  const vendorUserId = vendorFromRepairJob ?? vendorFromInvoice ?? vendorFromRequestedShop ?? null;'''

content = re.sub(
    r'const vendorFromRequestedShop = payment\.repairRequest\?\.requestedShop\?\.staff\?\.\[0\]\?\.userId \?\? null;\n\s*const vendorFromRepairJob = payment\.repairRequest\?\.repairJob\?\.shop\?\.staff\?\.\[0\]\?\.userId \?\? null;\n\s*const vendorUserId = vendorFromRequestedShop \?\? vendorFromRepairJob;',
    new_logic,
    content
)

with open(filepath_fin, 'w', encoding='utf-8') as f:
    f.write(content)

# Now fix assignedShop in invoice-routes.ts
filepath_inv = r'C:\Users\USER\Desktop\Meeramoot-Electiontric-Item-reparing-management-system-\backend\src\routes\invoice-routes.ts'
with open(filepath_inv, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove assignedShop globally
content = re.sub(r'\.?assignedShop\?', '.requestedShop?', content)
content = re.sub(r'assignedShop: true,?', '', content)
content = re.sub(r'assignedShop: \{[\s\S]*?\},', '', content)
content = re.sub(r'assignedShop', 'requestedShop', content)

with open(filepath_inv, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched financial and invoice routes.")
