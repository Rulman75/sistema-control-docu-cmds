import express, { Request } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import tls from 'tls';
import PizZip from 'pizzip';
import crypto from 'crypto';
import QRCode from 'qrcode';
import Docxtemplater from 'docxtemplater';
import { PrismaClient } from '@prisma/client';

// ==================== MITIGACIÓN DE SEGURIDAD TLS / PKI (eMudhra / Octubre 2026) ====================
tls.DEFAULT_MIN_VERSION = 'TLSv1.2';
const originalCheckServerIdentity = tls.checkServerIdentity;
tls.checkServerIdentity = function (hostname, cert) {
  const issuerStr = JSON.stringify(cert?.issuer || {}).toLowerCase();
  if (issuerStr.includes('emudhra') || issuerStr.includes('emsign')) {
    return new Error(
      `[SGSI Security Block] Certificado TLS emitido por CA revocada (eMudhra/emSign) rechazado para ${hostname}`
    );
  }
  return originalCheckServerIdentity(hostname, cert);
};

const app = express();
const prisma = new PrismaClient();

app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(cors());
app.use(express.json());

// Carpetas de almacenamiento
const uploadsDir = path.join(__dirname, '../uploads');
const generatedDir = path.join(uploadsDir, 'generated');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true });
}

// Servir archivos estáticos
app.use('/uploads', express.static(uploadsDir));

// Configurar multer para guardar los archivos .docx de plantillas
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const cleanOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${cleanOriginalName}`);
  }
});
const upload = multer({ storage });

// ==================== HELPER: CONTEXTO DE USUARIO Y AUDITORÍA ====================

function getUserContext(req: Request) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const cleanIp = ip.includes('::ffff:') ? ip.replace('::ffff:', '') : ip;
  const userAgent = req.headers['user-agent'] || 'Navegador Web';

  return {
    userId: req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : undefined,
    userRut: (req.headers['x-user-rut'] as string) || '12.345.678-9',
    userName: decodeURIComponent((req.headers['x-user-name'] as string) || 'Rodrigo Hormazábal'),
    userRole: (req.headers['x-user-role'] as string) || 'SUPERADMIN',
    department: (req.headers['x-user-dept'] as string) || 'CASA_CENTRAL',
    ipAddress: cleanIp,
    userAgent
  };
}

async function logAuditEvent(params: {
  action: string;
  entityType: string;
  entityId?: number;
  userContext: ReturnType<typeof getUserContext>;
  details?: Record<string, any>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        userId: params.userContext.userId,
        userRut: params.userContext.userRut,
        userName: params.userContext.userName,
        userRole: params.userContext.userRole,
        department: params.userContext.department,
        ipAddress: params.userContext.ipAddress,
        userAgent: params.userContext.userAgent,
        details: JSON.stringify(params.details || {}),
      }
    });
  } catch (err) {
    console.error('Error al registrar pista de auditoría:', err);
  }
}

// ==================== GENERADOR DE FOLIO INSTITUCIONAL ====================

async function generateFolio(department: string, templateName: string): Promise<string> {
  const year = new Date().getFullYear();
  let prefix = 'DOC';
  const lower = templateName.toLowerCase();
  if (lower.includes('resoluci')) prefix = 'RES';
  else if (lower.includes('base')) prefix = 'BAS';
  else if (lower.includes('memo')) prefix = 'MEM';
  else if (lower.includes('contrato')) prefix = 'CON';

  const count = await prisma.document.count({
    where: { department }
  });

  const correlativo = String(count + 1).padStart(4, '0');
  const safeDept = department.replace('_', '-');
  return `${prefix}-${safeDept}-${year}-${correlativo}`;
}

// Generador de Código Único de Verificación (CUV)
function generateCUV(): string {
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  const year = new Date().getFullYear();
  return `CMDS-${random}-${year}`;
}

// Generador de Hash Criptográfico SHA-256 para integridad de datos
function computeHash(data: any): string {
  return crypto.createHash('sha256').update(typeof data === 'string' ? data : JSON.stringify(data)).digest('hex');
}

// ==================== ENDPOINTS DE SEGURIDAD Y USUARIOS ====================

// 1. Obtener lista de usuarios institucionales (con filtros y opción de ver inactivos)
app.get('/api/users', async (req, res) => {
  try {
    const { all, q, role, department } = req.query;
    const where: any = {};

    if (all !== 'true') {
      where.isActive = true;
    }

    if (role && role !== 'TODOS') {
      where.role = String(role);
    }

    if (department && department !== 'TODOS') {
      where.department = String(department);
    }

    if (q && String(q).trim()) {
      const term = String(q).trim();
      const numTerm = parseInt(term.replace(/[^0-9]/g, ''), 10);
      where.OR = [
        { name: { contains: term } },
        { email: { contains: term } }
      ];
      if (!isNaN(numTerm) && numTerm > 0) {
        where.OR.push({ rut: numTerm });
      }
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        rut: true,
        dv: true,
        name: true,
        email: true,
        role: true,
        department: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// 2. Crear nuevo usuario con asignación de rol y departamento
app.post('/api/users', async (req, res) => {
  const user = getUserContext(req);
  if (!['SUPERADMIN', 'DIRECTOR'].includes(user.userRole)) {
    return res.status(403).json({ error: 'Permisos insuficientes: Solo Administradores o Dirección pueden crear usuarios' });
  }

  try {
    const { rut, dv, name, email, role, department, password } = req.body;

    if (!rut || !name || !email || !role || !department) {
      return res.status(400).json({ error: 'Todos los campos obligatorios deben estar presentes (RUT, Nombre, Correo, Rol, Departamento)' });
    }

    // Limpiar y validar RUT numérico y DV
    const numRut = parseInt(String(rut).replace(/[^0-9]/g, ''), 10);
    if (isNaN(numRut) || numRut <= 0) {
      return res.status(400).json({ error: 'El campo RUT debe ser un valor numérico válido' });
    }

    const cleanDv = String(dv || '').trim().toUpperCase().replace(/[^0-9K]/g, '');
    if (!cleanDv || cleanDv.length !== 1) {
      return res.status(400).json({ error: 'Debe ingresar un Dígito Verificador (DV) válido (0-9 o K)' });
    }

    // Si el RUT ya existe, actualizar su información (Upsert)
    const existingRut = await prisma.user.findUnique({ where: { rut: numRut } });
    if (existingRut) {
      const updatedUser = await prisma.user.update({
        where: { id: existingRut.id },
        data: {
          dv: cleanDv,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          department,
          ...(password ? { password } : {}),
          isActive: typeof req.body.isActive === 'boolean' ? req.body.isActive : existingRut.isActive
        },
        select: {
          id: true,
          rut: true,
          dv: true,
          name: true,
          email: true,
          role: true,
          department: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      await logAuditEvent({
        action: 'UPDATE_USER',
        entityType: 'User',
        entityId: updatedUser.id,
        userContext: user,
        details: {
          targetUserRut: `${updatedUser.rut}-${updatedUser.dv}`,
          updatedUserName: updatedUser.name,
          assignedRole: updatedUser.role,
          assignedDepartment: updatedUser.department
        }
      });

      return res.status(200).json({
        message: 'Usuario existente actualizado exitosamente',
        user: updatedUser,
        updated: true
      });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existingEmail) {
      return res.status(400).json({ error: `El correo electrónico ${email} ya está registrado por otro RUT` });
    }

    const newUser = await prisma.user.create({
      data: {
        rut: numRut,
        dv: cleanDv,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        department,
        password: password || 'cmds2026',
        isActive: true
      },
      select: {
        id: true,
        rut: true,
        dv: true,
        name: true,
        email: true,
        role: true,
        department: true,
        isActive: true,
        createdAt: true
      }
    });

    await logAuditEvent({
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: newUser.id,
      userContext: user,
      details: {
        createdUserRut: `${newUser.rut}-${newUser.dv}`,
        createdUserName: newUser.name,
        assignedRole: newUser.role,
        assignedDepartment: newUser.department
      }
    });

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: newUser
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error al registrar el nuevo usuario' });
  }
});

// 3. Editar datos, rol y departamento de un usuario
app.put('/api/users/:id', async (req, res) => {
  const user = getUserContext(req);
  if (!['SUPERADMIN', 'DIRECTOR'].includes(user.userRole)) {
    return res.status(403).json({ error: 'Permisos insuficientes: Solo Administradores o Dirección pueden modificar usuarios' });
  }

  try {
    const id = Number(req.params.id);
    const { rut, dv, name, email, role, department, isActive } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    let numRut = existing.rut;
    if (rut !== undefined && rut !== null && String(rut).trim()) {
      const parsed = parseInt(String(rut).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0) {
        if (parsed !== existing.rut) {
          const dup = await prisma.user.findUnique({ where: { rut: parsed } });
          if (dup && dup.id !== id) {
            return res.status(400).json({ error: `El RUT ${parsed} ya está registrado por otro usuario` });
          }
        }
        numRut = parsed;
      }
    }

    let cleanDv = existing.dv;
    if (dv !== undefined && dv !== null && String(dv).trim()) {
      cleanDv = String(dv).trim().toUpperCase().slice(0, 1);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        rut: numRut,
        dv: cleanDv,
        name: name ? name.trim() : existing.name,
        email: email ? email.trim().toLowerCase() : existing.email,
        role: role || existing.role,
        department: department || existing.department,
        isActive: typeof isActive === 'boolean' ? isActive : existing.isActive
      },
      select: {
        id: true,
        rut: true,
        dv: true,
        name: true,
        email: true,
        role: true,
        department: true,
        isActive: true,
        updatedAt: true
      }
    });

    await logAuditEvent({
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: id,
      userContext: user,
      details: {
        targetUserRut: `${existing.rut}-${existing.dv}`,
        previousRole: existing.role,
        newRole: updatedUser.role,
        previousDept: existing.department,
        newDept: updatedUser.department,
        isActive: updatedUser.isActive
      }
    });

    res.json({
      message: 'Usuario actualizado exitosamente',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al actualizar el usuario' });
  }
});

// 4. Resetear contraseña de usuario
app.post('/api/users/:id/reset-password', async (req, res) => {
  const user = getUserContext(req);
  if (!['SUPERADMIN', 'DIRECTOR'].includes(user.userRole)) {
    return res.status(403).json({ error: 'Permisos insuficientes: Solo Administradores o Dirección pueden resetear contraseñas' });
  }

  try {
    const id = Number(req.params.id);
    const { newPassword } = req.body;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Generar contraseña temporal si no se especificó una
    const tempPassword = newPassword && newPassword.trim() 
      ? newPassword.trim() 
      : `Cmds#${Math.floor(1000 + Math.random() * 9000)}`;

    await prisma.user.update({
      where: { id },
      data: { password: tempPassword }
    });

    await logAuditEvent({
      action: 'RESET_PASSWORD',
      entityType: 'User',
      entityId: id,
      userContext: user,
      details: {
        targetUserRut: targetUser.rut,
        targetUserName: targetUser.name,
        targetEmail: targetUser.email,
        reason: 'Restablecimiento formal de contraseña por Administrador'
      }
    });

    res.json({
      message: 'Contraseña restablecida correctamente',
      temporaryPassword: tempPassword,
      userRut: targetUser.rut,
      userName: targetUser.name
    });
  } catch (error) {
    console.error('Error al resetear contraseña:', error);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
});

