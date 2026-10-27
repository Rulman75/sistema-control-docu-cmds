import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const desktopPath = path.join('C:', 'Users', 'rhormazabal', 'Desktop');
const originalBackup = path.join(desktopPath, 'INTENCIÓN_DE_GRAN_COMPRA_ORIGINAL.docx');
const fileToProcess = fs.existsSync(originalBackup) ? originalBackup : path.join(desktopPath, 'INTENCIÓN_DE_GRAN_COMPRA.docx');

console.log('Procesando archivo base desde:', fileToProcess);
const fileContent = fs.readFileSync(fileToProcess, 'binary');
const zip = new PizZip(fileContent);

let docXml = zip.file('word/document.xml')?.asText() || '';

// 1. Limpieza de proofErr que dividen palabras y etiquetas
docXml = docXml.replace(/<w:proofErr[^>]*\/>/g, '');

// 2. Normalización de tags partidos por runs de Word
// Caso 1: { </w:t>...<w:t>tag</w:t>...<w:t> }
docXml = docXml.replace(/\{<\/w:t><\/w:r>[\s\S]*?<w:t>([^<]+)<\/w:t><\/w:r>[\s\S]*?<w:t>\}/g, '{$1}');

// Caso 2: {tag </w:t>...<w:t> }
docXml = docXml.replace(/\{([a-zA-Z0-9_]+)<\/w:t><\/w:r>[\s\S]*?<w:t>\}/g, '{$1}');

// 3. Estandarización de nombres de variables
docXml = docXml.replace(/\{convevio_marco_id\}/g, '{convenio_marco_id}');
docXml = docXml.replace(/\{requeriminetos\}/g, '{requerimientos}');
docXml = docXml.replace(/\{mont_en_texto\}/g, '{monto_total_texto}');
docXml = docXml.replace(/\{monto_texto\}/g, '{monto_total_texto}');
docXml = docXml.replace(/\{monto\}/g, '{monto_total}');
docXml = docXml.replace(/\{fecha_en_texto\}/g, '{fecha_resolucion}');

// 4. Parametrización de textos legales y administrativos fijos
// Considerando II: Monto y financiamiento
docXml = docXml.replace(
  /\$993\.814\.000\.- \(Novecientos noventa y tres millones ochocientos catorce mil pesos\)\. IVA y despacho incluidos, mediante financiamiento Subvención Escolar Preferencial \(SEP\) y 10% Administración SEP/g,
  '{monto_total}.- ({monto_total_texto}). IVA y despacho incluidos, mediante financiamiento {financiamiento}'
);

// Considerando III: Certificados de disponibilidad presupuestaria
docXml = docXml.replace(
  /certificados de disponibilidad presupuestaria N°22\.805 y N°22\.905,/g,
  'certificados de disponibilidad presupuestaria {certificados_presupuestarios},'
);

// Tabla 1 Fila 6: Desglose presupuestario
const oldDesgloseRegex = /\{monto_total\}\.- \(\{monto_total_texto\}\)\. Impuestos y costos de despacho incluidos, los que se desglosan de la siguiente manera:-Presupuesto disponible Notebook:[\s\S]*?Antofagasta\./;
if (oldDesgloseRegex.test(docXml)) {
  docXml = docXml.replace(
    oldDesgloseRegex,
    '{monto_total}.- ({monto_total_texto}). Impuestos y costos de despacho incluidos, los que se desglosan de la siguiente manera:\n{desglose_presupuesto}'
  );
}

// Emails de consultas en Tabla 2
docXml = docXml.replace(
  /pecheverria@cmds\.cl con copia a wilma\.vega@cmds\.cl/g,
  '{email_consultas}'
);

