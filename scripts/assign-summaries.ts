import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function assignSummariesToUser(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      throw new Error(`No user found with email: ${email}`)
    }

    console.log(`Found user: ${user.name} (${user.id})`)

    const summaries = await prisma.textSummary.findMany()
    console.log(`Found ${summaries.length} summaries to assign`)

    const assignments = await Promise.all(
      summaries.map(summary => 
        prisma.userSummary.create({
          data: {
            userId: user.id,
            summaryId: summary.id
          }
        }).catch(error => {
          if (error.code === 'P2002') {
            console.log(`Summary ${summary.id} already assigned to user`)
            return null
          }
          throw error
        })
      )
    )

    const successfulAssignments = assignments.filter(a => a !== null)
    console.log(`Successfully assigned ${successfulAssignments.length} new summaries to user`)

  } catch (error) {
    console.error('Error assigning summaries:', error)
  } finally {
    await prisma.$disconnect()
  }
}

const email = process.argv[2]
if (!email) {
  console.error('Please provide an email address as an argument')
  process.exit(1)
}

assignSummariesToUser(email)
  .then(() => console.log('Done!'))
  .catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  }) 