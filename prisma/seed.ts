import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

async function main() {
  // Create mock users
  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      name: 'John Doe',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      name: 'Jane Smith',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
    },
  })

  const user3 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      name: 'Bob Wilson',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
    },
  })

  // Create a mock squad
  const squad = await prisma.squad.create({
    data: {
      name: 'Weekend Trip',
      description: 'Trip to the mountains',
      members: {
        create: [
          {
            userId: user1.id,
            role: 'ADMIN',
          },
          {
            userId: user2.id,
            role: 'MEMBER',
          },
          {
            userId: user3.id,
            role: 'MEMBER',
          },
        ],
      },
      inviteCodes: {
        create: {
          code: uuidv4(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    },
  })

  // Create mock expenses
  const expenses = [
    {
      amount: 120.50,
      description: 'Groceries for the trip',
      paidById: user1.id,
      squadId: squad.id,
      date: new Date('2024-03-15'),
      splits: {
        create: [
          { userId: user1.id, amount: 40.17 },
          { userId: user2.id, amount: 40.17 },
          { userId: user3.id, amount: 40.16 },
        ],
      },
    },
    {
      amount: 75.00,
      description: 'Gas',
      paidById: user2.id,
      squadId: squad.id,
      date: new Date('2024-03-16'),
      splits: {
        create: [
          { userId: user1.id, amount: 25.00 },
          { userId: user2.id, amount: 25.00 },
          { userId: user3.id, amount: 25.00 },
        ],
      },
    },
    {
      amount: 90.00,
      description: 'Dinner',
      paidById: user3.id,
      squadId: squad.id,
      date: new Date('2024-03-16'),
      splits: {
        create: [
          { userId: user1.id, amount: 30.00 },
          { userId: user2.id, amount: 30.00 },
          { userId: user3.id, amount: 30.00 },
        ],
      },
    },
  ]

  for (const expense of expenses) {
    await prisma.expense.create({
      data: expense,
    })
  }

  console.log('Seed data created successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 