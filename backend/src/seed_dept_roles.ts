import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEPARTMENTS = [
  {
    code: 'CASA_CENTRAL',
    name: 'Casa Central / Secretaría General',
    description: 'Dirección central ejecutiva y administración superior de la corporación',
  },
  {
    code: 'DAF',
    name: 'Dirección de Administración y Finanzas (DAF)',
    description: 'Gestión presupuestaria, compras públicas Ley 19.886 y contabilidad general',
  },
  {
    code: 'EDUCACION',
    name: 'Dirección de Educación',
    description: 'Administración de unidades educativas municipales, liceos y colegios',
  },
  {
    code: 'SALUD',
    name: 'Dirección de Salud',
    description: 'Centros de Salud Familiar (CESFAM) y atención primaria de salud',
  },
  {
    code: 'JURIDICA',
    name: 'Dirección de Asesoría Jurídica',
    description: 'Revisión de legalidad, convenios institucionales y dictámenes legales',
  },
  {
    code: 'INFORMATICA',
    name: 'Departamento de Informática y TIC',
    description: 'Sistemas institucionales, seguridad de la información SGSI e infraestructura',
  },
];

const ROLES = [
  {
    code: 'SUPERADMIN',
    name: 'SuperAdministrador de Sistemas y SGSI',
    description: 'Acceso total a mantenedores, configuraciones, usuarios y auditoría',
    hierarchy: 5,
  },
  {
    code: 'DIRECTOR',
    name: 'Dirección Ejecutiva / Secretaría General',
    description: 'Firma electrónica formal, aprobación final de expedientes y visión transversal',
    hierarchy: 4,
  },
  {
    code: 'JEFE_DEPTO',
    name: 'Jefatura de Departamento (Visador Técnico)',
    description: 'Revisión y visación técnica previa de expedientes de su departamento',
    hierarchy: 3,
  },
  {
    code: 'AUDITOR_CONTRALORIA',
    name: 'Auditor Interno / Fiscalizador Contraloría',
    description: 'Acceso de solo lectura a pistas de auditoría forense inalterables y reportes',
    hierarchy: 2,
  },
  {
    code: 'FUNCIONARIO',
    name: 'Funcionario Emisor / Solicitante',
    description: 'Generación de borradores y solicitudes de expedientes oficiales',
    hierarchy: 1,
  },
];

async function seed() {
  console.log('Seeding initial departments and roles...');

  for (const dept of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: dept,
      create: dept,
    });
  }

  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: role,
      create: role,
    });
  }

  console.log('✅ Departamentos y Roles iniciales creados exitosamente.');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
