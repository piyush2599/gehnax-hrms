# HRMS Setup Guide

## Environment Variables (.env.local)

```env
# MongoDB Atlas (free tier)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/hrms?retryWrites=true&w=majority

# NextAuth (generate with: openssl rand -base64 32)
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-super-secret-key-min-32-chars

# Your File Server
FILE_SERVER_URL=http://your-file-server.com
FILE_SERVER_API_KEY=your-api-key
```

## Deploy to Vercel

1. Push to GitHub
2. Connect repo on vercel.com
3. Add environment variables in Vercel dashboard
4. Deploy

## Seed Initial Data

After first deploy, visit:
```
POST https://your-app.vercel.app/api/seed
```

This creates:
| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@hrms.com | Admin@123 |
| HR Admin | hr@hrms.com | Hr@123456 |
| Employee | john@hrms.com | Emp@123456 |

## PWA (Mobile App)

1. Open the deployed URL in Chrome on mobile
2. Tap the browser menu (3 dots)
3. Select "Add to Home Screen"
4. The app installs like a native app

## Add Employees

- Login as Super Admin or HR Admin
- Go to Employees → Add Employee
- Default password for new employees: `Welcome@123`

## Modules

- **Dashboard** — Stats, attendance trend, announcements
- **Employees** — Full CRUD, profiles, salary structure
- **Departments** — Department management
- **Attendance** — Clock in/out, manual entry, monthly reports
- **Leaves** — Apply, approve/reject, balance tracking
- **Timesheets** — Weekly entries, manager approval
- **Payroll** — Auto-calculate, salary slips
- **Announcements** — Company notices

## Roles

| Role | Permissions |
|------|------------|
| Super Admin | Full access |
| HR Admin | Employees, payroll, attendance, leaves |
| Manager | Team leaves, timesheets approval |
| Employee | Own attendance, leaves, timesheets, salary slips |
