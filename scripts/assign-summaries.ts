import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

/**
 * Assign summaries to a specific user
 * This script will take all unassigned summaries and assign them to a user
 */
async function assignSummaries(userEmail: string, count?: number): Promise<void> {
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      console.error(`User with email ${userEmail} not found`)
      return
    }

    console.log(`Assigning summaries to user: ${user.name} (${userId})`)

    // Get summaries that are not assigned to this user
    // const assignedSummaryIds = await prisma.userSummary.findMany({
    //   where: { userId },
    //   select: { summaryId: true }
    // })
    const assignedSummaryIds =
[
  'f1084f0a-0542-4d3c-8d63-ace0c3bf3f3c',
  '4e1be9a2-9081-432b-b015-54801d519419',
  '7091269e-e9e4-4548-bb97-846134d9c038',
  '908bcb09-1c17-4484-b19e-e38f8d23ac12',
  '6086f41e-4f51-4781-8de6-d5e1207187bc',
  '0f9cd81a-7b05-490d-8c43-e645190b163c',
  'db657f4a-6270-4fc3-b964-7eda9cb7e3c5',
  '417a1c5e-39c4-4e13-bc15-237af41a15e2',
  '88ccbe48-ce43-47f6-8d3a-1715316504ca',
  '30a0abe8-3714-4892-afb7-686ad2dffcfd',
  '057ce5af-5804-47cd-af12-566b5a786f57',
  '7b9164b9-c9b6-4a52-a1ff-c1b7d72bac66',
  '9997dd8f-4f89-433b-887b-86ee1eeef552',
  '8e5ec213-bf3d-4d4d-999f-6a4baf5d3666',
  '17e28e0a-645a-42a2-a923-aa398f979b51'
]



    // const assignedIds = assignedSummaryIds.map(item => item.summaryId)
    
    // Find summaries not assigned to this user
    // const availableSummaries = await prisma.textSummary.findMany({
    //   where: {
    //     id: {
    //       notIn: assignedIds
    //     }
    //   },
    //   select: {
    //     id: true
    //   },
    //   take: count // Limit the number of summaries if specified
    // })

    // if (availableSummaries.length === 0) {
    //   console.log('No unassigned summaries found')
    //   return
    // }

    // console.log(`Found ${availableSummaries.length} summaries to assign`)

    // Create assignment records
    const assignmentData = assignedSummaryIds.map(id => ({
      id: uuidv4(),
      userId: user.id,
      summaryId: id,
      assignedAt: new Date(),
      completed: false
    }))

    // Create assignments in batches
    const batchSize = 50
    const batches = Math.ceil(assignmentData.length / batchSize)

    for (let i = 0; i < batches; i++) {
      const batch = assignmentData.slice(i * batchSize, (i + 1) * batchSize)
      
      const result = await prisma.userSummary.createMany({
        data: batch,
        skipDuplicates: true
      })

      console.log(`Batch ${i + 1}/${batches}: Assigned ${result.count} summaries`)
    }

    console.log(`Assignment completed: ${assignmentData.length} summaries assigned to user ${user.name}`)
  } catch (error) {
    console.error('Error assigning summaries:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Check if required arguments are provided
if (process.argv.length < 3) {
  console.error('Please provide a user ID')
  console.error('Usage: npx ts-node scripts/assign-summaries.ts USER_ID [COUNT]')
  process.exit(1)
}

const userId = process.argv[2]
const count = process.argv[3] ? parseInt(process.argv[3], 10) : undefined

// Run the assignment
assignSummaries(userId, count)
  .then(() => {
    console.log('Assignment process completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Assignment process failed:', error)
    process.exit(1)
  }) 