// 5. Dinamización de Tabla 3 (Descripción de Productos Requeridos)
const table3Regex = /(<w:tr[\s\S]*?ID REFERENCIAL[\s\S]*?ESPECIFICACIONES TÉCNICAS[\s\S]*?CANTIDAD[\s\S]*?<\/w:tr>)([\s\S]*?)(<\/w:tbl>)/;
const matchT3 = table3Regex.exec(docXml);
if (matchT3) {
  const dynamicRow3 = `<w:tr><w:tc><w:p><w:r><w:rPr><w:rFonts w:ascii="Garamond" w:hAnsi="Garamond"/><w:sz w:val="20"/></w:rPr><w:t>{#productos}{id_referencial}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:rPr><w:rFonts w:ascii="Garamond" w:hAnsi="Garamond"/><w:sz w:val="20"/></w:rPr><w:t>{especificaciones_tecnicas}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:rPr><w:rFonts w:ascii="Garamond" w:hAnsi="Garamond"/><w:sz w:val="20"/></w:rPr><w:t>{cantidad}{/productos}</w:t></w:r></w:p></w:tc></w:tr>`;
  docXml = docXml.replace(matchT3[0], matchT3[1] + dynamicRow3 + matchT3[3]);
  console.log('✅ Tabla 3 dinamizada con {#productos}');
}

// 6. Dinamización de Tabla 7 (Anexo N°1 - Requerimientos Técnicos Mínimos)
const table7Regex = /(REQUERIMIENTOS TÉCNICOS MÍNIMOS Y CANTIDADES[\s\S]*?<w:tbl>[\s\S]*?<w:tr[\s\S]*?ID REFERENCIAL[\s\S]*?ESPECIFICACIONES TÉCNICAS[\s\S]*?CANTIDAD[\s\S]*?<\/w:tr>)([\s\S]*?)(<\/w:tbl>)/;
const matchT7 = table7Regex.exec(docXml);
if (matchT7) {
  const dynamicRow7 = `<w:tr><w:tc><w:p><w:r><w:rPr><w:rFonts w:ascii="Garamond" w:hAnsi="Garamond"/><w:sz w:val="20"/></w:rPr><w:t>{#productos}{id_referencial}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:rPr><w:rFonts w:ascii="Garamond" w:hAnsi="Garamond"/><w:sz w:val="20"/></w:rPr><w:t>{especificaciones_tecnicas}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:rPr><w:rFonts w:ascii="Garamond" w:hAnsi="Garamond"/><w:sz w:val="20"/></w:rPr><w:t>{cantidad}{/productos}</w:t></w:r></w:p></w:tc></w:tr>`;
  docXml = docXml.replace(matchT7[0], matchT7[1] + dynamicRow7 + matchT7[3]);
  console.log('✅ Tabla 7 (Anexo N°1) dinamizada con {#productos}');
}

// 7. Parametrización del Acuerdo Complementario (Contrato final)
// Comparecencia
docXml = docXml.replace(
  /En Antofagasta, a XX de XX del 2026, entre la CORPORACIÓN MUNICIPAL DE DESARROLLO SOCIAL DE ANTOFAGASTA, Persona jurídica de derecho privado, sin fines de lucro, R\.U\.T\. N° 70\.885\.500-2, representada por su Secretario General Ejecutivo, don JONATHAN VERGARA ARAYA,[\s\S]*?ambos con domicilio en Avenida Angamos N° 587 de esta ciudad, en adelante indistintamente "CMDS", y por la otra don XXXXXX,[\s\S]*?cédula nacional de identidad N° XXXXX, en representación de XXXXXX, Rol Único Tributario N° XXXXXX, ambos con domicilio en XXXXXXX/g,
  'En Antofagasta, a {fecha_acuerdo_complementario}, entre la CORPORACIÓN MUNICIPAL DE DESARROLLO SOCIAL DE ANTOFAGASTA, Persona jurídica de derecho privado, sin fines de lucro, R.U.T. N° 70.885.500-2, representada por su Secretario General Ejecutivo, don {nombre_secretario_ejecutivo}, ambos con domicilio en Avenida Angamos N° 587 de esta ciudad, en adelante indistintamente "CMDS", y por la otra don {representante_legal}, cédula nacional de identidad N° {rut_representante_legal}, en representación de {proveedor_razon_social}, Rol Único Tributario N° {proveedor_rut}, ambos con domicilio en {proveedor_domicilio}'
);