// 5. Activar / Desactivar estado del usuario (Toggle)
app.put('/api/users/:id/toggle-status', async (req, res) => {
  const user = getUserContext(req);
  if (!['SUPERADMIN', 'DIRECTOR'].includes(user.userRole)) {
    return res.status(403).json({ error: 'Permisos insuficientes: Solo Administradores pueden cambiar el estado del usuario' });
  }

  try {
    const id = Number(req.params.id);
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !targetUser.isActive }
    });

    await logAuditEvent({
      action: updated.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      entityType: 'User',
      entityId: id,
      userContext: user,
      details: {
        targetUserRut: targetUser.rut,
        newStatus: updated.isActive ? 'ACTIVO' : 'INACTIVO'
      }
    });

    res.json({
      message: `Usuario ${updated.isActive ? 'activado' : 'desactivado'} exitosamente`,
      isActive: updated.isActive
    });
  } catch (error) {
    console.error('Error al cambiar estado de usuario:', error);
    res.status(500).json({ error: 'Error al cambiar el estado del usuario' });
  }
});

// ==================== ENDPOINTS DE DEPARTAMENTOS ====================

// Listar departamentos (activos o todos)
app.get('/api/departments', async (req, res) => {
  try {
    const { all, q } = req.query;
    const where: any = {};
    if (all !== 'true') {
      where.isActive = true;
    }
    if (q && String(q).trim()) {
      const term = String(q).trim();
      where.OR = [
        { code: { contains: term } },
        { name: { contains: term } },
        { description: { contains: term } }
      ];
    }

    const departments = await prisma.department.findMany({
      where,
      orderBy: { name: 'asc' }
    });
    res.json(departments);
  } catch (error) {
    console.error('Error al obtener departamentos:', error);
    res.status(500).json({ error: 'Error al obtener departamentos' });
  }
});

