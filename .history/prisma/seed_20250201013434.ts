import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create users
  const users = await prisma.user.createMany({
    data: [
      { id: 'user1', name: 'Alice', email: 'alice@example.com', password: 'hashedpassword' },
      { id: 'user2', name: 'Bob', email: 'bob@example.com', password: 'hashedpassword' },
    ],
  });

  console.log('Users created:', users);

  // Create text-summary pairs
  const textSummaries = await prisma.textSummary.createMany({
    data: [
      { id: 'ts1', text: 'The quick brown fox jumps over the lazy dog.', summary: 'A fox jumps over a dog.' },
      { id: 'ts2', text: 'Einstein developed the theory of relativity.', summary: 'Theory of relativity by Einstein.' },
    ],
  });

  console.log('Text-Summary Pairs created:', textSummaries);

  // Create annotations
  const annotations = await prisma.annotation.createMany({
    data: [
      { userId: 'user1', textSummaryId: 'ts1', feature1: 5, feature2: 4, feature3: 3, comment: 'Good summary!' },
      { userId: 'user2', textSummaryId: 'ts1', feature1: 3, feature2: 2, feature3: 5, comment: 'Needs improvement.' },
      { userId: 'user1', textSummaryId: 'ts2', feature1: 4, feature2: 5, feature3: 4, comment: 'Accurate summary.' },
    ],
  });

  console.log('Annotations created:', annotations);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
