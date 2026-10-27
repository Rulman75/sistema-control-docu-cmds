import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  FilePlus, FileText, Download, CheckCircle2, AlertCircle,
  User, ShieldAlert, Building2, RefreshCw, GitBranch, Clock,
  Table as TableIcon, Plus, Trash2, Calculator
} from 'lucide-react';

export default function Generar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const selectedIdFromUrl = searchParams.get('templateId');
  const fromDocumentId = searchParams.get('fromDocumentId');

  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(selectedIdFromUrl || '');
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

  // Versionamiento y derivación
  const [parentDoc, setParentDoc] = useState<any | null>(null);
  const [changeLog, setChangeLog] = useState('');
  const [documentStatus, setDocumentStatus] = useState('EMITIDO');

  const [department, setDepartment] = useState('CASA_CENTRAL');
  const [confidentiality, setConfidentiality] = useState('INTERNO');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [createdBy, setCreatedBy] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    downloadUrl: string;
    fileName: string;
    documentId: number;
    folio: string;
    version: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setCreatedBy(`${currentUser.name} (${currentUser.role})`);
      setDepartment((currentUser.department as string) === 'TRANSVERSAL' ? 'CASA_CENTRAL' : currentUser.department);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchTemplates();
  }, [currentUser]);

  useEffect(() => {
    if (fromDocumentId) {
      fetchParentDocument(Number(fromDocumentId));
    }
  }, [fromDocumentId]);

  const fetchParentDocument = async (id: number) => {
    try {
      const res = await axios.get(`http://localhost:3001/api/documents/${id}`);
      const doc = res.data;
      setParentDoc(doc);
      setSelectedTemplateId(String(doc.templateId));
      setDepartment(doc.department);
      setConfidentiality(doc.confidentiality);

      try {
        const parsed = JSON.parse(doc.data);
        setFormData(parsed);
      } catch (e) {
        console.error(e);
      }
    } catch (err) {
      console.error('Error fetching parent document:', err);
    }
  };

  useEffect(() => {
    if (selectedIdFromUrl && !fromDocumentId) {
      setSelectedTemplateId(selectedIdFromUrl);
    }
  }, [selectedIdFromUrl, fromDocumentId]);

  useEffect(() => {
    if (selectedTemplateId && templates.length > 0) {
      const found = templates.find((t) => t.id === Number(selectedTemplateId));
      setSelectedTemplate(found || null);

      if (found && !parentDoc) {
        if (found.department && found.department !== 'TRANSVERSAL') {
          setDepartment(found.department);
        }
        if (found.confidentiality) {
          setConfidentiality(found.confidentiality);
        }

        const initial: Record<string, any> = {};
        if (found.fields) {
          found.fields.forEach((f: any) => {
            if (f.type === 'table') {
              let cols = ['num', 'descripcion', 'cantidad', 'precio_unitario', 'total'];
              try {
                if (f.description && f.description.startsWith('{')) {
                  const meta = JSON.parse(f.description);
                  if (meta.columns && meta.columns.length > 0) cols = meta.columns;
                }
              } catch (e) {}
              const firstRow: Record<string, any> = {};
              cols.forEach((col: string) => {
                firstRow[col] = (col === 'num' || col === 'n' || col === 'item' || col === 'numero') ? '1' : '';
              });
              initial[f.name] = [firstRow];
            } else if (f.name.toLowerCase().includes('fecha')) {
              initial[f.name] = new Date().toISOString().split('T')[0];
            } else {
              initial[f.name] = '';
            }
          });
        }
        setFormData(initial);
      }
      setGeneratedResult(null);
      setError(null);
    } else {
      setSelectedTemplate(null);
    }
  }, [selectedTemplateId, templates, parentDoc]);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/templates');
      setTemplates(res.data);
      if (selectedIdFromUrl) {
        setSelectedTemplateId(selectedIdFromUrl);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    setParentDoc(null);
    setSearchParams(id ? { templateId: id } : {});
  };

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleAddTableRow = (fieldName: string, cols: string[]) => {
    const currentRows = Array.isArray(formData[fieldName]) ? [...formData[fieldName]] : [];
    const nextNum = currentRows.length + 1;
    const newRow: Record<string, any> = {};
    cols.forEach((c) => {
      if (c === 'num' || c === 'n' || c === 'item' || c === 'numero') {
        newRow[c] = String(nextNum);
      } else {
        newRow[c] = '';
      }
    });
    handleInputChange(fieldName, [...currentRows, newRow]);
  };

  const handleRemoveTableRow = (fieldName: string, index: number) => {
    const currentRows = Array.isArray(formData[fieldName]) ? [...formData[fieldName]] : [];
    if (currentRows.length <= 1) {
      const clearedRow: Record<string, any> = {};
      Object.keys(currentRows[0] || {}).forEach(k => {
        clearedRow[k] = (k === 'num' || k === 'n' || k === 'item' || k === 'numero') ? '1' : '';
      });
      handleInputChange(fieldName, [clearedRow]);
      return;
    }
    currentRows.splice(index, 1);
    const renumbered = currentRows.map((r, idx) => {
      const copy = { ...r };
      ['num', 'n', 'item', 'numero'].forEach((k) => {
        if (k in copy) copy[k] = String(idx + 1);
      });
      return copy;
    });
    handleInputChange(fieldName, renumbered);
  };

  const handleTableCellChange = (fieldName: string, rowIndex: number, column: string, value: string) => {
    const currentRows = Array.isArray(formData[fieldName]) ? [...formData[fieldName]] : [];
    const updatedRow = { ...(currentRows[rowIndex] || {}), [column]: value };

    // Auto calcular total si cantidad y precio unitario se modifican
    const isQtyOrPrice = column.toLowerCase().includes('cantidad') || column.toLowerCase().includes('precio') || column.toLowerCase().includes('unitario') || column.toLowerCase().includes('valor');
    const totalCol = Object.keys(updatedRow).find(k => k.toLowerCase() === 'total' || k.toLowerCase() === 'monto_item' || k.toLowerCase() === 'subtotal');

    if (isQtyOrPrice && totalCol) {
      const qtyCol = Object.keys(updatedRow).find(k => k.toLowerCase().includes('cantidad') || k.toLowerCase() === 'cant');
      const priceCol = Object.keys(updatedRow).find(k => (k.toLowerCase().includes('precio') || k.toLowerCase().includes('unitario') || k.toLowerCase().includes('valor')) && k !== totalCol);
      if (qtyCol && priceCol) {
        const q = parseFloat(String(updatedRow[qtyCol] || '0').replace(/[^0-9.-]/g, ''));
        const p = parseFloat(String(updatedRow[priceCol] || '0').replace(/[^0-9.-]/g, ''));
        if (!isNaN(q) && !isNaN(p) && q > 0 && p > 0) {
          updatedRow[totalCol] = String(Math.round(q * p));
        }
      }
    }

    currentRows[rowIndex] = updatedRow;

    // Auto calcular suma total para campos escalares como monto_total si existen en el formulario
    const scalarTotalKey = Object.keys(formData).find(k => ['monto_total', 'total_general', 'total', 'monto'].includes(k.toLowerCase()) && typeof formData[k] !== 'object');
    if (scalarTotalKey && totalCol) {
      let sum = 0;
      currentRows.forEach(r => {
        const val = parseFloat(String(r[totalCol] || '0').replace(/[^0-9.-]/g, ''));
        if (!isNaN(val)) sum += val;
      });
      setFormData(prev => ({
        ...prev,
        [fieldName]: currentRows,
        [scalarTotalKey]: String(sum)
      }));
      return;
    }

    handleInputChange(fieldName, currentRows);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    setGenerating(true);
    setError(null);

    try {
      const res = await axios.post('http://localhost:3001/api/documents/generate', {
        templateId: selectedTemplate.id,
        data: formData,
        department,
        confidentiality,
        createdBy: createdBy || currentUser?.name,
        parentDocumentId: parentDoc ? parentDoc.id : null,
        changeLog: changeLog || (parentDoc ? 'Ajuste de variables' : undefined),
        status: documentStatus
      });

      setGeneratedResult({
        downloadUrl: res.data.downloadUrl,
        fileName: res.data.fileName,
        documentId: res.data.document.id,
        folio: res.data.folio,
        version: res.data.version
      });
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Error al generar el documento');
    } finally {
      setGenerating(false);
    }
  };

  const formatFieldLabel = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getFieldType = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('fecha')) return 'date';
    if (lower.includes('monto') || lower.includes('valor') || lower.includes('precio') || lower.includes('cantidad')) {
      return 'number';
    }
    if (lower.includes('detalle') || lower.includes('descripcion') || lower.includes('observacion') || lower.includes('considerando') || lower.includes('vistos')) {
      return 'textarea';
    }
    return 'text';
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Encabezado */}
      <div>
        <div className="flex items-center gap-2">
          {parentDoc ? <GitBranch size={24} className="text-[#016098]" /> : <FilePlus size={24} className="text-[#016098]" />}
          <h1 className="text-2xl font-bold text-[#016098]">
            {parentDoc ? 'Creación de Nueva Versión Documental' : 'Generación y Emisión de Documentos Oficiales'}
          </h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {parentDoc
            ? `Generando versión incrementada a partir de ${parentDoc.folio} (v${parentDoc.version}) sin sobrescribir el archivo histórico.`
            : 'Asignación automática de Folio Institucional, estados y registro en Pista de Auditoría SGSI.'}
        </p>
      </div>

      {/* Banner de Derivación de Versión */}
      {parentDoc && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-lg">
              <GitBranch size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-indigo-900">
                Derivado de: {parentDoc.folio} (Versión {parentDoc.version})
              </h3>
              <p className="text-xs text-indigo-700">
                Los campos han sido precargados. Puedes modificar cualquier dato para generar la nueva versión vinculada.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setParentDoc(null);
              setSearchParams({});
            }}
            className="btn btn-ghost btn-xs text-indigo-800"
          >
            Cancelar derivación
          </button>
        </div>
      )}

      {/* Alerta de Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-800 border border-red-200 flex items-center gap-3 text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Selector de Plantilla (deshabilitado si es derivado) */}
      {!parentDoc && (
        <div className="card bg-white shadow-sm border border-[#e2e8f0]">
          <div className="card-body p-6">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              1. Selecciona el Formato Tipo a Generar:
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                className="select select-bordered select-sm w-full font-medium text-gray-700"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                <option value="">-- Selecciona una plantilla --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} [{t.department}] ({t.fields?.length || 0} variables)
                  </option>
                ))}
              </select>
              {templates.length === 0 && (
                <Link to="/plantillas" className="btn btn-sm bg-[#39BABD] text-white border-none shrink-0">
                  Subir Plantilla
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Estado: Documento Generado con Éxito */}
      {generatedResult && (
        <div className="card bg-emerald-50 border-2 border-emerald-400 shadow-md">
          <div className="card-body p-6 text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-emerald-800 font-bold text-lg">
                <CheckCircle2 size={22} className="text-emerald-600" />
                <span>
                  {parentDoc ? `¡Versión ${generatedResult.version} Generada con Éxito!` : '¡Documento Emitido con Folio Oficial!'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge badge-lg bg-[#016098] text-white font-mono font-bold">
                  Folio: {generatedResult.folio}
                </span>
                <span className="badge badge-lg bg-indigo-600 text-white font-mono font-bold">
                  v{generatedResult.version}
                </span>
                <span className="badge badge-lg bg-emerald-100 text-emerald-800 font-bold border-none">
                  {documentStatus}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Se registró el evento y versión en la Pista de Auditoría inalterable de Contraloría.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 sm:mt-0 shrink-0">
              <a
                href={`http://localhost:3001/api/documents/${generatedResult.documentId}/download`}
                className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm gap-2"
              >
                <Download size={16} /> Descargar Word (.docx)
              </a>
              <button
                onClick={() => setGeneratedResult(null)}
                className="btn btn-sm btn-ghost text-gray-600"
              >
                Generar otro
              </button>
              <Link
                to="/historial"
                className="btn btn-sm bg-white text-[#016098] border border-gray-200"
              >
                Ver en Historial
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Formulario Dinámico con Metadatos SGSI y Versionamiento */}
      {selectedTemplate && (
        <div className="card bg-white shadow-sm border border-[#e2e8f0]">
          <div className="card-body p-6">
            <div className="border-b border-gray-200 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="text-xs uppercase font-bold text-[#016098] tracking-wider">
                  2. Datos y Metadatos Requeridos:
                </span>
                <h2 className="text-xl font-bold text-gray-800">{selectedTemplate.name}</h2>
              </div>
              <span className="badge bg-blue-50 text-[#016098] border-blue-200 font-medium">
                {selectedTemplate.fields?.length || 0} campos automáticos
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sección de Metadatos Institucionales (SGSI / RBAC / Estados) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <User size={13} className="text-[#016098]" /> Funcionario Emisor:
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm w-full bg-white text-xs"
                    value={createdBy}
                    onChange={(e) => setCreatedBy(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Building2 size={13} className="text-[#016098]" /> Departamento:
                  </label>
                  <select
                    className="select select-bordered select-sm w-full bg-white text-xs font-medium"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="CASA_CENTRAL">CASA CENTRAL</option>
                    <option value="DAF">DAF / FINANZAS</option>
                    <option value="EDUCACION">DIRECCIÓN EDUCACIÓN</option>
                    <option value="SALUD">DIRECCIÓN SALUD</option>
                    <option value="JURIDICA">DIRECCIÓN JURÍDICA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <ShieldAlert size={13} className="text-[#016098]" /> Confidencialidad:
                  </label>
                  <select
                    className="select select-bordered select-sm w-full bg-white text-xs font-medium"
                    value={confidentiality}
                    onChange={(e) => setConfidentiality(e.target.value)}
                  >
                    <option value="PUBLICO">Público (Transparencia)</option>
                    <option value="INTERNO">Interno (Uso CMDS)</option>
                    <option value="RESERVADO">Reservado (Jefaturas)</option>
                    <option value="CONFIDENCIAL">Confidencial (Restringido)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Clock size={13} className="text-[#016098]" /> Estado Inicial:
                  </label>
                  <select
                    className="select select-bordered select-sm w-full bg-white text-xs font-medium"
                    value={documentStatus}
                    onChange={(e) => setDocumentStatus(e.target.value)}
                  >
                    <option value="EMITIDO">EMITIDO (Definitivo)</option>
                    <option value="BORRADOR">BORRADOR (Preliminar)</option>
                    <option value="EN_REVISION">EN REVISIÓN (Para visación)</option>
                  </select>
                </div>

                {/* Campo de notas de versión si es derivado */}
                {parentDoc && (
                  <div className="md:col-span-4 mt-2 pt-2 border-t border-slate-200">
                    <label className="block text-xs font-semibold text-indigo-900 mb-1">
                      Motivo o justificación del cambio de versión:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Corrección de RUT de proveedor y ajuste presupuestario de $12M a $13.2M"
                      className="input input-bordered input-sm w-full bg-white text-xs"
                      value={changeLog}
                      onChange={(e) => setChangeLog(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              {/* Campos dinámicos de la plantilla */}
              {selectedTemplate.fields && selectedTemplate.fields.length > 0 ? (
                <div className="space-y-6">
                  {/* 1. Variables escalares (textos, fechas, montos) */}
                  {selectedTemplate.fields.filter((f: any) => f.type !== 'table').length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedTemplate.fields
                        .filter((f: any) => f.type !== 'table')
                        .map((field: any) => {
                          const inputType = getFieldType(field.name);
                          const isTextArea = inputType === 'textarea';

                          return (
                            <div
                              key={field.id}
                              className={isTextArea ? 'md:col-span-2' : ''}
                            >
                              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                                <span>{formatFieldLabel(field.name)}</span>
                                <span className="text-[10px] font-mono text-gray-400">
                                  {'{'}{field.name}{'}'}
                                </span>
                              </label>

                              {isTextArea ? (
                                <textarea
                                  rows={3}
                                  className="textarea textarea-bordered textarea-sm w-full text-sm font-sans"
                                  value={formData[field.name] || ''}
                                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                                  placeholder={`Ingrese ${formatFieldLabel(field.name).toLowerCase()}...`}
                                  required
                                />
                              ) : (
                                <input
                                  type={inputType}
                                  className="input input-bordered input-sm w-full text-sm"
                                  value={formData[field.name] || ''}
                                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                                  placeholder={`Ingrese ${formatFieldLabel(field.name).toLowerCase()}...`}
                                  required
                                />
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* 2. Cuadros Dinámicos (Tablas de Ítems, Materiales, etc.) */}
                  {selectedTemplate.fields.filter((f: any) => f.type === 'table').map((field: any) => {
                    let columns: string[] = [];
                    let tableLabel = formatFieldLabel(field.name);
                    try {
                      if (field.description && field.description.startsWith('{')) {
                        const meta = JSON.parse(field.description);
                        if (meta.columns && Array.isArray(meta.columns)) columns = meta.columns;
                        if (meta.label) tableLabel = meta.label;
                      }
                    } catch (e) {}
                    if (columns.length === 0) {
                      columns = ['num', 'descripcion', 'cantidad', 'precio_unitario', 'total'];
                    }

                    const rows: Record<string, any>[] = Array.isArray(formData[field.name]) ? formData[field.name] : [];

                    // Calcular suma del cuadro si tiene columna total
                    const totalCol = columns.find(c => c.toLowerCase() === 'total' || c.toLowerCase() === 'monto_item' || c.toLowerCase() === 'subtotal');
                    let tableSum = 0;
                    if (totalCol) {
                      rows.forEach(r => {
                        const val = parseFloat(String(r[totalCol] || '0').replace(/[^0-9.-]/g, ''));
                        if (!isNaN(val)) tableSum += val;
                      });
                    }

                    return (
                      <div key={field.id} className="border border-slate-200 rounded-xl bg-slate-50/70 p-4 space-y-3">
                        {/* Header del cuadro */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-[#016098]/10 text-[#016098] rounded-lg">
                              <TableIcon size={18} />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                {tableLabel}
                                <span className="badge badge-sm bg-indigo-100 text-indigo-800 font-mono text-[10px]">
                                  {'{#'}{field.name}{'}'}
                                </span>
                              </h3>
                              <p className="text-[11px] text-gray-500">
                                Cuadro dinámico: Las filas se duplicarán automáticamente en la tabla Word manteniendo bordes y estilos.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="badge badge-sm bg-slate-200 text-slate-700 font-semibold">
                              {rows.length} {rows.length === 1 ? 'fila' : 'filas'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddTableRow(field.name, columns)}
                              className="btn btn-xs bg-[#39BABD] hover:bg-[#2c989b] text-white border-none gap-1 font-medium shadow-xs"
                            >
                              <Plus size={13} /> Agregar Fila
                            </button>
                          </div>
                        </div>

                        {/* Tabla Interactiva */}
                        <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-xs">
                          <table className="table table-xs w-full">
                            <thead>
                              <tr className="bg-slate-100/90 text-[#016098] font-bold border-b border-slate-200">
                                {columns.map((col) => (
                                  <th
                                    key={col}
                                    className={`py-2.5 px-3 uppercase text-[11px] tracking-wider ${
                                      col === 'num' || col === 'n' || col === 'item' ? 'w-14 text-center' :
                                      col.includes('cantidad') ? 'w-24 text-center' :
                                      col.includes('precio') || col.includes('unitario') ? 'w-32 text-right' :
                                      col === 'total' ? 'w-36 text-right' : ''
                                    }`}
                                  >
                                    {formatFieldLabel(col)}
                                  </th>
                                ))}
                                <th className="w-12 text-center py-2.5">Acción</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-slate-50 border-b border-slate-100">
                                  {columns.map((col) => {
                                    const isNumCol = col === 'num' || col === 'n' || col === 'item' || col === 'numero';
                                    const isCurrency = col.includes('precio') || col.includes('unitario') || col === 'total';
                                    const isQty = col.includes('cantidad') || col === 'cant';

                                    return (
                                      <td key={col} className="p-1.5">
                                        <input
                                          type="text"
                                          value={row[col] ?? ''}
                                          onChange={(e) => handleTableCellChange(field.name, rIdx, col, e.target.value)}
                                          placeholder={formatFieldLabel(col)}
                                          className={`input input-bordered input-xs w-full text-xs font-sans ${
                                            isNumCol ? 'text-center font-mono font-bold bg-slate-50' :
                                            isCurrency ? 'text-right font-mono font-medium' :
                                            isQty ? 'text-center font-mono' : ''
                                          }`}
                                          required={col === 'descripcion' || col === 'total'}
                                        />
                                      </td>
                                    );
                                  })}
                                  <td className="p-1.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveTableRow(field.name, rIdx)}
                                      disabled={rows.length <= 1}
                                      className="btn btn-ghost btn-xs text-red-500 hover:bg-red-50 disabled:opacity-30 p-1"
                                      title="Eliminar fila"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pie del cuadro con totales y botón rápido */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-xs">
                          <button
                            type="button"
                            onClick={() => handleAddTableRow(field.name, columns)}
                            className="btn btn-ghost btn-xs text-[#016098] hover:bg-blue-50 gap-1 font-medium"
                          >
                            <Plus size={13} /> Agregar otra fila
                          </button>

                          {totalCol && tableSum > 0 && (
                            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 font-medium">
                              <Calculator size={14} className="text-emerald-600" />
                              <span>Total calculado del cuadro:</span>
                              <span className="font-mono font-bold text-sm text-emerald-900">
                                ${tableSum.toLocaleString('es-CL')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                  Esta plantilla no tiene variables detectadas del tipo {'{variable}'}. Se generará el documento base directamente con el nuevo folio.
                </div>
              )}

              {/* Botón de emisión */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const reset: Record<string, any> = {};
                    selectedTemplate.fields?.forEach((f: any) => {
                      if (f.type === 'table') {
                        let cols = ['num', 'descripcion', 'cantidad', 'precio_unitario', 'total'];
                        try {
                          if (f.description && f.description.startsWith('{')) {
                            const meta = JSON.parse(f.description);
                            if (meta.columns && meta.columns.length > 0) cols = meta.columns;
                          }
                        } catch (e) {}
                        const firstRow: Record<string, any> = {};
                        cols.forEach((col: string) => {
                          firstRow[col] = (col === 'num' || col === 'n' || col === 'item' || col === 'numero') ? '1' : '';
                        });
                        reset[f.name] = [firstRow];
                      } else {
                        reset[f.name] = '';
                      }
                    });
                    setFormData(reset);
                  }}
                  className="btn btn-ghost btn-sm text-gray-500 gap-1 text-xs"
                >
                  <RefreshCw size={13} /> Limpiar Campos
                </button>

                <button
                  type="submit"
                  disabled={generating}
                  className="btn btn-sm bg-[#016098] hover:bg-[#014c78] text-white border-none gap-2 px-6 shadow-sm"
                >
                  {parentDoc ? <GitBranch size={16} /> : <FilePlus size={16} />}
                  {generating
                    ? 'Procesando documento...'
                    : parentDoc
                    ? 'Crear Nueva Versión Documental'
                    : documentStatus === 'BORRADOR'
                    ? 'Guardar Borrador'
                    : 'Emitir Documento Oficial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Estado vacío si no hay plantilla seleccionada */}
      {!selectedTemplate && (
        <div className="card bg-white shadow-sm border border-[#e2e8f0] p-12 text-center text-gray-500">
          <FileText className="mx-auto text-gray-300 mb-3" size={40} />
          <h3 className="text-base font-semibold text-gray-700">Selecciona una plantilla para comenzar</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            El sistema construirá automáticamente los campos del formulario y asignará el correlativo correspondiente.
          </p>
        </div>
      )}
    </div>
  );
}