// Crear nuevo departamento institucional
app.post('/api/departments', async (req, res) => {
  const user = getUserContext(req);
  if (!['SUPERADMIN', 'DIRECTOR'].includes(user.userRole)) {
    return res.status(403).json({ error: 'Permisos insuficientes: Solo Administradores pueden crear departamentos' });
  }

  try {
    const { code, name, description } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'El código y el nombre del departamento son obligatorios' });
    }

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const existing = await prisma.department.findUnique({ where: { code: cleanCode } });
    if (existing) {
      return res.status(400).json({ error: `El código de departamento '${cleanCode}' ya existe` });
    }

    const newDept = await prisma.department.create({
      data: {
        code: cleanCode,
        name: name.trim(),
        description: description ? description.trim() : null,
        isActive: true
      }
    });

    await logAuditEvent({
      action: 'CREATE_DEPARTMENT',
      entityType: 'Department',
      entityId: newDept.id,
      userContext: user,
      details: {
        code: newDept.code,
        name: newDept.name
      }
    });

    res.status(201).json({ message: 'Departamento creado con éxito', department: newDept });
  } catch (error) {
    console.error('Error al crear departamento:', error);
    res.status(500).json({ error: 'Error al registrar departamento' });
  }
});

// Editar departamento
app.put('/api/departments/:id', async (req, res) => {
  const user = getUserContext(req);
  if (!['SUPERADMIN', 'DIRECTOR'].includes(user.userRole)) {
    return res.status(403).json({ error: 'Permisos insuficientes: Solo Administradores pueden editar departamentos' });
  }

  try {
    const id = Number(req.params.id);
    const { name, description, isActive } = req.body;

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Departamento no encontrado' });
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        name: name ? name.trim() : existing.name,
        description: description !== undefined ? (description ? description.trim() : null) : existing.description,
        isActive: typeof isActive === 'boolean' ? isActive : existing.isActive
      }
    });

    await logAuditEvent({
      action: 'UPDATE_DEPARTMENT',
      entityType: 'Department',
      entityId: id,
      userContext: user,
      details: {
        code: existing.code,
        previousName: existing.name,
        newName: updated.name,
        isActive: updated.isActive
      }
    });

    res.json({ message: 'Departamento actualizado con éxito', department: updated });
  } catch (error) {
    console.error('Error al actualizar departamento:', error);
    res.status(500).json({ error: 'Error al actualizar departamento' });
  }
});

// Activar / Desactivar departamento (Toggle)
app.put('/api/departments/:id/toggle-status', async (req, res) => {
  const user = getUserContext(req);
  if (!['SUPERADMIN', 'DIRECTOR'].includes(user.userRole)) {
    return res.status(403).json({ error: 'Permisos insuficientes' });
  }

  try {
    const id = Number(req.params.id);
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Departamento no encontrado' });
    }

    const updated = await prisma.department.update({
      where: { id },
      data: { isActive: !existing.isActive }
    });

    await logAuditEvent({
      action: updated.isActive ? 'ACTIVATE_DEPARTMENT' : 'DEACTIVATE_DEPARTMENT',
      entityType: 'Department',
      entityId: id,
      userContext: user,
      details: { code: existing.code, status: updated.isActive ? 'ACTIVO' : 'INACTIVO' }
    });

    res.json({ message: `Departamento ${updated.isActive ? 'activado' : 'desactivado'} con éxito`, isActive: updated.isActive });
  } catch (error) {
    console.error('Error al cambiar estado de departamento:', error);
    res.status(500).json({ error: 'Error al cambiar estado del departamento' });
  }
});

// ==================== ENDPOINTS DE ROLES ====================

// Listar roles RBAC (activos o todos)
app.get('/api/roles', async (req, res) => {
  try {
    const { all, q } = req.query;
    const where: any = {};
    if (all !== 'true') {
      where.isActive = true;
    }
    if (q && String(q).trim()) {
      const term = String(q).trim();
      where.OR = [
        { code: { contains: term } },
        { name: { contains: term } },
        { description: { contains: term } }
      ];
    }

    const roles = await prisma.role.findMany({
      where,
      orderBy: { hierarchy: 'desc' }
    });
    res.json(roles);
  } catch (error) {
    console.error('Error al obtener roles:', error);
    res.status(500).json({ error: 'Error al obtener roles' });
  }
});

// Crear nuevo rol institucional
app.post('/api/roles', async (req, res) => {
  const user = getUserContext(req);
  if (!['SUPERADMIN', 'DIRECTOR'].includes(user.userRole)) {
    return res.status(403).json({ error: 'Permisos insuficientes: Solo Administradores pueden crear roles' });
  }

  try {
    const { code, name, description, hierarchy } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'El código y el nombre del rol son obligatorios' });
    }

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const existing = await prisma.role.findUnique({ where: { code: cleanCode } });
    if (existing) {
      return res.status(400).json({ error: `El código de rol '${cleanCode}' ya existe` });
    }

    const newRole = await prisma.role.create({
      data: {
        code: cleanCode,
        name: name.trim(),
        description: description ? description.trim() : null,
        hierarchy: hierarchy ? Number(hierarchy) : 1,
        isActive: true
      }
    });

    await logAuditEvent({
      action: 'CREATE_ROLE',
      entityType: 'Role',
      entityId: newRole.id,
      userContext: user,
      details: {
        code: newRole.code,
        name: newRole.name,
        hierarchy: newRole.hierarchy
      }
    });

    res.status(201).json({ message: 'Rol creado con éxito', role: newRole });
  } catch (error) {
    console.error('Error al crear rol:', error);
    res.status(500).json({ error: 'Error al registrar rol' });
  }
});

