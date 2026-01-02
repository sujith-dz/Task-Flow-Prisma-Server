import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function updateTasksWithoutDueDate() {
  try {
    console.log('Starting to update tasks without due dates...');

    // Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999); // Set to end of day

    // Find all tasks without due dates
    const tasksWithoutDueDate = await prisma.task.findMany({
      where: {
        dueDate: null,
        isDeleted: false,
      },
    });

    console.log(`Found ${tasksWithoutDueDate.length} tasks without due dates`);

    if (tasksWithoutDueDate.length === 0) {
      console.log('No tasks to update.');
      return;
    }

    // Update all tasks to have tomorrow as due date
    const result = await prisma.task.updateMany({
      where: {
        dueDate: null,
        isDeleted: false,
      },
      data: {
        dueDate: tomorrow,
      },
    });

    console.log(`✅ Successfully updated ${result.count} tasks with due date: ${tomorrow.toISOString()}`);
    console.log(`Due date set to: ${tomorrow.toLocaleDateString()} ${tomorrow.toLocaleTimeString()}`);
  } catch (error) {
    console.error('❌ Error updating tasks:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateTasksWithoutDueDate()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

