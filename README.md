# Sistema de Control Documental — CMDS Antofagasta

Plataforma de gestión, generación dinámica de documentos Word (`.docx`), flujo de visación/firma electrónica con código QR/CUV y pista de auditoría inalterable (SGSI / RBAC) para la **Corporación Municipal de Desarrollo Social de Antofagasta (CMDS)**.

---

## Arquitectura del Proyecto

- **`backend/`**: API REST en Node.js + TypeScript + Express + Prisma ORM (SQLite) + `docxtemplater` + `qrcode`.
- **`frontend/`**: Aplicación SPA en React 19 + TypeScript + Vite + Tailwind CSS + DaisyUI.

---

## Requisitos Previos

- **Node.js** `v22.23.4+` / `v24.22.1+`
- **npm** `v10+`

---

## Instalación y Ejecución Local

### 1. Backend (`http://localhost:3001`)
```bash
cd backend
npm install
npx prisma generate
npm run dev
```

### 2. Frontend (`http://localhost:5173`)
```bash
cd frontend
npm install
npm run dev
```

---

## Módulos Principales

1. **Dashboard Institucional**: Métricas de expedientes, estado de firmas y bandeja rápida.
2. **Mantenedor de Plantillas (`.docx`)**: Detección automática de variables simples (`{variable}`), bloques condicionales y tablas dinámicas (`{#tabla}...{/tabla}`).
3. **Generador de Documentos**: Formulario dinámico con soporte para tablas de ítems, asignación de Folio Institucional y Código Único de Verificación (CUV) con QR incrustado.
4. **Flujo de Aprobaciones y Visación**: Revisión técnica por Jefatura de Departamento y Firma de Dirección Ejecutiva.
5. **Mantenedor de Usuarios, Departamentos y Roles (RBAC)**: Gestión de funcionarios (RUT numérico + DV con validación Módulo 11), asignación de privilegios y reseteo seguro de claves.
6. **Pista de Auditoría Forense (SGSI)**: Registro inalterable con hash criptográfico encadenado (`SHA-256`) de todas las acciones administrativas y documentales.
7. **Portal Público de Validación Documental**: Consulta de autenticidad mediante código CUV o escaneo QR.
