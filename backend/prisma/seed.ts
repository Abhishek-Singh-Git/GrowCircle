import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with templates...');

  // 1. Template: Fitness Jumpstart
  await prisma.goalTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      category: 'fitness',
      name: 'Fitness Jumpstart',
      description: 'A 7-day plan to get your heart rate up and build a habit of daily movement.',
      goalsJson: [
        {
          name: 'Drink 2L of water',
          goalType: 'checklist',
          scheduleType: 'daily',
          requireProof: true,
        },
        {
          name: '15 Min Cardio',
          goalType: 'duration',
          scheduleType: 'daily',
          targetValue: 15,
          targetUnit: 'minutes',
          requireProof: true,
        },
      ],
      isActive: true,
    },
  });

  // 2. Template: Digital Detox
  await prisma.goalTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      category: 'wellness',
      name: 'Digital Detox',
      description: 'Reduce screen time and be more present in the real world.',
      goalsJson: [
        {
          name: 'No phone 1 hour before bed',
          goalType: 'checklist',
          scheduleType: 'daily',
          requireProof: false,
        },
        {
          name: 'Read 10 pages of a book',
          goalType: 'checklist',
          scheduleType: 'daily',
          requireProof: true,
        },
      ],
      isActive: true,
    },
  });

  // 3. Template: Productivity Hacker
  await prisma.goalTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      category: 'productivity',
      name: 'Productivity Hacker',
      description: 'Master your time with deep work sessions.',
      goalsJson: [
        {
          name: 'Deep Work Session',
          goalType: 'duration',
          scheduleType: 'daily',
          targetValue: 120,
          targetUnit: 'minutes',
          requireProof: false,
        },
        {
          name: 'Plan tomorrow today',
          goalType: 'checklist',
          scheduleType: 'daily',
          requireProof: true,
        },
      ],
      isActive: true,
    },
  });

  // 4. Template: Mindfulness 101
  await prisma.goalTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      category: 'wellness',
      name: 'Mindfulness 101',
      description: 'Daily meditation and gratitude practice.',
      goalsJson: [
        {
          name: 'Meditate',
          goalType: 'duration',
          scheduleType: 'daily',
          targetValue: 10,
          targetUnit: 'minutes',
          requireProof: false,
        },
        {
          name: 'Write 3 things you are grateful for',
          goalType: 'checklist',
          scheduleType: 'daily',
          requireProof: true,
        },
      ],
      isActive: true,
    },
  });

  // 5. Template: Couples Reconnect
  await prisma.goalTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000005' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000005',
      category: 'relationship',
      name: 'Couples Reconnect',
      description: 'Strengthen your bond with daily intentional actions.',
      goalsJson: [
        {
          name: 'Give a genuine compliment',
          goalType: 'checklist',
          scheduleType: 'daily',
          requireProof: false,
        },
        {
          name: '15 mins undivided attention',
          goalType: 'duration',
          scheduleType: 'daily',
          targetValue: 15,
          targetUnit: 'minutes',
          requireProof: false,
        },
      ],
      isActive: true,
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
