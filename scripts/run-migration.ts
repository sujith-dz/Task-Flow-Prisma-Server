import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('Starting migration...');

    // Read the migration SQL file
    const migrationPath = path.join(
      __dirname,
      '../prisma/migrations/20260109164215_add_roles_permissions_system/migration.sql'
    );
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          // Skip DO blocks as they need special handling
          if (statement.toUpperCase().includes('DO $$')) {
            console.log(`Skipping DO block ${i + 1}...`);
            continue;
          }
          
          await prisma.$executeRawUnsafe(statement);
          console.log(`✓ Executed statement ${i + 1}/${statements.length}`);
        } catch (error: any) {
          // Ignore "already exists" errors
          if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
            console.log(`⚠ Statement ${i + 1} skipped (already exists)`);
          } else {
            console.error(`✗ Error in statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }

    // Handle DO blocks separately
    console.log('Handling data migration blocks...');
    
    // Get role IDs
    const userRole = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "roles" WHERE "name" = 'USER' LIMIT 1
    `;
    const adminRole = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "roles" WHERE "name" = 'ADMIN' LIMIT 1
    `;

    if (userRole.length > 0 && adminRole.length > 0) {
      // Update users with roleId
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
      
      console.log('✓ User role migration completed');
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runMigration()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
