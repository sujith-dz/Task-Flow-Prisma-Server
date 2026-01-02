import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function migrateToMultipleAssignees() {
  try {
    console.log('Starting migration to multiple assignees...');

    // Get all tasks that have an assigneeId
    const tasksWithAssignee = await prisma.$queryRaw`
      SELECT id, "assigneeId" 
      FROM tasks 
      WHERE "assigneeId" IS NOT NULL 
      AND "isDeleted" = false
    ` as Array<{ id: string; assigneeId: string }>;

    console.log(`Found ${tasksWithAssignee.length} tasks with assignees to migrate`);

    if (tasksWithAssignee.length === 0) {
      console.log('No tasks to migrate.');
      return;
    }

    // Create TaskAssignee records for each task
    let migrated = 0;
    for (const task of tasksWithAssignee) {
      try {
        // Check if TaskAssignee already exists
        const existing = await prisma.taskAssignee.findFirst({
          where: {
            taskId: task.id,
            userId: task.assigneeId,
          },
        });

        if (!existing) {
          await prisma.taskAssignee.create({
            data: {
              taskId: task.id,
              userId: task.assigneeId,
            },
          });
          migrated++;
        }
      } catch (error) {
        console.error(`Error migrating task ${task.id}:`, error);
      }
    }

    console.log(`✅ Successfully migrated ${migrated} task assignee relationships`);
    console.log('Migration completed. You can now remove the assigneeId column from the tasks table manually if needed.');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateToMultipleAssignees()
  .then(() => {
    console.log('Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });

