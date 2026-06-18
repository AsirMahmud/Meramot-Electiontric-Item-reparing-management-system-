import re
import os

filepath = r"C:\Users\USER\Desktop\Meeramoot-Electiontric-Item-reparing-management-system-\backend\src\routes\vendor-review-routes.ts"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. GET includes applicant -> user, reviewedBy -> reviewedByAdmin
content = re.sub(r'applicant: \{', r'user: {', content)
content = re.sub(r'applicant: true', r'user: true', content)
content = re.sub(r'reviewedBy: \{', r'reviewedByAdmin: {', content)
content = re.sub(r'reviewedBy: true', r'reviewedByAdmin: true', content)

# 2. applicantUserId -> userId
content = re.sub(r'applicantUserId', r'userId', content)

# 3. reviewedById -> reviewedByAdminId
content = re.sub(r'reviewedById', r'reviewedByAdminId', content)

# 4. Approve route modifications
approve_orig = r'''      const shop = await tx\.shop\.create\(\{
        data: \{
          ownerId: application\.userId,
          name: application\.shopName,'''
approve_new = r'''      const shop = await tx.shop.create({
        data: {
          vendorApplicationId: application.id,
          name: application.shopName,'''
content = re.sub(approve_orig, approve_new, content)

# Remove reviewNotes from Approve
content = re.sub(r'reviewNotes: req\.body\.reviewNotes \|\| "Approved by admin",', '', content)

# Add ShopStaff creation in Approve, after shop creation
# Find the end of shop creation
content = re.sub(
    r'(          isActive: true,\n        \},\n      \}\);)',
    r'\1\n\n      await tx.shopStaff.create({\n        data: {\n          shopId: shop.id,\n          userId: application.userId,\n          role: "OWNER",\n          isActive: true\n        }\n      });',
    content
)

# 5. Reject route modifications
reject_orig = r'''      data: \{
        status: "REJECTED",
        reviewedAt: new Date\(\),
        reviewedByAdminId: req\.user\.id,
        reviewNotes: req\.body\.reviewNotes \|\| "Rejected by admin",
      \},'''
reject_new = r'''      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedByAdminId: req.user.id,
        rejectionReason: req.body.reviewNotes || "Rejected by admin",
        rejectedAt: new Date(),
      },'''
content = re.sub(reject_orig, reject_new, content)

# 6. Suspend route
suspend_orig = r'''        data: \{
          status: "SUSPENDED",
          reviewedAt: new Date\(\),
          reviewedByAdminId: req\.user\.id,
          reviewNotes: req\.body\.reviewNotes \|\| "Vendor suspended by admin",
        \},'''
# Note: target schema doesn't have SUSPENDED in VendorApplicationStatus. It only has PENDING, APPROVED, REJECTED. Wait, let me check target schema!
# Target schema VendorApplicationStatus: PENDING, APPROVED, REJECTED
# I will change it to REJECTED.
suspend_new = r'''        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          reviewedByAdminId: req.user.id,
          rejectionReason: req.body.reviewNotes || "Vendor suspended by admin",
          rejectedAt: new Date(),
        },'''
content = re.sub(suspend_orig, suspend_new, content)

# 7. Request-info route
info_orig = r'''      data: \{
        status: "MORE_INFO_REQUIRED",
        reviewedAt: new Date\(\),
        reviewedByAdminId: req\.user\.id,
        reviewNotes: req\.body\.reviewNotes \|\| "More information requested",
      \},'''
info_new = r'''      data: {
        status: "PENDING",
        reviewedAt: new Date(),
        reviewedByAdminId: req.user.id,
        rejectionReason: req.body.reviewNotes || "More information requested",
        rejectionVisibleUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },'''
content = re.sub(info_orig, info_new, content)

# Wait, `vendor-review-routes.ts` has `shopId: shop.id` inside `updatedApplication`.
# We need to remove `shopId: shop.id` from `updatedApplication` because target schema doesn't have `shopId` on `VendorApplication` (it's `vendorApplicationId` on `Shop` instead).
content = re.sub(r'shopId: shop\.id,\n', '', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("vendor-review-routes.ts patched.")