// Personería notarial del adjudicatario
docXml = docXml.replace(
  /La personería de don XXXXX, consta en la escritura pública de fecha XXX de XXX de XXXX, otorgada ante el Notario Público de XXXXXX\./g,
  'La personería de don {representante_legal}, consta en la escritura pública de fecha {fecha_escritura_poder}, otorgada ante el Notario Público {notario_poder}.'
);

// Cláusulas de factoring y multas
docXml = docXml.replace(/JONATHAN VERGARA ARAYA/g, '{nombre_secretario_ejecutivo}');
docXml = docXml.replace(/de parte de XXXXX de los servicios contratados/g, 'de parte de {proveedor_razon_social} de los servicios contratados');
docXml = docXml.replace(/autoriza a XXXX para ceder derechos/g, 'autoriza a {proveedor_razon_social} para ceder derechos');
docXml = docXml.replace(/XXXX debe informar con antelación/g, '{proveedor_razon_social} debe informar con antelación');
docXml = docXml.replace(/caso que XXXXX efectúe operación/g, 'caso que {proveedor_razon_social} efectúe operación');
docXml = docXml.replace(/XXXX debe enviar correo electrónico/g, '{proveedor_razon_social} debe enviar correo electrónico');
docXml = docXml.replace(/comunicación por parte de XXXXX la hará/g, 'comunicación por parte de {proveedor_razon_social} la hará');
docXml = docXml.replace(/deuda u obligación de pago que la CMDS tenga con XXXXX\./g, 'deuda u obligación de pago que la CMDS tenga con {proveedor_razon_social}.');
docXml = docXml.replace(/en el historial de evaluación de XXXXX para/g, 'en el historial de evaluación de {proveedor_razon_social} para');
docXml = docXml.replace(/respecto de XXXXXX y que se aparten/g, 'respecto de {proveedor_razon_social} y que se aparten');

// Bloque de firmas final del contrato
docXml = docXml.replace(
  /__________________________________                                        _______________________________[\s\S]*?Secretario General Ejecutivo                                           Representante Legal[\s\S]*?Desarrollo Social de Antofagasta/g,
  `__________________________________                                        _______________________________
{nombre_secretario_ejecutivo}                                              {representante_legal}
Secretario General Ejecutivo                                           Representante Legal
Corporación Municipal de Desarrollo Social                             {proveedor_razon_social}`
);

// 8. Sello Institucional SGSI al pie del documento
const sgsiStamp = `
<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="300"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Garamond" w:hAnsi="Garamond"/><w:b/><w:sz w:val="18"/><w:color w:val="016098"/></w:rPr><w:t>--- CERTIFICACIÓN DIGITAL INSTITUCIONAL CMDS ---</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Garamond" w:hAnsi="Garamond"/><w:sz w:val="16"/></w:rPr><w:t>Folio Oficial: {num_resolucion}  |  CUV: {cuv}  |  Versión: {version}</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Garamond" w:hAnsi="Garamond"/><w:sz w:val="14"/><w:color w:val="666666"/></w:rPr><w:t>Hash SHA-256: {hash_sha256}</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Garamond" w:hAnsi="Garamond"/><w:sz w:val="14"/><w:color w:val="016098"/></w:rPr><w:t>Validación en línea: {url_validacion}</w:t></w:r></w:p>
`;

// Insertar sello antes de </w:body>
docXml = docXml.replace('</w:body>', `${sgsiStamp}</w:body>`);

// Guardar XML modificado en zip
zip.file('word/document.xml', docXml);

const newBuffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });

// Validar con docxtemplater
const testDoc = new Docxtemplater(new PizZip(newBuffer), { paragraphLoop: true, linebreaks: true });
console.log('✅ Verificación docxtemplater: Archivo perfectamente válido.');

