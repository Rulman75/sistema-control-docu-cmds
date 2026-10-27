import {
  Document, Paragraph, Table, TableRow, TableCell, TextRun, Packer,
  AlignmentType, BorderStyle, WidthType, ShadingType
} from 'docx';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';

const prisma = new PrismaClient();

async function createTableTemplate() {
  console.log('Generando plantilla oficial CMDS con cuadro dinámico...');

  const tableHeaderStyle = {
    fill: '016098',
    color: 'FFFFFF',
  };

  const thinBorder = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: 'CCCCCC',
  };

  const borders = {
    top: thinBorder,
    bottom: thinBorder,
    left: thinBorder,
    right: thinBorder,
  };

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,
            bottom: 1440,
            left: 1440,
            right: 1440,
          }
        }
      },
      children: [
        // Encabezado institucional CMDS
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: 'CORPORACIÓN MUNICIPAL DE DESARROLLO SOCIAL DE ANTOFAGASTA',
              bold: true,
              size: 24,
              color: '016098',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: 'DIRECCIÓN DE ADMINISTRACIÓN Y FINANZAS (DAF) - DEPTO. DE ADQUISICIONES',
              bold: true,
              size: 18,
              color: '555555',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [
            new TextRun({
              text: 'RUT: 70.885.500-2 • Av. Angamos N° 587, Antofagasta',
              size: 16,
              color: '777777',
            }),
          ],
        }),

        // Título del documento y folio
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({
              text: 'RESOLUCIÓN EXENTA N°: ',
              bold: true,
              size: 20,
              color: '016098',
            }),
            new TextRun({
              text: '{numero_resolucion}',
              bold: true,
              size: 20,
              color: '016098',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 300 },
          children: [
            new TextRun({
              text: 'Antofagasta, {fecha_resolucion}',
              size: 18,
              italics: true,
            }),
          ],
        }),

        // VISTOS
        new Paragraph({
          spacing: { after: 150 },
          children: [
            new TextRun({ text: 'VISTOS: ', bold: true, color: '016098' }),
            new TextRun({
              text: 'Las facultades conferidas en los Estatutos de la Corporación Municipal de Desarrollo Social de Antofagasta; el requerimiento formal de compra presentado por el departamento de ',
            }),
            new TextRun({ text: '{departamento_solicitante}', bold: true }),
            new TextRun({
              text: '; y las disposiciones de la Ley de Compras Públicas y Reglamento Interno Institucional.',
            }),
          ],
        }),

        // CONSIDERANDO
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: 'CONSIDERANDO: ', bold: true, color: '016098' }),
            new TextRun({ text: '1. Que existe la estricta necesidad de adquirir bienes e insumos para: ' }),
            new TextRun({ text: '{motivo_compra}', italics: true }),
            new TextRun({ text: '.\n2. Que se ha seleccionado la cotización más conveniente presentada por el proveedor ' }),
            new TextRun({ text: '{nombre_proveedor}', bold: true }),
            new TextRun({ text: ', RUT ' }),
            new TextRun({ text: '{rut_proveedor}', bold: true }),
            new TextRun({ text: ', en estricto apego al marco presupuestario institucional.' }),
          ],
        }),

        // RESUELVO
        new Paragraph({
          spacing: { before: 100, after: 150 },
          children: [
            new TextRun({
              text: 'RESUELVO:',
              bold: true,
              size: 22,
              color: '016098',
            }),
          ],
        }),

        new Paragraph({
          spacing: { after: 150 },
          children: [
            new TextRun({
              text: '1° APRUÉBASE la contratación y adquisición de los bienes especificados en el siguiente cuadro:',
              bold: true,
            }),
          ],
        }),

        // CUADRO DINÁMICO DE ÍTEMS / PRODUCTOS
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            // Fila de encabezado
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({
                  shading: { type: ShadingType.CLEAR, fill: tableHeaderStyle.fill },
                  borders,
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'N°', bold: true, color: tableHeaderStyle.color })] })],
                }),
                new TableCell({
                  shading: { type: ShadingType.CLEAR, fill: tableHeaderStyle.fill },
                  borders,
                  children: [new Paragraph({ children: [new TextRun({ text: 'Descripción del Bien / Servicio', bold: true, color: tableHeaderStyle.color })] })],
                }),
                new TableCell({
                  shading: { type: ShadingType.CLEAR, fill: tableHeaderStyle.fill },
                  borders,
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Cantidad', bold: true, color: tableHeaderStyle.color })] })],
                }),
                new TableCell({
                  shading: { type: ShadingType.CLEAR, fill: tableHeaderStyle.fill },
                  borders,
                  children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Precio Unitario ($)', bold: true, color: tableHeaderStyle.color })] })],
                }),
                new TableCell({
                  shading: { type: ShadingType.CLEAR, fill: tableHeaderStyle.fill },
                  borders,
                  children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Subtotal ($)', bold: true, color: tableHeaderStyle.color })] })],
                }),
              ],
            }),

            // Fila repetitiva dinámica con etiquetas docxtemplater: {#items}...{/items}
            new TableRow({
              children: [
                new TableCell({
                  borders,
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('{#items}{num}')] })],
                }),
                new TableCell({
                  borders,
                  children: [new Paragraph({ children: [new TextRun('{descripcion}')] })],
                }),
                new TableCell({
                  borders,
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('{cantidad}')] })],
                }),
                new TableCell({
                  borders,
                  children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun('{precio_unitario}')] })],
                }),
                new TableCell({
                  borders,
                  children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun('{subtotal}{/items}')] })],
                }),
              ],
            }),
          ],
        }),

        // Monto Total
        new Paragraph({
          spacing: { before: 200, after: 150 },
          children: [
            new TextRun({
              text: '2° IMPÚTESE el gasto total por un monto de $',
              bold: true,
            }),
            new TextRun({
              text: '{monto_total}',
              bold: true,
              color: '016098',
            }),
            new TextRun({
              text: ' (IVA incluido) al presupuesto ordinario asignado a la Corporación Municipal para el año presupuestario en curso.',
            }),
          ],
        }),

        // Plazo de entrega
        new Paragraph({
          spacing: { after: 300 },
          children: [
            new TextRun({ text: '3° FÍJASE como plazo perentorio de entrega de los insumos el día: ', bold: true }),
            new TextRun({ text: '{plazo_entrega}', bold: true, color: '333333' }),
            new TextRun({ text: ', en dependencias de Bodega Central de la CMDS.' }),
          ],
        }),

        // Firmas y visaciones
        new Paragraph({
          spacing: { before: 500, after: 200 },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'ANÓTESE, COMUNÍQUESE Y ARCHÍVESE', bold: true, size: 18, color: '555555' }),
          ],
        }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({ text: '_____________________________________\n', bold: true }),
                        new TextRun({ text: 'JEFATURA DEPARTAMENTO DAF\n', bold: true, size: 16 }),
                        new TextRun({ text: 'Visador Técnico de Adquisición', size: 14, color: '666666' }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({ text: '_____________________________________\n', bold: true }),
                        new TextRun({ text: 'DIRECCIÓN EJECUTIVA CMDS\n', bold: true, size: 16 }),
                        new TextRun({ text: 'Corporación Municipal de Antofagasta', size: 14, color: '666666' }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),

        // SGSI / Footer de Verificación Digital
        new Paragraph({
          spacing: { before: 400 },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: '--- DOCUMENTO OFICIAL AUTENTICADO DIGITALMENTE ---', bold: true, size: 14, color: '016098' }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Folio: ', bold: true, size: 14 }),
            new TextRun({ text: '{folio}  |  ', size: 14 }),
            new TextRun({ text: 'CUV: ', bold: true, size: 14 }),
            new TextRun({ text: '{cuv}  |  ', size: 14 }),
            new TextRun({ text: 'Versión: ', bold: true, size: 14 }),
            new TextRun({ text: '{version}', size: 14 }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Hash de Integridad (SHA-256): ', size: 12, color: '777777' }),
            new TextRun({ text: '{hash_sha256}', size: 12, color: '777777' }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Verificación pública de validez: ', size: 12, color: '777777' }),
            new TextRun({ text: '{url_validacion}', size: 12, color: '016098', underline: {} }),
          ],
        }),
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  const uploadsDir = path.resolve(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fileName = `plantilla-resolucion-compra-cuadro-${Date.now()}.docx`;
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, buffer);
  console.log(`Archivo Word creado en: ${filePath}`);

  // Registrar plantilla en base de datos
  const zip = new PizZip(buffer);
  const xml = zip.file('word/document.xml')?.asText() || '';
  const cleanText = xml.replace(/<[^>]+>/g, '');

  // Detectar tablas dinámicas
  const loopRegex = /\{#\s*([a-zA-Z0-9_]+)\s*\}([\s\S]*?)\{\/\s*\1\s*\}/g;
  const innerVarRegex = /\{([a-zA-Z0-9_]+)\}/g;
  const scalarRegex = /\{([a-zA-Z0-9_]+)\}/g;

  const tableLoops: Map<string, string[]> = new Map();
  const tableInnerCols: Set<string> = new Set();
  const scalarVars: Set<string> = new Set();

  let loopMatch;
  while ((loopMatch = loopRegex.exec(cleanText)) !== null) {
    const loopName = loopMatch[1].trim();
    const cols: string[] = [];
    let innerMatch;
    while ((innerMatch = innerVarRegex.exec(loopMatch[2])) !== null) {
      const c = innerMatch[1].trim();
      if (c !== loopName && !cols.includes(c)) {
        cols.push(c);
        tableInnerCols.add(c);
      }
    }
    tableLoops.set(loopName, cols);
  }

  let match;
  while ((match = scalarRegex.exec(cleanText)) !== null) {
    const v = match[1].trim();
    if (!tableInnerCols.has(v) && !tableLoops.has(v)) {
      scalarVars.add(v);
    }
  }

  const fieldsData: any[] = [];
  scalarVars.forEach((v) => {
    // Excluir variables autogeneradas por el sistema si se desea
    if (['folio', 'cuv', 'hash_sha256', 'url_validacion', 'version'].includes(v.toLowerCase())) return;
    const lower = v.toLowerCase();
    let type = 'text';
    if (lower.includes('fecha')) type = 'date';
    else if (lower.includes('monto') || lower.includes('precio') || lower.includes('valor')) type = 'number';
    else if (lower.includes('motivo') || lower.includes('considerando')) type = 'textarea';

    fieldsData.push({
      name: v,
      type,
      description: `Campo ${v}`
    });
  });

  tableLoops.forEach((cols, loopName) => {
    fieldsData.push({
      name: loopName,
      type: 'table',
      description: JSON.stringify({
        columns: cols,
        label: 'Detalle de Bienes e Insumos'
      })
    });
  });

  const template = await prisma.template.create({
    data: {
      name: 'Resolución de Compra y Adquisición con Cuadro de Bienes',
      filePath: fileName,
      department: 'DAF',
      confidentiality: 'INTERNO',
      fields: {
        create: fieldsData
      }
    },
    include: { fields: true }
  });

  console.log(`✅ Plantilla registrada con éxito (ID: ${template.id}):`);
  console.log(`- Nombre: ${template.name}`);
  console.log(`- Departamento: ${template.department}`);
  console.log(`- Campos detectados (${template.fields.length}):`);
  template.fields.forEach(f => console.log(`   * ${f.name} [${f.type}] - ${f.description}`));
}

createTableTemplate()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
