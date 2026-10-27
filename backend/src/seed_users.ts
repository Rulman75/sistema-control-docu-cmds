import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USERS = [
  {
    rut: '12.345.678-9',
    name: 'Rodrigo Hormazábal',
    email: 'rhormazabal@cmds.cl',
    role: 'SUPERADMIN',
    department: 'CASA_CENTRAL',
  },
  {
    rut: '14.567.890-1',
    name: 'María Tapia Cortés',
    email: 'mtapia@cmds.cl',
    role: 'DIRECTOR',
    department: 'CASA_CENTRAL',
  },
  {
    rut: '11.222.333-4',
    name: 'Carlos Mondaca Valdés',
    email: 'cmondaca@cmds.cl',
    role: 'JEFE_DEPTO',
    department: 'DAF',
  },
  {
    rut: '15.444.555-6',
    name: 'Patricia Alvear Silva',
    email: 'palvear@cmds.cl',
    role: 'FUNCIONARIO',
    department: 'EDUCACION',
  },
  {
    rut: '13.777.888-9',
    name: 'Dr. Jorge Rojas Miranda',
    email: 'jrojas@cmds.cl',
    role: 'FUNCIONARIO',
    department: 'SALUD',
  },
  {
    rut: '16.999.000-K',
    name: 'Lorena Valenzuela Ortiz',
    email: 'lvalenzuela@cmds.cl',
    role: 'AUDITOR_CONTRALORIA',
    department: 'CASA_CENTRAL',
  },
];

async function seedUsers() {
  console.log('Seeding initial CMDS users for RBAC...');
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { rut: u.rut },
      update: u,
      create: u,
    });
  }
  console.log('✅ Usuarios institucionales registrados exitosamente.');
}

seedUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
