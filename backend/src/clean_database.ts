import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🧹 Iniciando limpieza completa de datos de prueba...');

  // 1. Eliminar pasos de visaciones / aprobaciones
  const deletedApprovals = await prisma.documentApproval.deleteMany({});
  console.log(`- Eliminados ${deletedApprovals.count} registros de aprobaciones/visaciones.`);

  // 2. Eliminar documentos generados en BD
  const deletedDocs = await prisma.document.deleteMany({});
  console.log(`- Eliminados ${deletedDocs.count} documentos de prueba en base de datos.`);

  // 3. Eliminar archivos físicos generados
  const generatedDir = path.join(__dirname, '../uploads/generated');
  if (fs.existsSync(generatedDir)) {
    const genFiles = fs.readdirSync(generatedDir);
    for (const file of genFiles) {
      const fullPath = path.join(generatedDir, file);
      if (fs.statSync(fullPath).isFile()) {
        fs.unlinkSync(fullPath);
        console.log(`  * Archivo generado eliminado: ${file}`);
      }
    }
  }

  // 4. Eliminar campos de plantillas y plantillas en BD
  const deletedFields = await prisma.templateField.deleteMany({});
  const deletedTemplates = await prisma.template.deleteMany({});
  console.log(`- Eliminadas ${deletedTemplates.count} plantillas y ${deletedFields.count} campos asociados.`);

  // 5. Eliminar archivos físicos de plantillas subidas
  const uploadsDir = path.join(__dirname, '../uploads');
  if (fs.existsSync(uploadsDir)) {
    const uploadFiles = fs.readdirSync(uploadsDir);
    for (const file of uploadFiles) {
      const fullPath = path.join(uploadsDir, file);
      if (fs.statSync(fullPath).isFile() && file.endsWith('.docx')) {
        fs.unlinkSync(fullPath);
        console.log(`  * Plantilla física eliminada: ${file}`);
      }
    }
  }

  // 6. Limpiar pistas de auditoría de prueba
  const deletedAudit = await prisma.auditLog.deleteMany({});
  console.log(`- Eliminados ${deletedAudit.count} registros de auditoría de prueba.`);

  // 7. Limpiar usuarios y conservar solo a Raúl Hormazábal como SUPERADMIN
  const superadminRut = '12.345.678-9';
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      rut: { not: superadminRut },
    },
  });
  console.log(`- Eliminados ${deletedUsers.count} usuarios de prueba.`);

  // Asegurar o crear a Raúl Hormazábal como único SUPERADMIN
  const raul = await prisma.user.upsert({
    where: { rut: superadminRut },
    update: {
      name: 'Raúl Hormazábal',
      email: 'rhormazabal@cmds.cl',
      role: 'SUPERADMIN',
      department: 'CASA_CENTRAL',
      isActive: true,
      password: 'cmds2026',
    },
    create: {
      rut: superadminRut,
      name: 'Raúl Hormazábal',
      email: 'rhormazabal@cmds.cl',
      role: 'SUPERADMIN',
      department: 'CASA_CENTRAL',
      isActive: true,
      password: 'cmds2026',
    },
  });
  console.log(`✅ Único usuario activo conservado: ${raul.name} (${raul.role}) - RUT: ${raul.rut}`);

  // 8. Crear un registro limpio inicial en la pista de auditoría
  await prisma.auditLog.create({
    data: {
      action: 'SYSTEM_CLEANUP_RESET',
      entityType: 'System',
      userRut: raul.rut,
      userName: raul.name,
      userRole: raul.role,
      department: raul.department,
      ipAddress: '127.0.0.1',
      userAgent: 'Sistema CMDS Admin',
      details: JSON.stringify({
        message: 'Reinicio y limpieza completa de base de datos para inicio oficial de operaciones.',
        activeSuperadmin: raul.name,
      }),
    },
  });

  console.log('✨ Base de datos y repositorios limpios y listos para uso oficial.');
}

cleanDatabase()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
