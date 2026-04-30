import re

filepath = r'C:\Users\USER\Desktop\Meeramoot-Electiontric-Item-reparing-management-system-\backend\prisma\schema.prisma'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: VendorApplication
# We already used createdAt.

# Fix 2: Support Ticket
content = re.sub(r'enum SupportTicketStatus \{([\s\S]*?)\}', lambda m: m.group(0) if 'ESCALATED' in m.group(1) else m.group(0).replace('CLOSED', 'CLOSED\n  ESCALATED'), content)

# Check assignedAdmin vs assigneeAdmin
content = re.sub(r'assigneeAdmin', r'assignedAdmin', content)
content = re.sub(r'assigneeAdminId', r'assignedAdminId', content)

# Add SupportMessage model if missing
support_msg = '''
model SupportMessage {
  id             String        @id @default(cuid())
  ticketId       String
  authorId       String
  senderType     String
  message        String
  attachmentUrls String[]
  createdAt      DateTime      @default(now())

  ticket SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  author User          @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([ticketId])
  @@index([authorId])
}
'''
if 'model SupportMessage' not in content:
    content += '\n' + support_msg

# Add messages SupportMessage[] to SupportTicket
if 'messages       SupportMessage[]' not in content:
    content = re.sub(r'(adminNotes      String\?\n  createdAt       DateTime            @default\(now\(\)\)\n  updatedAt       DateTime            @updatedAt\n\n  user User @relation\(fields: \[userId\], references: \[id\], onDelete: Cascade\))', r'\1\n  messages       SupportMessage[]\n  assignedAdmin User? @relation("TicketAssignee", fields: [assignedAdminId], references: [id])\n  assignedAdminId String?', content)

# Add messages SupportMessage[] to User
if 'supportMessages        SupportMessage[]' not in content:
    content = re.sub(r'(assignedSupportTickets     SupportTicket\[\]      @relation\("TicketAssignee"\))', r'\1\n  supportMessages        SupportMessage[]', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Patched schema.prisma')
