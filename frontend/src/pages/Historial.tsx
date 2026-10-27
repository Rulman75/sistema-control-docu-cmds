import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  History,
  Download,
  Trash2,
  Search,
  FileText,
  Calendar,
  User,
  Eye,
  X,
  GitBranch,
  Archive,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  FileEdit,
  AlertCircle,
  QrCode
} from 'lucide-react';

export default function Historial() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [statusTab, setStatusTab] = useState('TODOS');
  const [search, setSearch] = useState('');
  const [searchDept, setSearchDept] = useState('TODOS');
  const [searchConfidentiality, setSearchConfidentiality] = useState('TODAS');
  const [loading, setLoading] = useState(true);

  // Modales
  const [selectedDocDetails, setSelectedDocDetails] = useState<any | null>(null);
  const [versionsModalDoc, setVersionsModalDoc] = useState<any | null>(null);
  const [versionsList, setVersionsList] = useState<any[]>([]);
  const [statusChangeDoc, setStatusChangeDoc] = useState<any | null>(null);
  const [newStatusValue, setNewStatusValue] = useState('EN_REVISION');
  const [statusReason, setStatusReason] = useState('');
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // QR Modal
  const [qrModalDoc, setQrModalDoc] = useState<any | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [currentUser, statusTab, searchDept, searchConfidentiality, search]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusTab !== 'TODOS') {
        params.status = statusTab;
      }
      if (statusTab === 'ARCHIVADO') {
        params.includeArchived = 'true';
      }
      if (searchDept !== 'TODOS') {
        params.department = searchDept;
      }
      if (searchConfidentiality !== 'TODAS') {
        params.confidentiality = searchConfidentiality;
      }
      if (search.trim()) {
        params.q = search.trim();
      }

      const res = await axios.get('http://localhost:3001/api/documents', { params });
      setDocuments(res.data);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (docId: number, fileName: string) => {
    setDownloadError(null);
    try {
      const response = await axios.get(`http://localhost:3001/api/documents/${docId}/download`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Download error:', err);
      if (err.response?.status === 403) {
        setDownloadError('Acceso Denegado por SGSI: Documento confidencial fuera de tu departamento.');
      } else {
        setDownloadError('Error al procesar la descarga del documento.');
      }
    }
  };

  const handleOpenQrModal = async (doc: any) => {
    setQrModalDoc(doc);
    setQrDataUrl(null);
    try {
      const res = await axios.get(`http://localhost:3001/api/documents/${doc.id}/qr`);
      setQrDataUrl(res.data.qrDataUrl);
    } catch (err) {
      console.error('Error fetching QR:', err);
    }
  };

  const handleOpenVersionsModal = async (doc: any) => {
    setVersionsModalDoc(doc);
    try {
      const res = await axios.get(`http://localhost:3001/api/documents/${doc.id}/versions`);
      setVersionsList(res.data.versions);
    } catch (err) {
      console.error('Error fetching versions:', err);
    }
  };

  const handleArchive = async (id: number, folio: string) => {
    if (!window.confirm(`¿Confirmas el archivado del documento ${folio} bajo política de retención legal?`)) {
      return;
    }
    try {
      await axios.post(`http://localhost:3001/api/documents/${id}/archive`);
      fetchDocuments();
    } catch (err) {
      console.error(err);
      alert('Error al archivar el documento');
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusChangeDoc) return;
    try {
      await axios.put(`http://localhost:3001/api/documents/${statusChangeDoc.id}/status`, {
        status: newStatusValue,
        reason: statusReason
      });
      setStatusChangeDoc(null);
      setStatusReason('');
      fetchDocuments();
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el estado del documento');
    }
  };

  const handleDelete = async (id: number) => {
    if (!['SUPERADMIN', 'DIRECTOR'].includes(currentUser?.role || '')) {
      alert('Permiso denegado: Solo la Dirección o SuperAdmin pueden eliminar documentos oficiales.');
      return;
    }

    if (!window.confirm('¿Deseas eliminar este registro del historial? El evento quedará registrado en la pista de auditoría.')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3001/api/documents/${id}`);
      fetchDocuments();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Error al eliminar el documento');
    }
  };

  const getSearchSnippet = (content?: string, term?: string) => {
    if (!content || !term || term.trim().length < 2) return null;
    const lowerContent = content.toLowerCase();
    const lowerTerm = term.toLowerCase();
    const idx = lowerContent.indexOf(lowerTerm);
    if (idx === -1) return null;

    const start = Math.max(0, idx - 35);
    const end = Math.min(content.length, idx + term.length + 45);
    const before = content.slice(start, idx);
    const match = content.slice(idx, idx + term.length);
    const after = content.slice(idx + term.length, end);

    return (
      <div className="mt-2 p-1.5 bg-amber-50/90 border border-amber-200 rounded text-[11px] text-gray-700">
        <span className="font-semibold text-amber-800 text-[10px] uppercase block tracking-wider mb-0.5">
          Coincidencia Full-Text en el cuerpo:
        </span>
        <span className="font-mono text-gray-600 text-[10px] break-words">
          {start > 0 ? '...' : ''}
          {before}
          <mark className="bg-amber-300 text-amber-950 font-bold px-1 rounded">{match}</mark>
          {after}
          {end < content.length ? '...' : ''}
        </span>
      </div>
    );
  };

  const filteredDocs = documents;

  const parseDocData = (dataStr: string) => {
    try {
      return JSON.parse(dataStr);
    } catch {
      return {};
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BORRADOR':
        return <span className="badge badge-xs bg-slate-100 text-slate-700 font-bold border-none">BORRADOR</span>;
      case 'EN_REVISION':
        return <span className="badge badge-xs bg-amber-100 text-amber-800 font-bold border-none">EN REVISIÓN</span>;
      case 'APROBADO':
        return <span className="badge badge-xs bg-blue-100 text-blue-800 font-bold border-none">APROBADO</span>;
      case 'EMITIDO':
        return <span className="badge badge-xs bg-emerald-100 text-emerald-800 font-bold border-none">EMITIDO</span>;
      case 'ARCHIVADO':
        return <span className="badge badge-xs bg-purple-100 text-purple-800 font-bold border-none">ARCHIVADO</span>;
      default:
        return <span className="badge badge-xs">{status}</span>;
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
          <h1 className="text-2xl font-bold text-[#016098] flex items-center gap-2">
            <History size={24} /> Historial & Ciclo de Vida Documental
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de estados, control de versiones, folios y trazabilidad legal de retención
          </p>
        </div>

        <Link
          to="/generar"
          className="btn btn-sm bg-[#016098] hover:bg-[#014c78] text-white border-none gap-2 shadow-sm self-start md:self-auto"
        >
          + Generar Nuevo Documento
        </Link>
      </div>

      {/* Alerta de Error de Descarga */}
      {downloadError && (
        <div className="p-4 rounded-lg bg-red-50 text-red-800 border border-red-200 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{downloadError}</span>
          </div>
          <button onClick={() => setDownloadError(null)} className="text-xs font-bold underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Pestañas de Estados del Ciclo de Vida */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-2">
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: 'TODOS', label: 'Todos los Documentos' },
            { id: 'EMITIDO', label: 'Emitidos Oficiales' },
            { id: 'BORRADOR', label: 'Borradores' },
            { id: 'EN_REVISION', label: 'En Revisión' },
            { id: 'ARCHIVADO', label: 'Archivados (Retención)' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                statusTab === tab.id
                  ? 'bg-[#016098] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Total en vista: <strong className="text-[#016098]">{filteredDocs.length}</strong></span>
        </div>
      </div>

      {/* Barra de Búsqueda Full-Text y Filtros Avanzados */}
      <div className="card bg-white shadow-sm border border-[#e2e8f0]">
        <div className="card-body p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search size={18} className="text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Búsqueda Full-Text: Folio, Ley 19.886, licitación, proveedor o cualquier palabra del documento..."
                className="input input-sm input-bordered w-full pl-9 text-xs focus:border-[#016098]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="btn btn-ghost btn-xs text-gray-400 absolute right-2 top-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filtro por Departamento */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                className="select select-bordered select-sm text-xs w-full md:w-44"
                value={searchDept}
                onChange={(e) => setSearchDept(e.target.value)}
              >
                <option value="TODOS">Todos los Deptos</option>
                <option value="CASA_CENTRAL">Casa Central</option>
                <option value="DAF">DAF (Finanzas)</option>
                <option value="EDUCACION">Educación</option>
                <option value="SALUD">Salud</option>
                <option value="JURIDICA">Jurídica</option>
              </select>

              {/* Filtro por Confidencialidad */}
              <select
                className="select select-bordered select-sm text-xs w-full md:w-40"
                value={searchConfidentiality}
                onChange={(e) => setSearchConfidentiality(e.target.value)}
              >
                <option value="TODAS">Toda Confidencialidad</option>
                <option value="PUBLICO">Público</option>
                <option value="INTERNO">Interno</option>
                <option value="RESERVADO">Reservado</option>
                <option value="CONFIDENCIAL">Confidencial</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-100">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              Motor Full-Text Activo: indexa contenido íntegro de resoluciones, memorándums y bases de licitación
            </span>
            {(search || searchDept !== 'TODOS' || searchConfidentiality !== 'TODAS') && (
              <button
                onClick={() => {
                  setSearch('');
                  setSearchDept('TODOS');
                  setSearchConfidentiality('TODAS');
                }}
                className="text-blue-600 hover:underline font-semibold"
              >
                Restablecer Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de Documentos */}
      <div className="card bg-white shadow-sm border border-[#e2e8f0]">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Cargando ciclo de vida documental...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="mx-auto text-gray-300 mb-2" size={38} />
              <p className="text-sm font-semibold">No se encontraron documentos</p>
              <p className="text-xs text-gray-400 mt-1">
                {search ? 'Sin coincidencias para la búsqueda.' : 'No hay documentos en este estado para tu departamento.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px]">
                    <th>Folio & Versión</th>
                    <th>Estado Ciclo de Vida</th>
                    <th>Plantilla / Clasificación</th>
                    <th>Emisor / Departamento</th>
                    <th>Fecha</th>
                    <th>Variables</th>
                    <th className="text-right">Acciones de Versión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDocs.map((doc) => {
                    const parsed = parseDocData(doc.data);
                    const varCount = Object.keys(parsed).length;
                    const hasVersions = doc.childVersions && doc.childVersions.length > 0;

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                        <td>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-[#016098] bg-blue-50 px-2 py-0.5 rounded text-xs border border-blue-200">
                              {doc.folio || `#${doc.id}`}
                            </span>
                            <span className="badge badge-xs bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 font-mono">
                              v{doc.version || '1.0'}
                            </span>
                          </div>
                          {doc.cuv && (
                            <div className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded mt-1 border border-emerald-200 inline-flex items-center gap-1">
                              <QrCode size={10} /> CUV: {doc.cuv}
                            </div>
                          )}
                          {doc.changeLog && (
                            <span className="text-[10px] text-gray-400 italic block mt-0.5 truncate max-w-xs">
                              {doc.changeLog}
                            </span>
                          )}
                          {getSearchSnippet(doc.fullTextContent, search)}
                        </td>
                        <td>
                          <div className="flex flex-col gap-1 items-start">
                            {getStatusBadge(doc.status)}
                            <button
                              onClick={() => {
                                setStatusChangeDoc(doc);
                                setNewStatusValue(doc.status);
                              }}
                              className="text-[10px] text-blue-600 hover:underline font-medium"
                            >
                              Cambiar estado
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="font-bold text-gray-800 text-xs">
                            {doc.template?.name || 'Plantilla'}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {getConfidentialityBadge(doc.confidentiality)}
                            <span className="text-[10px] text-gray-400">{doc.department}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5 font-medium text-gray-700">
                            <User size={13} className="text-[#016098]" />
                            {doc.createdBy || 'Funcionario'}
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono">{doc.userRut}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Calendar size={13} className="text-gray-400" />
                            {new Date(doc.createdAt).toLocaleDateString('es-CL')}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {new Date(doc.createdAt).toLocaleTimeString('es-CL')}
                          </div>
                        </td>
                        <td>
                          <button
                            onClick={() => setSelectedDocDetails({ ...doc, parsed })}
                            className="badge badge-sm bg-blue-50 text-[#016098] hover:bg-blue-100 border-blue-200 font-medium cursor-pointer gap-1"
                          >
                            <Eye size={11} /> {varCount} datos
                          </button>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Ver QR & CUV Ley 19.799 */}
                            {doc.cuv && (
                              <button
                                onClick={() => handleOpenQrModal(doc)}
                                className="btn btn-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 gap-1 font-bold"
                                title="Ver Código QR Oficial y CUV (Ley 19.799)"
                              >
                                <QrCode size={12} /> QR
                              </button>
                            )}

                            {/* Botón para crear nueva versión */}
                            <button
                              onClick={() => navigate(`/generar?fromDocumentId=${doc.id}`)}
                              className="btn btn-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 gap-1 font-bold"
                              title="Generar nueva versión incrementada (v1.1)"
                            >
                              <GitBranch size={12} /> Nueva Versión
                            </button>

                            {/* Botón ver árbol de versiones */}
                            <button
                              onClick={() => handleOpenVersionsModal(doc)}
                              className="btn btn-xs btn-ghost text-[#016098]"
                              title="Ver historial de versiones"
                            >
                              <Layers size={13} />
                            </button>

                            {/* Descargar archivo */}
                            <button
                              onClick={() => handleDownload(doc.id, doc.generatedFilePath)}
                              className="btn btn-xs bg-[#016098] hover:bg-[#014c78] text-white border-none gap-1"
                              title="Descargar documento (Auditado)"
                            >
                              <Download size={13} />
                            </button>

                            {/* Archivar */}
                            {!doc.isArchived && (
                              <button
                                onClick={() => handleArchive(doc.id, doc.folio)}
                                className="btn btn-ghost btn-xs text-purple-600 hover:bg-purple-50"
                                title="Archivar según plazo legal"
                              >
                                <Archive size={13} />
                              </button>
                            )}

                            {/* Eliminar (Solo Admin) */}
                            {['SUPERADMIN', 'DIRECTOR'].includes(currentUser?.role || '') && (
                              <button
                                onClick={() => handleDelete(doc.id)}
                                className="btn btn-ghost btn-xs text-red-500 hover:bg-red-50"
                                title="Eliminar (Auditado)"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Historial y Comparador de Versiones */}
      {versionsModalDoc && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200">
            <div className="px-6 py-4 bg-[#016098] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <GitBranch size={18} /> Árbol de Versiones del Documento
                </h3>
                <p className="text-xs text-blue-200 font-mono mt-0.5">
                  Familia de Folio: {versionsModalDoc.folio}
                </p>
              </div>
              <button
                onClick={() => setVersionsModalDoc(null)}
                className="btn btn-ghost btn-xs text-white hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto space-y-4">
              <p className="text-xs text-gray-500">
                Línea de tiempo de cambios. Cada versión preserva su archivo original e inalterable en el repositorio.
              </p>

              <div className="relative pl-6 border-l-2 border-indigo-200 space-y-4">
                {versionsList.map((ver, idx) => (
                  <div key={ver.id} className="relative bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="absolute -left-[31px] top-4 w-4 h-4 bg-indigo-600 rounded-full border-2 border-white" />
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="badge badge-sm bg-indigo-600 text-white font-mono font-bold">
                          v{ver.version}
                        </span>
                        <span className="font-mono font-bold text-gray-800 text-xs">
                          {ver.folio}
                        </span>
                        {getStatusBadge(ver.status)}
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {new Date(ver.createdAt).toLocaleString('es-CL')}
                      </span>
                    </div>

                    <p className="text-xs text-gray-700 mt-2 font-medium">
                      {ver.changeLog || 'Versión inicial'}
                    </p>

                    <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-gray-500">Por: {ver.createdBy}</span>
                      <button
                        onClick={() => handleDownload(ver.id, ver.generatedFilePath)}
                        className="btn btn-xs bg-[#016098] text-white border-none gap-1"
                      >
                        <Download size={12} /> Descargar v{ver.version}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setVersionsModalDoc(null)}
                className="btn btn-xs btn-ghost text-gray-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cambiar Estado del Ciclo de Vida */}
      {statusChangeDoc && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
            <div className="px-6 py-4 bg-[#016098] text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Transición de Estado Documental</h3>
              <button onClick={() => setStatusChangeDoc(null)} className="btn btn-ghost btn-xs text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs text-gray-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                Documento: <strong className="text-gray-800">{statusChangeDoc.folio}</strong> (Estado actual:{' '}
                <span className="font-bold text-[#016098]">{statusChangeDoc.status}</span>)
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nuevo Estado del Ciclo de Vida:
                </label>
                <select
                  className="select select-bordered select-sm w-full text-xs font-medium"
                  value={newStatusValue}
                  onChange={(e) => setNewStatusValue(e.target.value)}
                >
                  <option value="BORRADOR">BORRADOR (En edición)</option>
                  <option value="EN_REVISION">EN REVISIÓN (Pendiente visación jefatura)</option>
                  <option value="APROBADO">APROBADO (Visado formal)</option>
                  <option value="EMITIDO">EMITIDO (Foliado y vigente)</option>
                  <option value="ARCHIVADO">ARCHIVADO (Retención histórica)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Motivo o justificación de la transición (Auditado):
                </label>
                <textarea
                  rows={2}
                  className="textarea textarea-bordered textarea-sm w-full text-xs"
                  placeholder="Ej: Documento revisado y visado por Jefatura DAF..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <button onClick={() => setStatusChangeDoc(null)} className="btn btn-xs btn-ghost text-gray-600">
                Cancelar
              </button>
              <button
                onClick={handleUpdateStatus}
                className="btn btn-xs bg-[#016098] hover:bg-[#014c78] text-white border-none shadow-sm"
              >
                Confirmar Cambio de Estado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver datos guardados del documento */}
      {selectedDocDetails && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
            <div className="px-6 py-4 bg-[#016098] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Metadatos y Variables Guardadas</h3>
                <p className="text-xs text-blue-200 font-mono mt-0.5">
                  Folio: {selectedDocDetails.folio} (v{selectedDocDetails.version})
                </p>
              </div>
              <button
                onClick={() => setSelectedDocDetails(null)}
                className="btn btn-ghost btn-xs text-white hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto space-y-3">
              <div className="text-xs text-gray-500 bg-slate-50 p-2.5 rounded border border-slate-200 flex justify-between items-center">
                <div>
                  Emisor: <strong className="text-gray-800">{selectedDocDetails.createdBy}</strong>
                </div>
                <div>{getConfidentialityBadge(selectedDocDetails.confidentiality)}</div>
              </div>

              {selectedDocDetails.changeLog && (
                <div className="p-2 bg-indigo-50 border border-indigo-100 rounded text-xs text-indigo-900">
                  <strong>Nota de versión:</strong> {selectedDocDetails.changeLog}
                </div>
              )}

              <div className="space-y-2">
                {Object.entries(selectedDocDetails.parsed).map(([key, val]: [string, any]) => (
                  <div
                    key={key}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex flex-col gap-0.5"
                  >
                    <span className="font-mono font-semibold text-[#016098]">{`{${key}}`}</span>
                    <span className="text-gray-800 break-words font-medium">
                      {val ? String(val) : <em className="text-gray-400">(vacío)</em>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <button
                onClick={() => {
                  handleDownload(selectedDocDetails.id, selectedDocDetails.generatedFilePath);
                  setSelectedDocDetails(null);
                }}
                className="btn btn-xs bg-[#016098] text-white border-none gap-1"
              >
                <Download size={13} /> Descargar .docx
              </button>
              <button
                onClick={() => setSelectedDocDetails(null)}
                className="btn btn-xs btn-ghost text-gray-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal para Visualizar Código QR y CUV Institucional */}
      {qrModalDoc && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
            <div className="px-6 py-4 bg-[#016098] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <QrCode size={18} /> Código QR de Verificación Oficial
                </h3>
                <p className="text-xs text-blue-200 font-mono mt-0.5">
                  Ley N° 19.799 &bull; Firma y Documentos Electrónicos
                </p>
              </div>
              <button
                onClick={() => setQrModalDoc(null)}
                className="btn btn-ghost btn-xs text-white hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 text-center space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 inline-block mx-auto shadow-inner">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Código QR de Validación"
                    className="w-48 h-48 mx-auto rounded-lg shadow-sm"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-gray-400">
                    Cargando QR institucional...
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-left bg-blue-50/50 p-3.5 rounded-lg border border-blue-100 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Folio:</span>
                  <span className="font-mono font-bold text-[#016098]">{qrModalDoc.folio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Código Único (CUV):</span>
                  <span className="font-mono font-bold text-emerald-700">{qrModalDoc.cuv}</span>
                </div>
                {qrModalDoc.sha256Hash && (
                  <div className="pt-1 border-t border-blue-100">
                    <span className="text-gray-500 font-medium block mb-0.5">Hash SHA-256 (Integridad):</span>
                    <span className="font-mono text-[10px] text-gray-600 break-all select-all block bg-white p-1 rounded border border-blue-100">
                      {qrModalDoc.sha256Hash}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-gray-500 text-center">
                Escanear este código redirige al Portal Oficial de Validación de la CMDS para certificar la vigencia y visaciones del documento.
              </p>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <Link
                to={`/validar?cuv=${encodeURIComponent(qrModalDoc.cuv || qrModalDoc.folio || '')}`}
                target="_blank"
                className="btn btn-xs bg-emerald-600 hover:bg-emerald-700 text-white border-none gap-1"
              >
                Abrir Portal de Validación <ArrowRight size={12} />
              </Link>
              <button
                onClick={() => setQrModalDoc(null)}
                className="btn btn-xs btn-ghost text-gray-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
