import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Script to mark all summaries that have been annotated by a user as complete
 * This helps sync the completed status of UserSummary records with existing annotations
 */
async function markAnnotatedSummariesComplete(userEmail: string): Promise<void> {
  try {
    console.log(`Searching for user with email: ${userEmail}...`);
    
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      console.error(`Error: User with email ${userEmail} not found`);
      return;
    }

    console.log(`Found user: ${user.name} (${user.id})`);
    console.log("Searching for annotations by this user...");

    // Find all annotations by this user
    const annotations = await prisma.annotation.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        textSummaryId: true,
      }
    });

    console.log(`Found ${annotations.length} annotations by user`);

    if (annotations.length === 0) {
      console.log("No annotations found. Nothing to update.");
      return;
    }

    // Find UserSummary records that have a corresponding annotation but are not marked as completed
    const incompleteSummaries = await prisma.userSummary.findMany({
      where: {
        userId: user.id,
        completed: false,
        textSummary: {
          id: {
            in: annotations.map(a => a.textSummaryId)
          }
        }
      }
    });

    console.log(`Found ${incompleteSummaries.length} incomplete summaries that have annotations`);

    if (incompleteSummaries.length === 0) {
      console.log("All annotated summaries are already marked as complete.");
      return;
    }
    console.log(incompleteSummaries)
    // Update each UserSummary record to mark it as completed and link to its annotation
    const updatePromises = annotations.map(async (annotation) => {
      const result = await prisma.userSummary.updateMany({
        where: {
          userId: user.id,
          summaryId: annotation.textSummaryId,
          completed: false,
        },
        data: {
          completed: true,
          annotationId: annotation.id
        }
      });
      return result.count;
    });

    const updateResults = await Promise.all(updatePromises);
    const totalUpdated = updateResults.reduce((sum, count) => sum + count, 0);

    console.log(`Successfully marked ${totalUpdated} summaries as completed`);

  } catch (error) {
    console.error('Error marking annotated summaries as complete:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Set up command-line interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for email if not provided as an argument
if (process.argv.length < 3) {
  rl.question('Enter user email: ', (email) => {
    markAnnotatedSummariesComplete(email)
      .then(() => {
        console.log('Process completed');
        rl.close();
      })
      .catch((error) => {
        console.error('Script failed:', error);
        rl.close();
      });
  });
} else {
  const userEmail = process.argv[2];
  markAnnotatedSummariesComplete(userEmail)
    .then(() => {
      console.log('Process completed');
      rl.close();
    })
    .catch((error) => {
      console.error('Script failed:', error);
      rl.close();
    });
}