// Editar rol institucional
app.put('/api/roles/:id', async (req, res) => {
  const user = getUserContext(req);
  if (!['SUPERADMIN', 'DIRECTOR'].includes(user.userRole)) {
    return res.status(403).json({ error: 'Permisos insuficientes: Solo Administradores pueden editar roles' });
  }

  try {
    const id = Number(req.params.id);
    const { name, description, hierarchy, isActive } = req.body;

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    const updated = await prisma.role.update({
      where: { id },
      data: {
        name: name ? name.trim() : existing.name,
        description: description !== undefined ? (description ? description.trim() : null) : existing.description,
        hierarchy: hierarchy !== undefined ? Number(hierarchy) : existing.hierarchy,
        isActive: typeof isActive === 'boolean' ? isActive : existing.isActive
      }
    });

    await logAuditEvent({
      action: 'UPDATE_ROLE',
      entityType: 'Role',
      entityId: id,
      userContext: user,
      details: {
        code: existing.code,
        previousName: existing.name,
        newName: updated.name,
        hierarchy: updated.hierarchy,
        isActive: updated.isActive
      }
    });

    res.json({ message: 'Rol actualizado con éxito', role: updated });
  } catch (error) {
    console.error('Error al actualizar rol:', error);
    res.status(500).json({ error: 'Error al actualizar rol' });
  }
});

// Activar / Desactivar rol (Toggle)
app.put('/api/roles/:id/toggle-status', async (req, res) => {
  const user = getUserContext(req);
  if (!['SUPERADMIN', 'DIRECTOR'].includes(user.userRole)) {
    return res.status(403).json({ error: 'Permisos insuficientes' });
  }

  try {
    const id = Number(req.params.id);
    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    const updated = await prisma.role.update({
      where: { id },
      data: { isActive: !existing.isActive }
    });

    await logAuditEvent({
      action: updated.isActive ? 'ACTIVATE_ROLE' : 'DEACTIVATE_ROLE',
      entityType: 'Role',
      entityId: id,
      userContext: user,
      details: { code: existing.code, status: updated.isActive ? 'ACTIVO' : 'INACTIVO' }
    });

    res.json({ message: `Rol ${updated.isActive ? 'activado' : 'desactivado'} con éxito`, isActive: updated.isActive });
  } catch (error) {
    console.error('Error al cambiar estado de rol:', error);
    res.status(500).json({ error: 'Error al cambiar estado del rol' });
  }
});

// Pista de Auditoría (Audit Trail) inalterable para Contraloría y SGSI
app.get('/api/audit-logs', async (req, res) => {
  try {
    const user = getUserContext(req);
    // Solo auditores, superadmin o directores pueden ver la auditoría
    if (!['SUPERADMIN', 'AUDITOR_CONTRALORIA', 'DIRECTOR'].includes(user.userRole)) {
      await logAuditEvent({
        action: 'UNAUTHORIZED_AUDIT_ACCESS',
        entityType: 'Security',
        userContext: user,
        details: { reason: 'Rol no autorizado intentó acceder a la pista de auditoría' }
      });
      return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de Auditor o Director' });
    }

    const { action, department, limit } = req.query;
    const where: any = {};
    if (action) where.action = String(action);
    if (department) where.department = String(department);

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? Number(limit) : 100
    });

    res.json(logs);
  } catch (error) {
    console.error('Error al obtener logs de auditoría:', error);
    res.status(500).json({ error: 'Error al consultar pista de auditoría' });
  }
});