// 9. Guardar archivos
const finalDesktopFile = path.join(desktopPath, 'INTENCIÓN_DE_GRAN_COMPRA.docx');
const finalPlantillaCopy = path.join(desktopPath, 'INTENCIÓN_DE_GRAN_COMPRA_PLANTILLA.docx');
fs.writeFileSync(finalDesktopFile, newBuffer);
fs.writeFileSync(finalPlantillaCopy, newBuffer);
console.log('✅ Archivo actualizado en:', finalDesktopFile);
console.log('✅ Copia de plantilla en:', finalPlantillaCopy);

// Copiar a uploads de la aplicación para registrarla en el sistema
const uploadsDir = path.resolve(__dirname, '../uploads');
const dbFileName = `plantilla-gran-compra-oficial.docx`;
const dbFilePath = path.join(uploadsDir, dbFileName);
fs.writeFileSync(dbFilePath, newBuffer);

// 10. Registrar la plantilla en Prisma
async function registerInDb() {
  const cleanText = docXml.replace(/<[^>]+>/g, '');
  const loopRegex = /\{#\s*([a-zA-Z0-9_]+)\s*\}([\s\S]*?)\{\/\s*\1\s*\}/g;
  const innerVarRegex = /\{([a-zA-Z0-9_]+)\}/g;
  const scalarRegex = /\{([a-zA-Z0-9_]+)\}/g;

  const tableLoops = new Map<string, string[]>();
  const tableInnerCols = new Set<string>();

  let lMatch;
  while ((lMatch = loopRegex.exec(cleanText)) !== null) {
    const loopName = lMatch[1].trim();
    const cols: string[] = [];
    let iMatch;
    while ((iMatch = innerVarRegex.exec(lMatch[2])) !== null) {
      const c = iMatch[1].trim();
      if (c !== loopName && !cols.includes(c)) {
        cols.push(c);
        tableInnerCols.add(c);
      }
    }
    tableLoops.set(loopName, cols);
  }

  const scalarVars = new Set<string>();
  let sMatch;
  while ((sMatch = scalarRegex.exec(cleanText)) !== null) {
    const v = sMatch[1].trim();
    if (!tableInnerCols.has(v) && !tableLoops.has(v)) {
      scalarVars.add(v);
    }
  }

  const fieldsData: any[] = [];
  scalarVars.forEach((v) => {
    if (['cuv', 'hash_sha256', 'url_validacion', 'version'].includes(v.toLowerCase())) return;
    const lower = v.toLowerCase();
    let type = 'text';
    if (lower.includes('texto')) type = 'text';
    else if (lower.includes('fecha')) type = 'date';
    else if (lower.includes('monto') || lower.includes('precio') || lower.includes('valor')) type = 'number';
    else if (lower.includes('desglose') || lower.includes('requerimiento') || lower.includes('materia')) type = 'textarea';

    fieldsData.push({
      name: v,
      type,
      description: `Campo ${v}`
    });
  });

  tableLoops.forEach((cols, name) => {
    fieldsData.push({
      name,
      type: 'table',
      description: JSON.stringify({
        columns: cols,
        label: 'Cuadro de Productos Requeridos'
      })
    });
  });

  // Eliminar versión previa en BD si existía con ese nombre
  await prisma.template.deleteMany({
    where: { name: 'Resolución de Intención de Gran Compra (Convenio Marco)' }
  });

  const template = await prisma.template.create({
    data: {
      name: 'Resolución de Intención de Gran Compra (Convenio Marco)',
      filePath: dbFileName,
      department: 'TRANSVERSAL',
      confidentiality: 'INTERNO',
      fields: {
        create: fieldsData
      }
    },
    include: { fields: true }
  });

  console.log(`\n🎉 Plantilla registrada en el Sistema de Control Documental CMDS:`);
  console.log(`- ID: ${template.id}`);
  console.log(`- Nombre: ${template.name}`);
  console.log(`- Total variables detectadas: ${template.fields.length}`);
  console.log('\nListado de variables registradas:');
  template.fields.forEach(f => {
    console.log(`  * ${f.name} [${f.type}]`);
  });
}

registerInDb()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
