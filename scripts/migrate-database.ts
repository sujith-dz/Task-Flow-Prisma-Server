import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log('🚀 Starting database migration...\n');

    // Step 1: Create Roles table
    console.log('📋 Step 1: Creating roles table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "displayName" TEXT NOT NULL,
        "description" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "roles_name_key" ON "roles"("name")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "roles_name_idx" ON "roles"("name")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "roles_isActive_idx" ON "roles"("isActive")`);
    console.log('✅ Roles table created\n');

    // Step 2: Create Permissions table
    console.log('📋 Step 2: Creating permissions table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "permissions" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "displayName" TEXT NOT NULL,
        "description" TEXT,
        "category" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "permissions_name_key" ON "permissions"("name")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "permissions_category_idx" ON "permissions"("category")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "permissions_name_idx" ON "permissions"("name")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "permissions_isActive_idx" ON "permissions"("isActive")`);
    console.log('✅ Permissions table created\n');

    // Step 3: Create RolePermission mapping table
    console.log('📋 Step 3: Creating role_permissions table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "role_permissions" (
        "id" TEXT NOT NULL,
        "roleId" TEXT NOT NULL,
        "permissionId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "role_permissions_roleId_idx" ON "role_permissions"("roleId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "role_permissions_permissionId_idx" ON "role_permissions"("permissionId")`);
    console.log('✅ Role permissions table created\n');

    // Step 4: Insert default roles
    console.log('📋 Step 4: Inserting default roles...');
    const userRoleResult = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "roles" WHERE "name" = 'USER' LIMIT 1
    `;
    if (userRoleResult.length === 0) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "roles" ("id", "name", "displayName", "description", "isActive", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, 'USER', 'User', 'Standard user role with basic permissions', true, NOW(), NOW())
      `);
    }
    
    const adminRoleResult = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "roles" WHERE "name" = 'ADMIN' LIMIT 1
    `;
    if (adminRoleResult.length === 0) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "roles" ("id", "name", "displayName", "description", "isActive", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, 'ADMIN', 'Administrator', 'Full system access with all permissions', true, NOW(), NOW())
      `);
    }
    console.log('✅ Default roles inserted\n');

    // Step 5: Insert default permissions
    console.log('📋 Step 5: Inserting default permissions...');
    const permissions = [
      { name: 'tasks:create', displayName: 'Create Task', category: 'tasks' },
      { name: 'tasks:edit', displayName: 'Edit Task', category: 'tasks' },
      { name: 'tasks:delete', displayName: 'Delete Task', category: 'tasks' },
      { name: 'tasks:view', displayName: 'View Task', category: 'tasks' },
      { name: 'tasks:assign', displayName: 'Assign Task', category: 'tasks' },
      { name: 'users:create', displayName: 'Create User', category: 'users' },
      { name: 'users:edit', displayName: 'Edit User', category: 'users' },
      { name: 'users:delete', displayName: 'Delete User', category: 'users' },
      { name: 'users:view', displayName: 'View User', category: 'users' },
      { name: 'documents:upload', displayName: 'Upload Document', category: 'documents' },
      { name: 'documents:download', displayName: 'Download Document', category: 'documents' },
      { name: 'documents:delete', displayName: 'Delete Document', category: 'documents' },
    ];

    for (const perm of permissions) {
      const existing = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "permissions" WHERE "name" = ${perm.name} LIMIT 1
      `;
      if (existing.length === 0) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "permissions" ("id", "name", "displayName", "description", "category", "isActive", "createdAt", "updatedAt")
          VALUES (gen_random_uuid()::text, '${perm.name}', '${perm.displayName}', 'Permission to ${perm.displayName.toLowerCase()}', '${perm.category}', true, NOW(), NOW())
        `);
      }
    }
    console.log('✅ Default permissions inserted\n');

    // Step 6: Map permissions to roles
    console.log('📋 Step 6: Mapping permissions to roles...');
    const userRole = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "roles" WHERE "name" = 'USER' LIMIT 1
    `;
    const adminRole = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "roles" WHERE "name" = 'ADMIN' LIMIT 1
    `;

    if (userRole.length > 0 && adminRole.length > 0) {
      const userPerms = ['tasks:create', 'tasks:edit', 'tasks:delete', 'tasks:view', 'documents:upload', 'documents:download'];
      const adminPerms = ['tasks:create', 'tasks:edit', 'tasks:delete', 'tasks:view', 'tasks:assign', 'users:create', 'users:edit', 'users:delete', 'users:view', 'documents:upload', 'documents:download', 'documents:delete'];

      for (const permName of userPerms) {
        const perm = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "permissions" WHERE "name" = ${permName} LIMIT 1
        `;
        if (perm.length > 0) {
          const existing = await prisma.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM "role_permissions" WHERE "roleId" = ${userRole[0].id} AND "permissionId" = ${perm[0].id} LIMIT 1
          `;
          if (existing.length === 0) {
            await prisma.$executeRawUnsafe(`
              INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt")
              VALUES (gen_random_uuid()::text, '${userRole[0].id}', '${perm[0].id}', NOW())
            `);
          }
        }
      }

      for (const permName of adminPerms) {
        const perm = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "permissions" WHERE "name" = ${permName} LIMIT 1
        `;
        if (perm.length > 0) {
          const existing = await prisma.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM "role_permissions" WHERE "roleId" = ${adminRole[0].id} AND "permissionId" = ${perm[0].id} LIMIT 1
          `;
          if (existing.length === 0) {
            await prisma.$executeRawUnsafe(`
              INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt")
              VALUES (gen_random_uuid()::text, '${adminRole[0].id}', '${perm[0].id}', NOW())
            `);
          }
        }
      }
    }
    console.log('✅ Permissions mapped to roles\n');

    // Step 7: Add roleId column to users table
    console.log('📋 Step 7: Adding roleId column to users table...');
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "roleId" TEXT`);
      console.log('✅ roleId column added\n');
    } catch (error: any) {
      if (!error.message?.includes('already exists')) {
        throw error;
      }
      console.log('⚠️  roleId column already exists\n');
    }

    // Step 8: Migrate existing users
    console.log('📋 Step 8: Migrating existing users...');
    if (userRole.length > 0 && adminRole.length > 0) {
      await prisma.$executeRawUnsafe(`
        UPDATE "users" 
        SET "roleId" = '${userRole[0].id}' 
        WHERE "role" = 'USER' AND ("roleId" IS NULL OR "roleId" = '')
      `);
      await prisma.$executeRawUnsafe(`
        UPDATE "users" 
        SET "roleId" = '${adminRole[0].id}' 
        WHERE "role" = 'ADMIN' AND ("roleId" IS NULL OR "roleId" = '')
      `);
      await prisma.$executeRawUnsafe(`
        UPDATE "users" 
        SET "roleId" = '${userRole[0].id}' 
        WHERE "roleId" IS NULL OR "roleId" = ''
      `);
    }
    console.log('✅ Users migrated\n');

    // Step 9: Make roleId NOT NULL and add foreign key
    console.log('📋 Step 9: Setting up roleId constraints...');
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ALTER COLUMN "roleId" SET NOT NULL`);
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'users_roleId_fkey'
          ) THEN
            ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" 
              FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
        END $$;
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "users_roleId_idx" ON "users"("roleId")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "users_roleId_isActive_idx" ON "users"("roleId", "isActive")`);
      console.log('✅ Constraints added\n');
    } catch (error: any) {
      console.log('⚠️  Some constraints may already exist\n');
    }

    // Step 10: Add foreign keys for role_permissions
    console.log('📋 Step 10: Setting up role_permissions constraints...');
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_roleId_fkey'
          ) THEN
            ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" 
              FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `);
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_permissionId_fkey'
          ) THEN
            ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" 
              FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `);
      console.log('✅ Role permissions constraints added\n');
    } catch (error: any) {
      console.log('⚠️  Some constraints may already exist\n');
    }

    // Step 11: Create documents and task_document_mappings tables
    console.log('📋 Step 11: Creating document tables...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "documents" (
        "id" TEXT NOT NULL,
        "fileName" TEXT NOT NULL,
        "fileUrl" TEXT NOT NULL,
        "fileSize" INTEGER,
        "mimeType" TEXT,
        "uploadedBy" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "documents_uploadedBy_idx" ON "documents"("uploadedBy")`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "task_document_mappings" (
        "id" TEXT NOT NULL,
        "taskId" TEXT NOT NULL,
        "documentId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "task_document_mappings_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "task_document_mappings_taskId_documentId_key" ON "task_document_mappings"("taskId", "documentId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "task_document_mappings_taskId_idx" ON "task_document_mappings"("taskId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "task_document_mappings_documentId_idx" ON "task_document_mappings"("documentId")`);
    console.log('✅ Document tables created\n');

    // Step 12: Migrate existing documents
    console.log('📋 Step 12: Migrating existing documents...');
    try {
      // Check if task_documents table exists
      const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'task_documents'
        ) as exists
      `;

      if (tableExists[0]?.exists) {
        // Migrate documents
        await prisma.$executeRawUnsafe(`
          INSERT INTO "documents" ("id", "fileName", "fileUrl", "fileSize", "mimeType", "uploadedBy", "createdAt", "updatedAt")
          SELECT 
            gen_random_uuid()::text,
            td."fileName",
            td."fileUrl",
            td."fileSize",
            td."mimeType",
            td."uploadedBy",
            td."createdAt",
            td."createdAt"
          FROM "task_documents" td
          WHERE NOT EXISTS (
            SELECT 1 FROM "documents" d 
            WHERE d."fileUrl" = td."fileUrl" AND d."fileName" = td."fileName"
          )
        `);

        // Create mappings
        await prisma.$executeRawUnsafe(`
          INSERT INTO "task_document_mappings" ("id", "taskId", "documentId", "createdAt")
          SELECT 
            gen_random_uuid()::text,
            td."taskId",
            d."id",
            td."createdAt"
          FROM "task_documents" td
          JOIN "documents" d ON d."fileUrl" = td."fileUrl" AND d."fileName" = td."fileName"
          WHERE NOT EXISTS (
            SELECT 1 FROM "task_document_mappings" tdm 
            WHERE tdm."taskId" = td."taskId" AND tdm."documentId" = d."id"
          )
        `);

        // Add foreign keys
        await prisma.$executeRawUnsafe(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'task_document_mappings_taskId_fkey'
            ) THEN
              ALTER TABLE "task_document_mappings" ADD CONSTRAINT "task_document_mappings_taskId_fkey" 
                FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
            END IF;
          END $$;
        `);
        await prisma.$executeRawUnsafe(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'task_document_mappings_documentId_fkey'
            ) THEN
              ALTER TABLE "task_document_mappings" ADD CONSTRAINT "task_document_mappings_documentId_fkey" 
                FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
            END IF;
          END $$;
        `);

        console.log('✅ Documents migrated\n');
      } else {
        console.log('⚠️  task_documents table does not exist, skipping migration\n');
      }
    } catch (error: any) {
      console.log('⚠️  Document migration skipped:', error.message, '\n');
    }

    console.log('🎉 Migration completed successfully!');
    console.log('\n✅ All tables and data have been migrated.');
    console.log('⚠️  Note: The old "role" column still exists. You can drop it manually after verifying everything works.');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrate()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