// Estadísticas del Dashboard considerando permisos del usuario
app.get('/api/stats', async (req, res) => {
  try {
    const user = getUserContext(req);
    const isGlobal = ['SUPERADMIN', 'DIRECTOR', 'AUDITOR_CONTRALORIA'].includes(user.userRole);

    const templateWhere: any = { isActive: true };
    const docWhere: any = {};

    if (!isGlobal) {
      templateWhere.OR = [
        { department: 'TRANSVERSAL' },
        { department: user.department }
      ];
      docWhere.OR = [
        { department: user.department },
        { confidentiality: 'PUBLICO' }
      ];
    }

    const [
      totalTemplates,
      totalDocuments,
      totalAudits,
      draftsCount,
      inReviewCount,
      emittedCount,
      archivedCount
    ] = await Promise.all([
      prisma.template.count({ where: templateWhere }),
      prisma.document.count({ where: docWhere }),
      prisma.auditLog.count(),
      prisma.document.count({ where: { ...docWhere, status: 'BORRADOR' } }),
      prisma.document.count({ where: { ...docWhere, status: 'EN_REVISION' } }),
      prisma.document.count({ where: { ...docWhere, status: 'EMITIDO' } }),
      prisma.document.count({ where: { ...docWhere, isArchived: true } })
    ]);

    res.json({
      totalTemplates,
      totalDocuments,
      totalAudits,
      draftsCount,
      inReviewCount,
      emittedCount,
      archivedCount
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// ==================== ENDPOINTS DE PLANTILLAS ====================

// 1. Obtener plantillas accesibles según RBAC
app.get('/api/templates', async (req, res) => {
  try {
    const user = getUserContext(req);
    const isGlobal = ['SUPERADMIN', 'DIRECTOR', 'AUDITOR_CONTRALORIA'].includes(user.userRole);

    const where: any = { isActive: true };
    if (!isGlobal) {
      where.OR = [
        { department: 'TRANSVERSAL' },
        { department: user.department }
      ];
    }

    const templates = await prisma.template.findMany({
      where,
      include: { fields: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(templates);
  } catch (error) {
    console.error('Error al obtener plantillas:', error);
    res.status(500).json({ error: 'Error al obtener las plantillas' });
  }
});

// Helper para extraer variables y cuadros dinámicos ({#tabla}...{/tabla}) desde Word XML
function extractTemplateFieldsFromDocx(zip: InstanceType<typeof PizZip>): { name: string; type: string; description: string }[] {
  const tableLoops: Map<string, string[]> = new Map();
  const tableInnerCols: Set<string> = new Set();
  const scalarVars: Set<string> = new Set();

  const loopRegex = /\{#\s*([a-zA-Z0-9_]+)\s*\}([\s\S]*?)\{\/\s*\1\s*\}/g;
  const innerVarRegex = /\{([a-zA-Z0-9_]+)\}/g;
  const scalarRegex = /\{([a-zA-Z0-9_]+)\}/g;

  Object.keys(zip.files).forEach((fileName) => {
    if (fileName.startsWith('word/') && fileName.endsWith('.xml')) {
      const xml = zip.file(fileName)?.asText() || '';
      const cleanText = xml.replace(/<[^>]+>/g, '');

      // 1. Detectar cuadros dinámicos / tablas repetitivas {#tabla}...{/tabla}
      let loopMatch;
      while ((loopMatch = loopRegex.exec(cleanText)) !== null) {
        const loopName = loopMatch[1].trim();
        const loopBody = loopMatch[2];
        const cols: string[] = [];

        let colMatch;
        while ((colMatch = innerVarRegex.exec(loopBody)) !== null) {
          const col = colMatch[1].trim();
          if (col !== loopName && !cols.includes(col)) {
            cols.push(col);
            tableInnerCols.add(col);
          }
        }

        if (!tableLoops.has(loopName)) {
          tableLoops.set(loopName, cols);
        } else {
          const existing = tableLoops.get(loopName) || [];
          cols.forEach(c => {
            if (!existing.includes(c)) existing.push(c);
          });
        }
      }

      // 2. Detectar variables escalares {variable}
      let match;
      while ((match = scalarRegex.exec(cleanText)) !== null) {
        const v = match[1].trim();
        // Omitir variables internas de tablas y los nombres de las tablas mismas
        if (!tableInnerCols.has(v) && !tableLoops.has(v)) {
          scalarVars.add(v);
        }
      }
    }
  });

  const fields: { name: string; type: string; description: string }[] = [];

  // Agregar variables escalares
  scalarVars.forEach((v) => {
    const lower = v.toLowerCase();
    let type = 'text';
    if (lower.includes('fecha')) type = 'date';
    else if (lower.includes('monto') || lower.includes('precio') || lower.includes('valor') || lower.includes('cantidad') || lower.includes('presupuesto')) type = 'number';
    else if (lower.includes('detalle') || lower.includes('descripcion') || lower.includes('observacion') || lower.includes('motivo') || lower.includes('considerando') || lower.includes('vistos')) type = 'textarea';

    fields.push({
      name: v,
      type,
      description: `Campo ${v}`
    });
  });

  // Agregar tablas dinámicas
  tableLoops.forEach((cols, loopName) => {
    fields.push({
      name: loopName,
      type: 'table',
      description: JSON.stringify({
        columns: cols.length > 0 ? cols : ['num', 'descripcion', 'cantidad', 'precio_unitario', 'total'],
        label: `Cuadro de ${loopName.replace(/_/g, ' ')}`
      })
    });
  });

  return fields;
}

// 2. Subir plantilla con departamento y nivel de confidencialidad
app.post('/api/templates/upload', upload.single('file'), async (req, res) => {
  const user = getUserContext(req);

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    const templateName = req.body.name || req.file.originalname.replace(/\.docx$/i, '');
    const department = req.body.department || user.department || 'TRANSVERSAL';
    const confidentiality = req.body.confidentiality || 'INTERNO';
    const filePath = req.file.filename;
    const fullPath = path.join(uploadsDir, filePath);

    // Leer el archivo .docx como zip
    const content = fs.readFileSync(fullPath, 'binary');
    const zip = new PizZip(content);

    // Extraer campos automáticos y tablas dinámicas
    const extractedFields = extractTemplateFieldsFromDocx(zip);

    const newTemplate = await prisma.template.create({
      data: {
        name: templateName,
        filePath: filePath,
        department,
        confidentiality,
        fields: {
          create: extractedFields
        }
      },
      include: { fields: true }
    });

    // Registrar en auditoría inalterable
    await logAuditEvent({
      action: 'CREATE_TEMPLATE',
      entityType: 'Template',
      entityId: newTemplate.id,
      userContext: user,
      details: {
        templateName,
        department,
        confidentiality,
        variablesCount: fieldNames.length
      }
    });

    res.json({
      message: 'Plantilla registrada y analizada con éxito',
      template: newTemplate,
      detectedVariables: fieldNames
    });

  } catch (error) {
    console.error('Error al procesar plantilla:', error);
    res.status(500).json({ error: 'Error al procesar la plantilla' });
  }
});

// 3. Descargar archivo base de plantilla
app.get('/api/templates/:id/download', async (req, res) => {
  const user = getUserContext(req);
  try {
    const id = Number(req.params.id);
    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    const filePath = path.resolve(uploadsDir, template.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo base no encontrado' });
    }

    await logAuditEvent({
      action: 'DOWNLOAD_TEMPLATE',
      entityType: 'Template',
      entityId: template.id,
      userContext: user,
      details: { templateName: template.name }
    });

    res.setHeader('Content-Disposition', `attachment; filename="${template.filePath}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Error al descargar plantilla:', error);
    res.status(500).json({ error: 'Error al descargar la plantilla base' });
  }
});

// 4. Eliminar plantilla
app.delete('/api/templates/:id', async (req, res) => {
  const user = getUserContext(req);

  // Solo SUPERADMIN o DIRECTOR pueden borrar plantillas
  if (!['SUPERADMIN', 'DIRECTOR'].includes(user.userRole)) {
    return res.status(403).json({ error: 'Solo la Dirección o SuperAdmin pueden eliminar plantillas' });
  }

  try {
    const id = Number(req.params.id);
    const template = await prisma.template.findUnique({ where: { id } });

    if (!template) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    const templateFilePath = path.join(uploadsDir, template.filePath);
    if (fs.existsSync(templateFilePath)) {
      try { fs.unlinkSync(templateFilePath); } catch (e) { console.error(e); }
    }

    await prisma.template.delete({ where: { id } });

    await logAuditEvent({
      action: 'DELETE_TEMPLATE',
      entityType: 'Template',
      entityId: id,
      userContext: user,
      details: { templateName: template.name }
    });

    res.json({ message: 'Plantilla eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar plantilla:', error);
    res.status(500).json({ error: 'Error al eliminar plantilla' });
  }
});

// ==================== ENDPOINTS DE GENERACIÓN Y DOCUMENTOS ====================

// 5. Generar Documento oficial con Folio, RBAC, Confidencialidad, Versionamiento y Auditoría
app.post('/api/documents/generate', async (req, res) => {
  const user = getUserContext(req);

  try {
    const {
      templateId,
      data,
      createdBy,
      department,
      confidentiality,
      parentDocumentId,
      changeLog,
      status: requestedStatus
    } = req.body;

    if (!templateId) {
      return res.status(400).json({ error: 'Debe especificar el templateId' });
    }

    const template = await prisma.template.findUnique({
      where: { id: Number(templateId) },
      include: { fields: true }
    });

    if (!template) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    const templateFullPath = path.join(uploadsDir, template.filePath);
    if (!fs.existsSync(templateFullPath)) {
      return res.status(404).json({ error: 'El archivo base de la plantilla no se encuentra' });
    }

    const docDepartment = department || user.department || template.department || 'CASA_CENTRAL';
    const docConfidentiality = confidentiality || template.confidentiality || 'INTERNO';
    const documentStatus = requestedStatus || 'EMITIDO';

    let version = '1.0';
    let folio = '';
    let parentDoc: any = null;

    if (parentDocumentId) {
      parentDoc = await prisma.document.findUnique({
        where: { id: Number(parentDocumentId) }
      });
      if (parentDoc) {
        // Calcular nueva versión minor (1.0 -> 1.1 -> 1.2)
        const parts = (parentDoc.version || '1.0').split('.');
        const major = parseInt(parts[0] || '1', 10);
        const minor = parseInt(parts[1] || '0', 10) + 1;
        version = `${major}.${minor}`;
        
        // Conservar raíz del folio
        const baseFolio = parentDoc.folio.replace(/-v[0-9.]+$/i, '');
        folio = `${baseFolio}-v${version}`;
      }
    }

    if (!folio) {
      folio = await generateFolio(docDepartment, template.name);
    }

    const cuv = generateCUV();
    const sha256Hash = computeHash({ folio, version, docDepartment, docConfidentiality, data });

    // Inyectar automáticamente Folio, CUV, Hash y URL de validación en los datos
    const formData = {
      folio,
      version,
      cuv,
      hash_sha256: sha256Hash,
      url_validacion: `http://localhost:5173/validar?cuv=${cuv}`,
      ...(data || {})
    };
    if (!formData.numero_resolucion && folio) {
      formData.numero_resolucion = folio;
    }

    // Garantizar que cualquier campo de tipo tabla tenga al menos un arreglo si no se enviaron datos
    template.fields.forEach((f: any) => {
      if (f.type === 'table' && !Array.isArray(formData[f.name])) {
        formData[f.name] = [];
      }
    });

    // Leer el archivo base en docxtemplater
    const fileContent = fs.readFileSync(templateFullPath, 'binary');
    const zip = new PizZip(fileContent);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render(formData);

    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    const safeFolio = folio.replace(/[^a-zA-Z0-9_-]/g, '_');
    const outputFileName = `DOC-${safeFolio}-${Date.now()}.docx`;
    const outputFilePath = path.join(generatedDir, outputFileName);
    fs.writeFileSync(outputFilePath, buf);

    // Extraer texto plano completo del documento para motor de búsqueda Full-Text
    let fullTextContent = '';
    try {
      const renderedZip = new PizZip(buf);
      const docXml = renderedZip.file('word/document.xml')?.asText() || '';
      fullTextContent = docXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    } catch (e) {
      console.error('Error al extraer texto para búsqueda full-text:', e);
    }

    // Guardar registro en la BD
    const newDocument = await prisma.document.create({
      data: {
        templateId: template.id,
        folio,
        cuv,
        sha256Hash,
        generatedFilePath: outputFileName,
        data: JSON.stringify(formData),
        fullTextContent,
        department: docDepartment,
        confidentiality: docConfidentiality,
        status: documentStatus,
        version,
        parentDocumentId: parentDoc ? parentDoc.id : null,
        changeLog: changeLog || (parentDoc ? `Nueva versión ${version} creada` : 'Versión inicial'),
        createdBy: createdBy || user.userName,
        userRut: user.userRut,
      },
      include: { template: true, parentDocument: true }
    });

    // Inicializar Flujo de Visaciones / Aprobaciones
    await prisma.documentApproval.createMany({
      data: [
        {
          documentId: newDocument.id,
          stepNumber: 1,
          stepName: `Visación Técnica Jefatura (${docDepartment})`,
          roleRequired: 'JEFE_DEPTO',
          department: docDepartment,
          status: documentStatus === 'EMITIDO' ? 'APROBADO' : 'PENDIENTE',
          approvedAt: documentStatus === 'EMITIDO' ? new Date() : null,
          approvedBy: documentStatus === 'EMITIDO' ? user.userName : null,
          approverRut: documentStatus === 'EMITIDO' ? user.userRut : null,
          approverIp: documentStatus === 'EMITIDO' ? user.ipAddress : null,
        },
        {
          documentId: newDocument.id,
          stepNumber: 2,
          stepName: 'Firma y Visado Dirección Ejecutiva CMDS',
          roleRequired: 'DIRECTOR',
          department: 'CASA_CENTRAL',
          status: documentStatus === 'EMITIDO' ? 'APROBADO' : 'PENDIENTE',
          approvedAt: documentStatus === 'EMITIDO' ? new Date() : null,
          approvedBy: documentStatus === 'EMITIDO' ? 'Dirección Ejecutiva' : null,
        }
      ]
    });

    // Pista de auditoría inalterable
    const auditAction = parentDoc ? 'NEW_VERSION' : (documentStatus === 'BORRADOR' ? 'CREATE_DRAFT' : 'GENERATE_DOC');
    await logAuditEvent({
      action: auditAction,
      entityType: 'Document',
      entityId: newDocument.id,
      userContext: user,
      details: {
        folio,
        cuv,
        sha256Hash,
        version,
        status: documentStatus,
        parentDocumentId: parentDoc?.id,
        templateName: template.name,
        department: docDepartment,
        confidentiality: docConfidentiality,
        changeLog: newDocument.changeLog,
        fileName: outputFileName
      }
    });

    res.json({
      message: parentDoc ? `Nueva versión ${version} generada con éxito` : 'Documento oficial generado con éxito',
      document: newDocument,
      downloadUrl: `/uploads/generated/${outputFileName}`,
      fileName: outputFileName,
      folio,
      version,
      cuv
    });

  } catch (error: any) {
    console.error('Error al generar documento:', error);
    res.status(500).json({
      error: 'Error al generar el documento',
      details: error.message || error
    });
  }
});

// 5.1. Obtener un documento específico por ID con sus versiones
app.get('/api/documents/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        template: true,
        parentDocument: true,
        childVersions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    res.json(document);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar documento' });
  }
});

// 5.2. Cambiar Estado del Documento (Borrador -> En Revisión -> Aprobado -> Emitido -> Archivado)
app.put('/api/documents/:id/status', async (req, res) => {
  const user = getUserContext(req);

  try {
    const id = Number(req.params.id);
    const { status: newStatus, reason } = req.body;

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const oldStatus = document.status;
    const isArchived = newStatus === 'ARCHIVADO' ? true : document.isArchived;

    const updated = await prisma.document.update({
      where: { id },
      data: {
        status: newStatus,
        isArchived
      }
    });

    await logAuditEvent({
      action: 'CHANGE_STATUS',
      entityType: 'Document',
      entityId: id,
      userContext: user,
      details: {
        folio: document.folio,
        oldStatus,
        newStatus,
        reason: reason || 'Transición de estado en ciclo de vida documental'
      }
    });

    res.json({
      message: `Estado actualizado a ${newStatus}`,
      document: updated
    });
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ error: 'Error al actualizar estado del documento' });
  }
});

// 5.3. Archivar Documento según política de retención legal
app.post('/api/documents/:id/archive', async (req, res) => {
  const user = getUserContext(req);

  try {
    const id = Number(req.params.id);
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        isArchived: true,
        status: 'ARCHIVADO'
      }
    });

    await logAuditEvent({
      action: 'ARCHIVE_DOC',
      entityType: 'Document',
      entityId: id,
      userContext: user,
      details: {
        folio: document.folio,
        fileName: document.generatedFilePath,
        reason: 'Archivado formal por cumplimiento de ciclo de vida / retención legal'
      }
    });

    res.json({ message: 'Documento archivado correctamente', document: updated });
  } catch (error) {
    console.error('Error al archivar documento:', error);
    res.status(500).json({ error: 'Error al archivar el documento' });
  }
});

// 5.4. Historial completo de versiones de una familia de documentos
app.get('/api/documents/:id/versions', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const current = await prisma.document.findUnique({ where: { id } });
    if (!current) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Encontrar el documento raíz (ancestro original)
    let rootId = current.parentDocumentId || current.id;
    let root = await prisma.document.findUnique({ where: { id: rootId } });
    while (root && root.parentDocumentId) {
      rootId = root.parentDocumentId;
      root = await prisma.document.findUnique({ where: { id: rootId } });
    }

    // Obtener todos los documentos asociados a esta raíz
    const allVersions = await prisma.document.findMany({
      where: {
        OR: [
          { id: rootId },
          { parentDocumentId: rootId },
          { folio: { startsWith: (root?.folio || current.folio).replace(/-v[0-9.]+$/i, '') } }
        ]
      },
      include: { template: true },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      rootId,
      currentId: id,
      versions: allVersions
    });
  } catch (error) {
    console.error('Error al obtener versiones:', error);
    res.status(500).json({ error: 'Error al obtener versiones del documento' });
  }
});

