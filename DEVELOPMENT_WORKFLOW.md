# SongSymmetry Development Workflow

## 🔄 Database Strategy

### **Local Development Database**
- **Purpose:** Development, testing, experimentation
- **Data:** Can be reset, modified, or reloaded anytime
- **Schema:** Where you develop and test schema changes

### **Remote Database** 
- **Purpose:** Production/staging environment
- **Data:** Preserved production data
- **Schema:** Updated via migrations from local development

## 📋 Development Workflow

### **1. Daily Development**
```bash
# Ensure you're on local database
./scripts/switch-db.sh local

# Start development server
npm run dev

# Your changes only affect local database
```

### **2. Schema Changes (Database Structure)**

When you need to modify the database schema (add tables, columns, etc.):

```bash
# 1. Work on local database
./scripts/switch-db.sh local

# 2. Modify prisma/schema.prisma
# 3. Apply changes locally
npx prisma db push

# 4. Test your changes thoroughly
# 5. Generate migration file
npx prisma migrate dev --name describe_your_change

# 6. Commit schema + migration files
git add prisma/
git commit -m "feat(db): add new feature table"
```

### **3. Deploying Schema Changes**

When ready to deploy schema changes to remote:

```bash
# 1. Switch to remote database
./scripts/switch-db.sh remote

# 2. Apply pending migrations
npx prisma migrate deploy

# 3. Generate Prisma client for remote schema
npx prisma generate

# 4. Test that remote database works
curl http://localhost:3000/api/system/health

# 5. Deploy your application
git push origin dev
```

### **4. Data Management**

**Local Data (Development):**
- Import fresh data: `curl -X POST http://localhost:3000/api/system/setup`
- Reset database: `npx prisma db push --force-reset`
- Safe to experiment with

**Remote Data (Production):**
- **Never manually modify** production data
- Use migration scripts for data changes
- Always backup before major changes

## 🛠 Common Commands

### **Database Switching**
```bash
./scripts/switch-db.sh status  # Check current database
./scripts/switch-db.sh local   # Switch to local development
./scripts/switch-db.sh remote  # Switch to production/remote
```

### **Local Development**
```bash
# Fresh start with clean data
npx prisma db push --force-reset
curl -X POST http://localhost:3000/api/system/setup

# View database
npx prisma studio

# Check system status
curl http://localhost:3000/api/system/health
```

### **Schema Development**
```bash
# Develop schema changes
npx prisma db push              # Quick prototype (local only)
npx prisma migrate dev          # Create proper migration
npx prisma migrate reset        # Reset and replay all migrations
```

### **Production Deployment**
```bash
# Deploy schema changes to remote
./scripts/switch-db.sh remote
npx prisma migrate deploy
npx prisma generate
```

## 🚀 Deployment Process

### **Automatic Deployment (Recommended)**

When you push to `dev` branch:
1. **Vercel deploys** your application
2. **Prisma migrations** run automatically via `prisma migrate deploy`
3. **Remote database** gets updated with schema changes
4. **Production data** is preserved

### **Manual Deployment (If Needed)**

```bash
# 1. Test locally first
./scripts/switch-db.sh local
npm run dev  # Test everything works

# 2. Apply to remote
./scripts/switch-db.sh remote
npx prisma migrate deploy

# 3. Deploy application
git push origin dev
```

## ⚠️ Important Guidelines

### **DO:**
- ✅ Develop and test on local database
- ✅ Use migrations for schema changes
- ✅ Test migrations locally before deployment
- ✅ Commit schema.prisma and migration files together
- ✅ Use `npx prisma db push` for quick local prototyping

### **DON'T:**
- ❌ Modify production database directly
- ❌ Use `db push` on production (use migrations)
- ❌ Commit without testing migrations
- ❌ Delete migration files once committed
- ❌ Mix data changes with schema changes

## 🔧 Troubleshooting

### **Migration Conflicts**
```bash
# Reset local database and replay migrations
npx prisma migrate reset

# Or start fresh
npx prisma db push --force-reset
```

### **Schema Drift**
```bash
# If local schema differs from remote
npx prisma db pull              # Pull remote schema
npx prisma migrate dev          # Create migration for differences
```

### **Lost Local Data**
```bash
# Reimport fresh data
curl -X POST http://localhost:3000/api/system/setup
```

## 📈 Benefits of This Workflow

- **Safe Development:** Local changes don't affect production
- **Fast Iteration:** No network latency on local database
- **Proper Migrations:** Schema changes are tracked and reproducible
- **Data Isolation:** Development data separate from production
- **Team Collaboration:** Everyone can work independently
- **Rollback Safety:** Migrations can be reverted if needed

## 🎯 Summary

**Local Database = Development playground**  
**Remote Database = Production environment**  
**Migrations = Safe way to deploy schema changes**

Your workflow: Develop locally → Test thoroughly → Create migration → Deploy to remote 🚀