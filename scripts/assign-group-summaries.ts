import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

/**
 * Assign group summaries to a specific user
 * This script will assign all summaries from abstracts of a specific level to a user
 */
async function assignGroupSummaries(userEmail: string, level: string): Promise<void> {
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      console.error(`User with email ${userEmail} not found`)
      return
    }

    console.log(`Assigning group summaries to user: ${user.name} (${user.id})`)
    console.log(`Level: ${level}`)

    // Get all abstracts of the specified level that have exactly 3 summaries
    const abstractsWithThreeSummaries = await prisma.abstractGroup.findMany({
      where: {
        level: level
      },
      include: {
        summaries: {
          select: {
            id: true,
            summaryType: true
          }
        }
      }
    })

    // Filter to only abstracts with exactly 3 summaries
    const abstractsWithExactlyThreeSummaries = abstractsWithThreeSummaries.filter(
      abstract => abstract.summaries.length === 3
    )

    console.log(`Found ${abstractsWithExactlyThreeSummaries.length} abstracts with level '${level}' and exactly 3 summaries`)

    if (abstractsWithExactlyThreeSummaries.length === 0) {
      console.log(`No abstracts with level '${level}' and exactly 3 summaries found`)
      return
    }

    // Get existing UserGroup assignments for this user to avoid duplicates
    const existingAssignments = await prisma.userGroup.findMany({
      where: {
        userID: user.id
      },
      select: {
        abstractID: true
      }
    })

    const existingAbstractIds = new Set(existingAssignments.map(a => a.abstractID))

    // Find abstracts that haven't been assigned to this user yet
    const availableAbstracts = abstractsWithExactlyThreeSummaries.filter(abstract => {
      return !existingAbstractIds.has(abstract.id)
    })

    if (availableAbstracts.length === 0) {
      console.log(`No available abstracts with level '${level}' for user ${userEmail}. All abstracts of this level have already been assigned.`)
      return
    }

    console.log(`Found ${availableAbstracts.length} available abstracts to assign`)

    // Create UserGroup assignments for all summaries from all available abstracts
    const userGroupAssignments = []
    
    for (const abstract of availableAbstracts) {
      console.log(`Assigning abstract ${abstract.id} to user ${userEmail}`)
      console.log(`Abstract summaries: ${abstract.summaries.map((s: any) => `${s.summaryType} (${s.id})`).join(', ')}`)

      const abstractAssignments = abstract.summaries.map((summary: any) => ({
        id: uuidv4(),
        userID: user.id,
        summaryID: summary.id,
        abstractID: abstract.id,
        assignedAt: new Date(),
        completed: false
      }))

      userGroupAssignments.push(...abstractAssignments)
    }

    // Create assignments in batches
    const batchSize = 50
    const batches = Math.ceil(userGroupAssignments.length / batchSize)

    for (let i = 0; i < batches; i++) {
      const batch = userGroupAssignments.slice(i * batchSize, (i + 1) * batchSize)
      
      const result = await prisma.userGroup.createMany({
        data: batch,
        skipDuplicates: true
      })

      console.log(`Batch ${i + 1}/${batches}: Assigned ${result.count} summaries`)
    }

    console.log(`Assignment completed: ${userGroupAssignments.length} summaries assigned to user ${user.name}`)

    // Show the assignment details
    const newAssignments = await prisma.userGroup.findMany({
      where: {
        userID: user.id,
        abstractID: {
          in: availableAbstracts.map(a => a.id)
        }
      },
      include: {
        abstract: {
          select: {
            pmid: true,
            level: true
          }
        },
        summary: {
          select: {
            summaryType: true
          }
        }
      },
      orderBy: {
        abstractID: 'asc'
      }
    })

    console.log(`\nNew assignments for user ${user.name}:`)
    let currentAbstractId = ''
    newAssignments.forEach(assignment => {
      if (assignment.abstractID !== currentAbstractId) {
        console.log(`\nAbstract: ${assignment.abstractID} (PMID: ${assignment.abstract.pmid}, Level: ${assignment.abstract.level})`)
        currentAbstractId = assignment.abstractID
      }
      console.log(`  Summary: ${assignment.summaryID} (${assignment.summary.summaryType})`)
    })

  } catch (error) {
    console.error('Error assigning group summaries:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Check if required arguments are provided
if (process.argv.length < 4) {
  console.error('Please provide a user email and level')
  console.error('Usage: npx ts-node scripts/assign-group-summaries.ts USER_EMAIL LEVEL')
  console.error('Available levels: LAYMAN, PREMED, RESEARCHER, EXPERT')
  process.exit(1)
}

const userEmail = process.argv[2]
const level = process.argv[3]

// Validate level
const validLevels = ['LAYMAN', 'PREMED', 'RESEARCHER', 'EXPERT']
if (!validLevels.includes(level)) {
  console.error(`Invalid level: ${level}`)
  console.error('Available levels: LAYMAN, PREMED, RESEARCHER, EXPERT')
  process.exit(1)
}

// Run the assignment
assignGroupSummaries(userEmail, level)
  .then(() => {
    console.log('Group assignment process completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Group assignment process failed:', error)
    process.exit(1)
  }) 