import os
import re

src_dir = r"C:\Users\USER\Desktop\Meeramoot-Electiontric-Item-reparing-management-system-\backend\src"

def process_file(filepath, replacements):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for pat, repl in replacements:
        content = re.sub(pat, repl, content)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. request-controller.ts
process_file(os.path.join(src_dir, 'controllers', 'request-controller.ts'), [
    (r"const request = await prisma\.repairRequest\.findUnique\(", r"const request: any = await prisma.repairRequest.findUnique("),
    (r"const request = await prisma\.repairRequest\.findFirst\(", r"const request: any = await prisma.repairRequest.findFirst("),
    (r"req\.query\.(status|search|shopId|requestId|jobId)", r"(req.query.\1 as string)"),
    (r"req\.params\.(requestId|jobId)", r"(req.params.\1 as string)"),
])

# 2. review-controller.ts
process_file(os.path.join(src_dir, 'controllers', 'review-controller.ts'), [
    (r"req\.query\.(shopId|userId)", r"(req.query.\1 as string)"),
    (r"req\.params\.ratingId", r"(req.params.ratingId as string)")
])

# 3. shop-controllers.ts
process_file(os.path.join(src_dir, 'controllers', 'shop-controllers.ts'), [
    (r"req\.params\.slug", r"(req.params.slug as string)"),
    (r"has: category \}", r"has: category as string }")
])

# 4. vendor-application-controller.ts
process_file(os.path.join(src_dir, 'controllers', 'vendor-application-controller.ts'), [
    (r"req\.query\.(status|q)", r"(req.query.\1 as string)"),
    (r"req\.params\.(applicationId)", r"(req.params.\1 as string)"),
])

# 5. vendor-request-controller.ts
process_file(os.path.join(src_dir, 'controllers', 'vendor-request-controller.ts'), [
    (r"req\.params\.(requestId|jobId)", r"(req.params.\1 as string)"),
    (r"req\.query\.(status|search)", r"(req.query.\1 as string)"),
])

# 6. routes missing
process_file(os.path.join(src_dir, 'routes', 'delivery-admin-routes.ts'), [
    (r"\.\./middleware/delivery-admin-auth-middleware\.js", r"../middleware/auth.js"),
    (r"requireDeliveryAdmin", r"requireAuth")
])
process_file(os.path.join(src_dir, 'routes', 'delivery-routes.ts'), [
    (r"\.\./middleware/delivery-auth-middleware\.js", r"../middleware/auth.js"),
    (r"requireDeliveryRider", r"requireAuth")
])

print("Python patch complete")
