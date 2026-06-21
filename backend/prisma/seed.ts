import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password";
import { buildPin } from "../src/utils/pin";

const prisma = new PrismaClient();

const SEED_TEACHER = {
  email: process.env.SEED_TEACHER_EMAIL ?? "teacher@example.com",
  password: process.env.SEED_TEACHER_PASSWORD ?? "ChangeMe123!",
  name: process.env.SEED_TEACHER_NAME ?? "Class Teacher",
};

const DEMO_STUDENT_NAMES = [
  "Rahul Kumar",
  "Ajay Reddy",
  "Priya Sharma",
  "Sneha Patel",
  "Vikram Singh",
  "Anjali Gupta",
];

async function main() {
  console.log(`Seeding database...`);

  let teacher = await prisma.teacher.findUnique({ where: { email: SEED_TEACHER.email } });
  if (!teacher) {
    const passwordHash = await hashPassword(SEED_TEACHER.password);
    teacher = await prisma.teacher.create({
      data: { name: SEED_TEACHER.name, email: SEED_TEACHER.email, passwordHash },
    });
    console.log(`Created teacher: ${teacher.email}`);
  } else {
    console.log(`Teacher already exists: ${teacher.email}`);
  }

  const existingSettings = await prisma.settings.findUnique({ where: { teacherId: teacher.id } });
  if (!existingSettings) {
    await prisma.settings.create({
      data: {
        teacherId: teacher.id,
        institutionName: "ABC Polytechnic College",
        teacherDisplayName: teacher.name,
        upiId: "teacher@upi",
        defaultAmount: 300,
      },
    });
    console.log("Created default settings");
  }

  let cls = await prisma.class.findFirst({ where: { teacherId: teacher.id, name: "CSE-A" } });
  if (!cls) {
    cls = await prisma.class.create({ data: { teacherId: teacher.id, name: "CSE-A" } });
    console.log(`Created class: ${cls.name}`);
  }

  const createdStudents = [];
  for (let i = 0; i < DEMO_STUDENT_NAMES.length; i++) {
    const pin = buildPin("25007", i + 1);
    let student = await prisma.student.findUnique({ where: { pin } });
    if (!student) {
      student = await prisma.student.create({
        data: { name: DEMO_STUDENT_NAMES[i], pin, classId: cls.id },
      });
      console.log(`Created student: ${student.name} (${student.pin})`);
    }
    createdStudents.push(student);
  }

  let collection = await prisma.collection.findFirst({ where: { teacherId: teacher.id, name: "Lab Fee" } });
  if (!collection) {
    collection = await prisma.collection.create({
      data: { teacherId: teacher.id, name: "Lab Fee", amount: 300, isActive: true },
    });
    console.log(`Created collection: ${collection.name}`);
  }

  for (const student of createdStudents) {
    await prisma.payment.upsert({
      where: { studentId_collectionId: { studentId: student.id, collectionId: collection.id } },
      update: {},
      create: { studentId: student.id, collectionId: collection.id, status: "PENDING_PAYMENT" },
    });
  }
  console.log("Ensured payment rows exist for all demo students");

  console.log("\nSeed complete.");
  console.log(`Teacher login: ${SEED_TEACHER.email} / ${SEED_TEACHER.password}`);
  console.log(`Sample student PIN: ${buildPin("25007", 1)}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
