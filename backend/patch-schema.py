import re

main_path = r'C:\Users\USER\Desktop\main_branch\backend\prisma\schema.prisma'
target_path = r'C:\Users\USER\Desktop\Meeramoot-Electiontric-Item-reparing-management-system-\backend\prisma\schema.prisma'

with open(main_path, 'r', encoding='utf-8') as f:
    main_content = f.read()

with open(target_path, 'r', encoding='utf-8') as f:
    target_content = f.read()

# Extract blocks (enum and model)
def get_blocks(content):
    blocks = {}
    current_type = None
    current_name = None
    current_lines = []
    
    for line in content.split('\n'):
        match = re.match(r'^(enum|model)\s+([A-Za-z0-9_]+)', line)
        if match:
            current_type = match.group(1)
            current_name = match.group(2)
            current_lines = [line]
        elif current_name is not None:
            current_lines.append(line)
            if line.startswith('}'):
                blocks[current_name] = {'type': current_type, 'content': '\n'.join(current_lines)}
                current_name = None
    return blocks

main_blocks = get_blocks(main_content)
target_blocks = get_blocks(target_content)

missing_blocks = []
for name, block in main_blocks.items():
    if name not in target_blocks:
        missing_blocks.append(block['content'])

# Append missing blocks
if missing_blocks:
    target_content += '\n\n' + '\n\n'.join(missing_blocks)

# Now, we need to patch existing models
# 1. VendorApplication
vendor_app_replacements = [
    (r'rejectionVisibleUntil DateTime\?', r'rejectionVisibleUntil DateTime?\n  reviewedByAdminId String?\n  reviewedAt DateTime?'),
    (r'user User @relation\(fields: \[userId\], references: \[id\], onDelete: Cascade\)', r'user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n  reviewedByAdmin User? @relation("VendorApplicationReviewer", fields: [reviewedByAdminId], references: [id], onDelete: SetNull)\n  shop Shop?')
]
for pat, repl in vendor_app_replacements:
    target_content = re.sub(pat, repl, target_content)

# 2. Shop
shop_replacements = [
    (r'slug        String  @unique', r'slug        String  @unique\n  vendorApplicationId String? @unique'),
    (r'carts      Cart\[\]', r'carts      Cart[]\n  vendorApplication VendorApplication? @relation(fields: [vendorApplicationId], references: [id], onDelete: SetNull)\n  staff ShopStaff[]\n  escrowStatus EscrowStatus? @default(HELD)\n  refunds Refund[]\n  disputeCases DisputeCase[]\n  escrowLedgers EscrowLedger[]\n  invoices Invoice[]\n  payouts VendorPayout[]\n  ledgerEntries LedgerEntry[]\n  directRequests RepairRequest[] @relation("RequestedShopRequests")\n  services ShopService[]\n  verificationRecords VerificationRecord[]')
]
for pat, repl in shop_replacements:
    target_content = re.sub(pat, repl, target_content)

# 3. User
user_replacements = [
    (r'carts              Cart\[\]', r'carts              Cart[]\n  reviewedVendorApplications VendorApplication[] @relation("VendorApplicationReviewer")\n  shopMemberships ShopStaff[]\n  disputesOpened DisputeCase[] @relation("DisputeOpenedBy")\n  disputesAgainst DisputeCase[] @relation("DisputeAgainst")\n  assignedDisputes DisputeCase[] @relation("DisputeAssignedAdmin")\n  disputeNotes DisputeNote[]\n  approvedRefunds Refund[] @relation("RefundApprovedBy")\n  escrowLedgersAsCustomer EscrowLedger[] @relation("EscrowCustomer")\n  escrowLedgersAsVendor EscrowLedger[] @relation("EscrowVendor")\n  riderProfile RiderProfile?\n  aiChatSessions AiChatSession[]\n  assignedSupportTickets SupportTicket[] @relation("TicketAssignee")\n  moderationActions Rating[] @relation("RatingModerator")\n  verificationRecords VerificationRecord[] @relation("VerificationSubjectUser")\n  reviewedVerifications VerificationRecord[] @relation("VerificationReviewer")')
]
for pat, repl in user_replacements:
    target_content = re.sub(pat, repl, target_content)

# 4. Payment
payment_replacements = [
    (r'repairRequestId String\?', r'repairRequestId String?\n  invoiceId String?'),
    (r'repairRequest RepairRequest\? @relation\(fields: \[repairRequestId\], references: \[id\], onDelete: SetNull\)', r'repairRequest RepairRequest? @relation(fields: [repairRequestId], references: [id], onDelete: SetNull)\n  invoice Invoice? @relation(fields: [invoiceId], references: [id], onDelete: SetNull)\n  ledgerEntries LedgerEntry[]\n  escrowStatus EscrowStatus? @default(HELD)\n  refunds Refund[]\n  disputeCases DisputeCase[]\n  escrowLedgers EscrowLedger[]')
]
for pat, repl in payment_replacements:
    target_content = re.sub(pat, repl, target_content)

# 5. RepairRequest
request_replacements = [
    (r'repairJob RepairJob\?', r'repairJob RepairJob?\n  disputeCases DisputeCase[]\n  escrowLedgers EscrowLedger[]\n  invoices Invoice[]\n  notifications NotificationLog[]\n  requestedShop Shop? @relation("RequestedShopRequests", fields: [requestedShopId], references: [id], onDelete: SetNull)\n  requestedService ShopService? @relation(fields: [requestedServiceId], references: [id], onDelete: SetNull)'),
    (r'userId            String', r'userId            String\n  requestedShopId String?\n  requestedServiceId String?')
]
for pat, repl in request_replacements:
    target_content = re.sub(pat, repl, target_content)

# 6. RepairJob
job_replacements = [
    (r'warranty      Warranty\?', r'warranty      Warranty?\n  invoices Invoice[]\n  supportTickets SupportTicket[]\n  disputeCases DisputeCase[]')
]
for pat, repl in job_replacements:
    target_content = re.sub(pat, repl, target_content)

with open(target_path, 'w', encoding='utf-8') as f:
    f.write(target_content)

print("Schema patched successfully!")
