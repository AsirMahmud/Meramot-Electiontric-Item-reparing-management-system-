import re
import os

filepath = r'C:\Users\USER\Desktop\Meeramoot-Electiontric-Item-reparing-management-system-\frontend\src\app\admin\login\page.tsx'

if os.path.exists(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove demo login body and replace with standard auth
    content = re.sub(
        r'const res = await fetch\(`\$\{env\.backendUrl\}/api/auth/admin-demo-login`[\s\S]*?\n\s*\}\);', 
        '''const res = await fetch(`${env.backendUrl}/api/auth/login`, {\n        method: "POST",\n        headers: { "Content-Type": "application/json" },\n        body: JSON.stringify({ email: identifier, password })\n      });''', 
        content
    )

    # 2. Change /admin-demo-login strings
    content = re.sub(r'/api/auth/admin-demo-login', r'/api/auth/login', content)

    # 3. Add token storing if not present
    if 'localStorage.setItem("meramot.token"' not in content:
        content = re.sub(
            r'(const \{ user, token \} = data;)',
            r'\1\n      if (token) localStorage.setItem("meramot.token", token);',
            content
        )

    # 4. Role check
    if 'user.role !== "ADMIN"' not in content:
        content = re.sub(
            r'(if \(!user\) \{)',
            r'if (user?.role !== "ADMIN") {\n        setError("Only admins can log in here");\n        return;\n      }\n      \1',
            content
        )
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Patched frontend admin login page.')
else:
    print('Frontend admin login page not found.')

backend_auth = r'C:\Users\USER\Desktop\Meeramoot-Electiontric-Item-reparing-management-system-\backend\src\routes\auth-routes.ts'
if os.path.exists(backend_auth):
    with open(backend_auth, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove admin-demo-login
    content = re.sub(r'router\.post\("/admin-demo-login",[\s\S]*?\}\);', '', content)
    
    with open(backend_auth, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Patched backend auth routes.')
