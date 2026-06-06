import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with templates...');

  // 1. Template: Fitness Jumpstart
  await prisma.templateLibrary.upsert({
    where: { id: 'template_fitness_1' },
    update: {},
    create: {
      id: 'template_fitness_1',
      category: 'fitness',
      title: 'Fitness Jumpstart',
      description: 'A 7-day plan to get your heart rate up and build a habit of daily movement.',
      difficulty: 'beginner',
      goals: [
        {
          title: 'Drink 2L of water',
          type: 'checklist',
          frequency: 'daily',
          requiresProof: true,
        },
        {
          title: '15 Min Cardio',
          type: 'duration',
          frequency: 'daily',
          targetValue: 15,
          unit: 'minutes',
          requiresProof: true,
        },
      ],
      durationDays: 7,
      createdBy: 'system',
    },
  });

  // 2. Template: Digital Detox
  await prisma.templateLibrary.upsert({
    where: { id: 'template_detox_1' },
    update: {},
    create: {
      id: 'template_detox_1',
      category: 'wellness',
      title: 'Digital Detox',
      description: 'Reduce screen time and be more present in the real world.',
      difficulty: 'intermediate',
      goals: [
        {
          title: 'No phone 1 hour before bed',
          type: 'checklist',
          frequency: 'daily',
          requiresProof: false,
        },
        {
          title: 'Read 10 pages of a book',
          type: 'checklist',
          frequency: 'daily',
          requiresProof: true,
        },
      ],
      durationDays: 14,
      createdBy: 'system',
    },
  });

  // 3. Template: Productivity Hacker
  await prisma.templateLibrary.upsert({
    where: { id: 'template_prod_1' },
    update: {},
    create: {
      id: 'template_prod_1',
      category: 'productivity',
      title: 'Productivity Hacker',
      description: 'Master your time with deep work sessions.',
      difficulty: 'advanced',
      goals: [
        {
          title: 'Deep Work Session',
          type: 'duration',
          frequency: 'daily',
          targetValue: 120,
          unit: 'minutes',
          requiresProof: false,
        },
        {
          title: 'Plan tomorrow today',
          type: 'checklist',
          frequency: 'daily',
          requiresProof: true,
        },
      ],
      durationDays: 21,
      createdBy: 'system',
    },
  });

  // 4. Template: Mindfulness 101
  await prisma.templateLibrary.upsert({
    where: { id: 'template_mind_1' },
    update: {},
    create: {
      id: 'template_mind_1',
      category: 'wellness',
      title: 'Mindfulness 101',
      description: 'Daily meditation and gratitude practice.',
      difficulty: 'beginner',
      goals: [
        {
          title: 'Meditate',
          type: 'duration',
          frequency: 'daily',
          targetValue: 10,
          unit: 'minutes',
          requiresProof: false,
        },
        {
          title: 'Write 3 things you are grateful for',
          type: 'checklist',
          frequency: 'daily',
          requiresProof: true,
        },
      ],
      durationDays: 30,
      createdBy: 'system',
    },
  });

  // 5. Template: Couples Reconnect
  await prisma.templateLibrary.upsert({
    where: { id: 'template_couples_1' },
    update: {},
    create: {
      id: 'template_couples_1',
      category: 'relationship',
      title: 'Couples Reconnect',
      description: 'Strengthen your bond with daily intentional actions.',
      difficulty: 'beginner',
      goals: [
        {
          title: 'Give a genuine compliment',
          type: 'checklist',
          frequency: 'daily',
          requiresProof: false,
        },
        {
          title: '15 mins undivided attention',
          type: 'duration',
          frequency: 'daily',
          targetValue: 15,
          unit: 'minutes',
          requiresProof: false,
        },
      ],
      durationDays: 14,
      createdBy: 'system',
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
