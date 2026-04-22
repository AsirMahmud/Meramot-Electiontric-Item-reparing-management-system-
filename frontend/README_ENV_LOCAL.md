# Local Environment Setup

This project uses local `.env` files for secrets and machine-specific config.

## Important
Do not commit real secrets to GitHub.

Make sure files like `.env.local` and backend `.env` stay ignored by git.

---

## Frontend env setup

Create this file:

```bash
frontend/.env.local

##Paste this block inside 
##Start
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=my-super-long-random-secret-123456789
AUTH_SECRET=my-super-long-random-secret-123456789
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
##End