import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEMO_PLAYERS = ['Anna', 'Ben', 'Clara', 'David', 'Eva', 'Finn', 'Greta', 'Hannes']

async function main() {
  for (const displayName of DEMO_PLAYERS) {
    await prisma.player.upsert({
      where: { displayName },
      update: {},
      create: { displayName },
    })
  }
  console.log(`Seed: ensured ${DEMO_PLAYERS.length} demo players.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
