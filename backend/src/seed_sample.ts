import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';

const prisma = new PrismaClient();

async function seed() {
  const filePath = 'plantilla_resolucion_exenta_cmds.docx';
  const fullPath = path.join(__dirname, '../uploads', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log('Archivo no encontrado');
    return;
  }

  // Verificar si ya existe
  const existing = await prisma.template.findFirst({
    where: { name: 'Resolución Exenta de Adquisición y Contratación' }
  });

  if (existing) {
    console.log('La plantilla ya existe en BD');
    return;
  }

  const content = fs.readFileSync(fullPath, 'binary');
  const zip = new PizZip(content);
  const regex = /\{([a-zA-Z0-9_]+)\}/g;
  const variables = new Set<string>();

  Object.keys(zip.files).forEach((fileName) => {
    if (fileName.startsWith('word/') && fileName.endsWith('.xml')) {
      const xml = zip.file(fileName)?.asText() || '';
      const cleanText = xml.replace(/<[^>]+>/g, '');
      let match;
      while ((match = regex.exec(cleanText)) !== null) {
        variables.add(match[1]);
      }
    }
  });

  const fieldNames = Array.from(variables);

  const tpl = await prisma.template.create({
    data: {
      name: 'Resolución Exenta de Adquisición y Contratación',
      filePath: filePath,
      fields: {
        create: fieldNames.map(name => ({
          name,
          type: name.toLowerCase().includes('fecha') ? 'date' : 'text',
          description: `Campo ${name}`
        }))
      }
    },
    include: { fields: true }
  });

  console.log('✅ Plantilla registrada en BD con éxito:', tpl.name, 'con', tpl.fields.length, 'campos.');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
