import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import fs from 'fs';
import path from 'path';

async function createSampleTemplate() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "CORPORACIÓN MUNICIPAL DE DESARROLLO SOCIAL DE ANTOFAGASTA",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "DIRECCIÓN DE ADMINISTRACIÓN Y FINANZAS",
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: "RESOLUCIÓN EXENTA N°: ", bold: true }),
              new TextRun("{numero_resolucion}"),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: "ANTOFAGASTA, ", bold: true }),
              new TextRun("{fecha_resolucion}"),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "VISTOS: ", bold: true }),
              new TextRun("Las facultades conferidas en los estatutos de la Corporación Municipal de Desarrollo Social de Antofagasta; la Ley de Compras Públicas N° 19.886 y su Reglamento; y las necesidades de servicio del Departamento de {departamento_solicitante}."),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "CONSIDERANDO: ", bold: true }),
              new TextRun("Que resulta indispensable para el normal funcionamiento de las actividades municipales llevar a cabo la contratación del servicio denominado: \"{descripcion_servicio}\", solicitado por {funcionario_solicitante}."),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "RESUELVO:", bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "1. APRUÉBASE ", bold: true }),
              new TextRun("la contratación directa o adquisición a favor del proveedor "),
              new TextRun({ text: "{nombre_proveedor}", bold: true }),
              new TextRun(", Rol Único Tributario N° "),
              new TextRun({ text: "{rut_proveedor}", bold: true }),
              new TextRun(", por un monto total de $"),
              new TextRun({ text: "{monto_total}", bold: true }),
              new TextRun(" pesos (impuestos incluidos)."),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "2. IMPÚTESE ", bold: true }),
              new TextRun("el gasto derivado de la presente resolución al ítem presupuestario: "),
              new TextRun("{item_presupuestario}"),
              new TextRun(" del presupuesto anual de la CMDS."),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "_____________________________________\n", bold: true }),
              new TextRun({ text: "{nombre_autoridad}\n", bold: true }),
              new TextRun("{cargo_autoridad}\n"),
              new TextRun("Corporación Municipal de Desarrollo Social de Antofagasta"),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(__dirname, '../uploads/plantilla_resolucion_exenta_cmds.docx');
  fs.writeFileSync(outPath, buffer);
  console.log('✅ Plantilla de prueba generada en:', outPath);
}

createSampleTemplate().catch(console.error);
