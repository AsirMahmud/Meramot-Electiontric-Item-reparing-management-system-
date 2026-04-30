import re

main_path = r'C:\Users\USER\Desktop\main_branch\backend\prisma\schema.prisma'
target_path = r'C:\Users\USER\Desktop\Meeramoot-Electiontric-Item-reparing-management-system-\backend\prisma\schema.prisma'

# Reset target to original (assuming git checkout or just rewrite from a clean state)
# Actually, target was already messed up. Let's reset target from git or just read main_schema and inject target's unique fields into it! This is much cleaner.

import subprocess
subprocess.run(['git', 'checkout', target_path], cwd=r'C:\Users\USER\Desktop\Meeramoot-Electiontric-Item-reparing-management-system-\backend')

with open(target_path, 'r', encoding='utf-8') as f:
    target_content = f.read()

with open(main_path, 'r', encoding='utf-8') as f:
    main_content = f.read()

# Let's extract target's Shop and VendorApplication unique fields and put them into main_schema.
# Target Shop unique fields:
shop_unique = """
  isPublic      Boolean @default(false)
  setupComplete Boolean @default(false)
  openingDays    String?
  openingHours   String?
  supportPhone   String?
  whatsappNumber String?
"""

# Target VendorApplication unique fields:
va_unique = """
  userId                String                  @unique
  rejectionReason       String?
  rejectedAt            DateTime?
  rejectionVisibleUntil DateTime?
"""

# Let's start with main_schema and inject these
merged_schema = main_content

# Inject into VendorApplication
merged_schema = re.sub(r'(model VendorApplication \{)', r'\1\n' + va_unique, merged_schema)

# And add the user relation to VendorApplication
merged_schema = re.sub(r'(shop               Shop\?)', r'\1\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)', merged_schema)

# Inject into Shop
merged_schema = re.sub(r'(isActive             Boolean        @default\(true\))', r'\1\n' + shop_unique, merged_schema)

# Remove the default `ownerId` from Shop if it existed? main_schema Shop doesn't have ownerId! So that's perfect.

# Also, ensure User has vendorApplications relation? Wait, if VendorApplication has `user User`, then User model needs the opposite relation.
# User in main_schema has: `reviewedVendorApplications VendorApplication[] @relation("VendorApplicationReviewer")`.
# Let's add `vendorApplications VendorApplication[]` to User.
merged_schema = re.sub(r'(reviewedVendorApplications VendorApplication\[\]  @relation\("VendorApplicationReviewer"\))', r'\1\n  vendorApplications VendorApplication[]', merged_schema)

# Write out the merged schema
with open(target_path, 'w', encoding='utf-8') as f:
    f.write(merged_schema)

print("Schema merged!")
