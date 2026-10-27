import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FileText, Upload, Trash2, FilePlus, Download, Info, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Plantillas() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [department, setDepartment] = useState('TRANSVERSAL');
  const [confidentiality, setConfidentiality] = useState('INTERNO');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [currentUser]);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/templates');
      setTemplates(res.data);
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!templateName) {
        setTemplateName(selected.name.replace(/\.docx$/i, ''));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', templateName || file.name.replace(/\.docx$/i, ''));
    formData.append('department', department);
    formData.append('confidentiality', confidentiality);

    try {
      const res = await axios.post('http://localhost:3001/api/templates/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFile(null);
      setTemplateName('');
      const fileInput = document.getElementById('templateFileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      setMessage({
        text: `Plantilla registrada con éxito en departamento ${department}. Se detectaron ${res.data.detectedVariables?.length || 0} variables.`,
        type: 'success'
      });
      fetchTemplates();
    } catch (err: any) {
      console.error(err);
      setMessage({
        text: err.response?.data?.error || 'Error al subir la plantilla',
        type: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar la plantilla "${name}"? El evento quedará registrado en la pista de auditoría.`)) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3001/api/templates/${id}`);
      setMessage({ text: 'Plantilla eliminada correctamente y auditada', type: 'success' });
      fetchTemplates();
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err.response?.data?.error || 'Error al eliminar la plantilla', type: 'error' });
    }
  };

  const getConfidentialityBadge = (conf: string) => {
    switch (conf) {
      case 'PUBLICO':
        return <span className="badge badge-xs bg-emerald-100 text-emerald-800 font-bold border-none">PÚBLICO</span>;
      case 'INTERNO':
        return <span className="badge badge-xs bg-blue-100 text-blue-800 font-bold border-none">INTERNO</span>;
      case 'RESERVADO':
        return <span className="badge badge-xs bg-amber-100 text-amber-800 font-bold border-none">RESERVADO</span>;
      case 'CONFIDENCIAL':
        return <span className="badge badge-xs bg-red-600 text-white font-bold border-none">CONFIDENCIAL</span>;
      default:
        return <span className="badge badge-xs">{conf}</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#016098]">Gestión de Plantillas y Formatos Tipo</h1>
          <p className="text-sm text-gray-500 mt-1">
            Administra los formatos tipo en Word (.docx) con control por departamento y clasificación SGSI
          </p>
        </div>
      </div>

      {/* Alerta de feedback */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-xs underline font-bold"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Sección de Carga de Plantilla y Guía */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de subida */}
        <div className="lg:col-span-2 card bg-white shadow-sm border border-[#e2e8f0]">
          <div className="card-body p-6">
            <h2 className="text-lg font-bold text-[#016098] flex items-center gap-2 mb-2">
              <Upload size={18} /> Subir Nuevo Formato Tipo (.docx)
            </h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Nombre descriptivo del documento:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Resolución Exenta de Compra Ágil, Bases de Licitación..."
                    className="input input-bordered input-sm w-full text-sm"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Departamento Institucional:
                  </label>
                  <select
                    className="select select-bordered select-sm w-full text-xs font-medium"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="TRANSVERSAL">TRANSVERSAL (Toda la CMDS)</option>
                    <option value="CASA_CENTRAL">CASA CENTRAL</option>
                    <option value="DAF">DAF / FINANZAS</option>
                    <option value="EDUCACION">DIRECCIÓN EDUCACIÓN</option>
                    <option value="SALUD">DIRECCIÓN SALUD</option>
                    <option value="JURIDICA">DIRECCIÓN JURÍDICA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Clasificación SGSI:
                  </label>
                  <select
                    className="select select-bordered select-sm w-full text-xs font-medium"
                    value={confidentiality}
                    onChange={(e) => setConfidentiality(e.target.value)}
                  >
                    <option value="PUBLICO">Público (Transparencia Activa)</option>
                    <option value="INTERNO">Interno (Uso CMDS)</option>
                    <option value="RESERVADO">Reservado (Jefaturas/Dirección)</option>
                    <option value="CONFIDENCIAL">Confidencial (Sensible / Restringido)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Archivo Microsoft Word (.docx):
                </label>
                <input
                  id="templateFileInput"
                  type="file"
                  accept=".docx"
                  className="file-input file-input-bordered file-input-sm w-full"
                  onChange={handleFileChange}
                  required
                />
                {file && (
                  <p className="text-xs text-gray-500 mt-1">
                    Archivo: <span className="font-semibold">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={!file || uploading}
                  className="btn btn-sm bg-[#39BABD] hover:bg-[#2c989b] text-white border-none gap-2"
                >
                  <Upload size={16} />
                  {uploading ? 'Analizando archivo...' : 'Subir y Registrar Plantilla'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Tarjeta de Guía Rápida SGSI */}
        <div className="card bg-blue-50/70 border border-blue-100 shadow-sm text-xs">
          <div className="card-body p-6">
            <h3 className="font-bold text-[#016098] flex items-center gap-1.5 text-sm mb-2">
              <Info size={16} /> Estándar SGSI de Plantillas
            </h3>
            <p className="text-gray-600 leading-relaxed mb-2">
              Inserta etiquetas estándar en Word para inyección automática:
            </p>
            <div className="bg-white p-2.5 rounded border border-blue-200 font-mono text-[11px] text-gray-700 space-y-1">
              <div>Folio: <span className="text-[#016098] font-bold">{'{folio}'}</span></div>
              <div>Fecha: <span className="text-[#016098] font-bold">{'{fecha_resolucion}'}</span></div>
              <div>Proveedor: <span className="text-[#016098] font-bold">{'{rut_proveedor}'}</span></div>
              <div>Monto: $<span className="text-[#016098] font-bold">{'{monto_total}'}</span></div>
            </div>

            <div className="mt-2 pt-2 border-t border-blue-200/60">
              <span className="font-bold text-[#016098] block mb-1">Cuadros Dinámicos (Tablas Word):</span>
              <p className="text-[11px] text-gray-600 mb-1.5">
                En la fila repetitiva de la tabla Word, coloca la etiqueta de apertura en la primera celda y la de cierre en la última:
              </p>
              <div className="bg-white p-2 rounded border border-blue-200 font-mono text-[10px] text-slate-800 leading-tight">
                | <span className="text-indigo-600 font-bold">{'{#items}'}</span>{'{n}'} | {'{descripcion}'} | {'{cantidad}'} | {'{total}'}<span className="text-indigo-600 font-bold">{'{/items}'}</span> |
              </div>
            </div>

            <p className="text-gray-500 mt-2 text-[11px]">
              Cada subida genera un evento inmutable en la <strong>Pista de Auditoría</strong> con tu RUT e IP.
            </p>
          </div>
        </div>
      </div>

      {/* Listado de Plantillas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#016098]">
            Formatos Tipo Disponibles ({templates.length})
          </h2>
          <span className="text-xs text-gray-500">
            Filtradas según tu departamento: <strong className="text-[#016098]">{currentUser?.department}</strong>
          </span>
        </div>

        {templates.length === 0 ? (
          <div className="card bg-white shadow-sm border border-[#e2e8f0] p-12 text-center text-gray-500">
            <FileText className="mx-auto text-gray-300 mb-3" size={42} />
            <h3 className="text-base font-semibold text-gray-700">No hay plantillas registradas para tu perfil</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Sube una plantilla o cambia a un usuario de administración para ver formatos transversales.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="card bg-white shadow-sm border border-[#e2e8f0] hover:border-[#016098]/40 transition-all flex flex-col justify-between"
              >
                <div className="card-body p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="card-title text-base font-bold text-[#016098] leading-snug">
                      {tpl.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="badge badge-xs bg-slate-100 text-slate-700 border-none font-semibold">
                      {tpl.department}
                    </span>
                    {getConfidentialityBadge(tpl.confidentiality)}
                    <span className="badge badge-xs bg-blue-50 text-[#016098] border-none font-medium">
                      {tpl.fields?.length || 0} variables
                    </span>
                  </div>

                  <p className="text-[10px] text-gray-400 mt-2">
                    Registrada el {new Date(tpl.createdAt).toLocaleDateString('es-CL')}
                  </p>

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Variables Detectadas:</p>
                    {tpl.fields?.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                        {tpl.fields.map((f: any) => {
                          const isTable = f.type === 'table';
                          let colCount = 0;
                          try {
                            if (f.description && f.description.startsWith('{')) {
                              const meta = JSON.parse(f.description);
                              if (meta.columns) colCount = meta.columns.length;
                            }
                          } catch (e) {}

                          return (
                            <span
                              key={f.id}
                              className={
                                isTable
                                  ? "badge badge-sm bg-indigo-50 text-indigo-800 border-indigo-200 font-mono font-bold text-[10px] gap-1"
                                  : "badge badge-sm bg-slate-100 text-slate-700 border-slate-200 font-mono text-[10px]"
                              }
                              title={isTable ? `Cuadro Dinámico con ${colCount} columnas` : f.name}
                            >
                              {isTable ? `[Tabla] ${f.name} (${colCount} col)` : `{${f.name}}`}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        Sin variables dinámicas
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-[#f8fafc] px-5 py-3 border-t border-[#e2e8f0] flex items-center justify-between gap-2 rounded-b-2xl">
                  {['SUPERADMIN', 'DIRECTOR'].includes(currentUser?.role || '') && (
                    <button
                      onClick={() => handleDelete(tpl.id, tpl.name)}
                      className="btn btn-ghost btn-xs text-red-500 hover:bg-red-50"
                      title="Eliminar plantilla"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    <a
                      href={`http://localhost:3001/api/templates/${tpl.id}/download`}
                      download
                      className="btn btn-ghost btn-xs text-gray-600 hover:text-[#016098]"
                      title="Descargar plantilla base"
                    >
                      <Download size={14} /> Base
                    </a>
                    <button
                      onClick={() => navigate(`/generar?templateId=${tpl.id}`)}
                      className="btn btn-xs bg-[#016098] hover:bg-[#014c78] text-white border-none gap-1"
                    >
                      <FilePlus size={13} /> Generar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