// 6. Listar documentos generados filtrados por RBAC, Confidencialidad, Estados y Búsqueda Full-Text
app.get('/api/documents', async (req, res) => {
  try {
    const user = getUserContext(req);
    const isGlobal = ['SUPERADMIN', 'DIRECTOR', 'AUDITOR_CONTRALORIA'].includes(user.userRole);
    const { status, includeArchived, q, department, confidentiality } = req.query;

    const where: any = {};
    const conditions: any[] = [];

    if (!isGlobal) {
      conditions.push({
        OR: [
          { department: user.department },
          { confidentiality: 'PUBLICO' }
        ]
      });
    }

    if (department && department !== 'TODOS') {
      conditions.push({ department: String(department) });
    }

    if (confidentiality && confidentiality !== 'TODAS') {
      conditions.push({ confidentiality: String(confidentiality) });
    }

    if (status && status !== 'TODOS') {
      conditions.push({ status: String(status) });
    }

    if (includeArchived !== 'true' && status !== 'ARCHIVADO') {
      conditions.push({ isArchived: false });
    }

    if (q && String(q).trim()) {
      const term = String(q).trim();
      conditions.push({
        OR: [
          { folio: { contains: term } },
          { cuv: { contains: term } },
          { createdBy: { contains: term } },
          { department: { contains: term } },
          { data: { contains: term } },
          { fullTextContent: { contains: term } }
        ]
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        template: true,
        childVersions: {
          select: { id: true, version: true, folio: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(documents);
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    res.status(500).json({ error: 'Error al obtener historial de documentos' });
  }
});

// 7. Descargar documento generado con control de confidencialidad y registro de auditoría
app.get('/api/documents/:id/download', async (req, res) => {
  const user = getUserContext(req);

  try {
    const id = Number(req.params.id);
    const document = await prisma.document.findUnique({
      where: { id },
      include: { template: true }
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Validación RBAC: ¿Puede el usuario descargar un documento CONFIDENCIAL de otro departamento?
    const isGlobal = ['SUPERADMIN', 'DIRECTOR', 'AUDITOR_CONTRALORIA'].includes(user.userRole);
    if (!isGlobal && document.confidentiality === 'CONFIDENCIAL' && document.department !== user.department) {
      await logAuditEvent({
        action: 'UNAUTHORIZED_DOWNLOAD_ATTEMPT',
        entityType: 'Security',
        entityId: document.id,
        userContext: user,
        details: {
          folio: document.folio,
          reason: 'Usuario intentó descargar documento confidencial fuera de su departamento'
        }
      });
      return res.status(403).json({ error: 'Acceso Denegado: Documento Confidencial restringido a su departamento' });
    }

    const filePath = path.resolve(generatedDir, document.generatedFilePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
    }

    // Registrar descarga en la pista de auditoría (Exigencia Contraloría)
    await logAuditEvent({
      action: 'DOWNLOAD_DOC',
      entityType: 'Document',
      entityId: document.id,
      userContext: user,
      details: {
        folio: document.folio,
        fileName: document.generatedFilePath,
        confidentiality: document.confidentiality
      }
    });

    res.setHeader('Content-Disposition', `attachment; filename="${document.generatedFilePath}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error al descargar documento:', error);
    res.status(500).json({ error: 'Error al procesar la descarga' });
  }
});

// 8. Eliminar documento del historial (Solo SuperAdmin o Director)
app.delete('/api/documents/:id', async (req, res) => {
  const user = getUserContext(req);

  if (!['SUPERADMIN', 'DIRECTOR'].includes(user.userRole)) {
    return res.status(403).json({ error: 'Permisos insuficientes: Solo Dirección o SuperAdmin pueden eliminar documentos' });
  }

  try {
    const id = Number(req.params.id);
    const document = await prisma.document.findUnique({ where: { id } });

    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const filePath = path.join(generatedDir, document.generatedFilePath);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) { console.error(e); }
    }

    await prisma.document.delete({ where: { id } });

    await logAuditEvent({
      action: 'DELETE_DOC',
      entityType: 'Document',
      entityId: id,
      userContext: user,
      details: {
        folio: document.folio,
        fileName: document.generatedFilePath
      }
    });

    res.json({ message: 'Documento eliminado y evento registrado en auditoría' });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    res.status(500).json({ error: 'Error al eliminar el documento' });
  }
});

// ==================== WORKFLOWS Y APROBACIONES (FASE 3) ====================

// 9. Obtener visaciones/aprobaciones pendientes para el usuario actual
app.get('/api/approvals/pending', async (req, res) => {
  try {
    const user = getUserContext(req);

    const where: any = {
      status: 'PENDIENTE'
    };

    if (user.userRole === 'DIRECTOR') {
      where.roleRequired = 'DIRECTOR';
    } else if (user.userRole === 'JEFE_DEPTO') {
      where.roleRequired = 'JEFE_DEPTO';
      where.department = user.department;
    } else if (user.userRole === 'SUPERADMIN') {
      // SuperAdmin ve todas las pendientes
    } else {
      // Funcionarios generales o auditores
      return res.json([]);
    }

    const pendingApprovals = await prisma.documentApproval.findMany({
      where,
      include: {
        document: {
          include: { template: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(pendingApprovals);
  } catch (error) {
    console.error('Error al obtener aprobaciones pendientes:', error);
    res.status(500).json({ error: 'Error al consultar visaciones pendientes' });
  }
});

// 10. Aprobar / Visar digitalmente un paso del flujo
app.post('/api/approvals/:id/approve', async (req, res) => {
  const user = getUserContext(req);
  try {
    const id = Number(req.params.id);
    const { comment } = req.body;

    const approval = await prisma.documentApproval.findUnique({
      where: { id },
      include: { document: true }
    });

    if (!approval) {
      return res.status(404).json({ error: 'Paso de aprobación no encontrado' });
    }

    const updatedApproval = await prisma.documentApproval.update({
      where: { id },
      data: {
        status: 'APROBADO',
        comment: comment || 'Visado conforme según normativa vigente',
        approvedAt: new Date(),
        approvedBy: user.userName,
        approverRut: user.userRut,
        approverIp: user.ipAddress
      }
    });

    await logAuditEvent({
      action: 'APPROVE_STEP',
      entityType: 'Document',
      entityId: approval.documentId,
      userContext: user,
      details: {
        folio: approval.document.folio,
        stepName: approval.stepName,
        comment: updatedApproval.comment
      }
    });

    // Comprobar si quedan más pasos pendientes para este documento
    const remainingPending = await prisma.documentApproval.count({
      where: {
        documentId: approval.documentId,
        status: 'PENDIENTE'
      }
    });

    let fullyApproved = false;
    if (remainingPending === 0) {
      fullyApproved = true;
      await prisma.document.update({
        where: { id: approval.documentId },
        data: { status: 'EMITIDO' }
      });

      await logAuditEvent({
        action: 'DOCUMENT_FULLY_APPROVED',
        entityType: 'Document',
        entityId: approval.documentId,
        userContext: user,
        details: {
          folio: approval.document.folio,
          message: 'Documento completamente visado y formalizado formalmente'
        }
      });
    }

    res.json({
      message: fullyApproved ? '¡Documento completamente visado y emitido!' : 'Paso de visación aprobado',
      approval: updatedApproval,
      fullyApproved
    });
  } catch (error) {
    console.error('Error al visar documento:', error);
    res.status(500).json({ error: 'Error al procesar la visación' });
  }
});

// 11. Rechazar / Devolver con observaciones
app.post('/api/approvals/:id/reject', async (req, res) => {
  const user = getUserContext(req);
  try {
    const id = Number(req.params.id);
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ error: 'Debe ingresar las observaciones del rechazo o corrección' });
    }

    const approval = await prisma.documentApproval.findUnique({
      where: { id },
      include: { document: true }
    });

    if (!approval) {
      return res.status(404).json({ error: 'Paso de aprobación no encontrado' });
    }

    const updatedApproval = await prisma.documentApproval.update({
      where: { id },
      data: {
        status: 'RECHAZADO',
        comment,
        approvedAt: new Date(),
        approvedBy: user.userName,
        approverRut: user.userRut,
        approverIp: user.ipAddress
      }
    });

    // Devolver documento a estado BORRADOR para que el creador lo ajuste
    await prisma.document.update({
      where: { id: approval.documentId },
      data: { status: 'BORRADOR' }
    });

    await logAuditEvent({
      action: 'REJECT_STEP',
      entityType: 'Document',
      entityId: approval.documentId,
      userContext: user,
      details: {
        folio: approval.document.folio,
        stepName: approval.stepName,
        reason: comment
      }
    });

    res.json({ message: 'Documento devuelto al creador con observaciones', approval: updatedApproval });
  } catch (error) {
    console.error('Error al rechazar documento:', error);
    res.status(500).json({ error: 'Error al procesar el rechazo' });
  }
});

// ==================== VERIFICACIÓN PÚBLICA Y CÓDIGO QR ====================

// 12. Validar autenticidad de un documento por CUV o Folio (Portal de Validación Pública)
app.get('/api/documents/verify/:identifier', async (req, res) => {
  try {
    const identifier = decodeURIComponent(req.params.identifier).trim();
    const document = await prisma.document.findFirst({
      where: {
        OR: [
          { cuv: identifier },
          { folio: identifier }
        ]
      },
      include: {
        template: true,
        approvalSteps: {
          orderBy: { stepNumber: 'asc' }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        isValid: false,
        error: 'No se encontró ningún documento oficial registrado con ese Código de Verificación o Folio.'
      });
    }

    res.json({
      isValid: true,
      document: {
        id: document.id,
        folio: document.folio,
        cuv: document.cuv,
        sha256Hash: document.sha256Hash,
        templateName: document.template.name,
        department: document.department,
        confidentiality: document.confidentiality,
        status: document.status,
        version: document.version,
        createdBy: document.createdBy,
        createdAt: document.createdAt,
        approvalSteps: document.approvalSteps,
        generatedFilePath: document.generatedFilePath
      }
    });
  } catch (error) {
    console.error('Error al verificar documento:', error);
    res.status(500).json({ error: 'Error al validar autenticidad' });
  }
});

// 13. Generar Código QR de verificación oficial para el documento
app.get('/api/documents/:id/qr', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const validationUrl = `http://localhost:5173/validar?cuv=${encodeURIComponent(document.cuv || document.folio || '')}`;
    const qrDataUrl = await QRCode.toDataURL(validationUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 250,
      color: {
        dark: '#016098',
        light: '#FFFFFF'
      }
    });

    res.json({
      qrDataUrl,
      validationUrl,
      cuv: document.cuv,
      folio: document.folio
    });
  } catch (error) {
    console.error('Error al generar QR:', error);
    res.status(500).json({ error: 'Error al generar código QR' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
