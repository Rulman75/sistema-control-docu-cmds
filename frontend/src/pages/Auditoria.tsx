import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Search, Filter, Download, AlertTriangle, FileText, CheckCircle2, Lock, Calendar, Globe } from 'lucide-react';

export default function Auditoria() {
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [currentUser, actionFilter, deptFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (actionFilter) params.action = actionFilter;
      if (deptFilter) params.department = deptFilter;

      const res = await axios.get('http://localhost:3001/api/audit-logs', { params });
      setLogs(res.data);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      setError(err.response?.data?.error || 'Error al obtener la pista de auditoría');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'GENERATE_DOC':
        return <span className="badge badge-sm bg-blue-100 text-blue-800 font-bold border-none">EMISIÓN DOC</span>;
      case 'DOWNLOAD_DOC':
        return <span className="badge badge-sm bg-emerald-100 text-emerald-800 font-bold border-none">DESCARGA</span>;
      case 'DELETE_DOC':
        return <span className="badge badge-sm bg-rose-100 text-rose-800 font-bold border-none">ELIMINACIÓN</span>;
      case 'CREATE_TEMPLATE':
        return <span className="badge badge-sm bg-indigo-100 text-indigo-800 font-bold border-none">NUEVA PLANTILLA</span>;
      case 'DELETE_TEMPLATE':
        return <span className="badge badge-sm bg-purple-100 text-purple-800 font-bold border-none">BORRADO PLANTILLA</span>;
      case 'UNAUTHORIZED_AUDIT_ACCESS':
      case 'UNAUTHORIZED_DOWNLOAD_ATTEMPT':
        return <span className="badge badge-sm bg-red-600 text-white font-bold border-none animate-pulse">ALERTA SEGURIDAD</span>;
      default:
        return <span className="badge badge-sm bg-slate-100 text-slate-800 font-bold border-none">{action}</span>;
    }
  };

  const exportToCSV = () => {
    if (logs.length === 0) return;
    const headers = ['ID', 'Fecha', 'Hora', 'IP Origen', 'Usuario', 'RUT', 'Rol', 'Departamento', 'Accion', 'Detalles'];
    const rows = logs.map(l => [
      l.id,
      new Date(l.createdAt).toLocaleDateString('es-CL'),
      new Date(l.createdAt).toLocaleTimeString('es-CL'),
      l.ipAddress,
      `"${l.userName}"`,
      l.userRut,
      l.userRole,
      l.department,
      l.action,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Auditoria_CMDS_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isRestricted = !['SUPERADMIN', 'DIRECTOR', 'AUDITOR_CONTRALORIA'].includes(currentUser?.role || '');

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={26} className="text-[#016098]" />
            <h1 className="text-2xl font-bold text-[#016098]">Pista de Auditoría Institucional (SGSI)</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Registro inmutable de trazabilidad y eventos para Contraloría General y Seguridad de la Información
          </p>
        </div>

        {!isRestricted && (
          <button
            onClick={exportToCSV}
            className="btn btn-sm bg-[#016098] hover:bg-[#014c78] text-white border-none gap-2 shadow-sm self-start md:self-auto"
          >
            <Download size={15} /> Exportar para Contraloría (CSV)
          </button>
        )}
      </div>

      {/* Pantalla de Restricción si el rol actual no tiene acceso a auditoría */}
      {isRestricted ? (
        <div className="card bg-red-50 border border-red-200 p-8 text-center max-w-xl mx-auto shadow-sm">
          <Lock size={44} className="mx-auto text-red-500 mb-3" />
          <h2 className="text-lg font-bold text-red-800">Acceso Restringido por Política SGSI</h2>
          <p className="text-sm text-gray-600 mt-2">
            Tu perfil actual es <span className="font-bold text-red-700">{currentUser?.name}</span> con rol{' '}
            <span className="badge badge-sm bg-red-200 text-red-900 font-bold">{currentUser?.role}</span>.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Por normativa de seguridad, la pista de auditoría forense solo está disponible para la Dirección Ejecutiva,
            el Auditor de Contraloría y el Administrador de Seguridad.
          </p>
          <div className="mt-4 p-3 bg-white rounded border border-red-200 text-xs text-gray-600">
            💡 <em>Para revisar este módulo, cambia tu usuario activo a "Lorena Valenzuela (Auditora Contraloría)" o "Rodrigo Hormazábal (SuperAdmin)" en la barra lateral.</em>
          </div>
        </div>
      ) : (
        <>
          {/* Métricas de Auditoría */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-400 uppercase">Eventos Totales</span>
              <p className="text-2xl font-bold text-[#016098] mt-1">{logs.length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-400 uppercase">Emisiones de Documentos</span>
              <p className="text-2xl font-bold text-blue-700 mt-1">
                {logs.filter(l => l.action === 'GENERATE_DOC').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-400 uppercase">Descargas Fiscalizadas</span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {logs.filter(l => l.action === 'DOWNLOAD_DOC').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-400 uppercase">Alertas de Seguridad</span>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {logs.filter(l => l.action.startsWith('UNAUTHORIZED')).length}
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="card bg-white shadow-sm border border-[#e2e8f0]">
            <div className="card-body p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <select
                  className="select select-bordered select-sm text-xs font-medium"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                >
                  <option value="">Todas las Acciones</option>
                  <option value="GENERATE_DOC">Emisiones (GENERATE_DOC)</option>
                  <option value="DOWNLOAD_DOC">Descargas (DOWNLOAD_DOC)</option>
                  <option value="DELETE_DOC">Eliminaciones (DELETE_DOC)</option>
                  <option value="CREATE_TEMPLATE">Nuevas Plantillas</option>
                  <option value="UNAUTHORIZED_AUDIT_ACCESS">Alertas de Seguridad</option>
                </select>

                <select
                  className="select select-bordered select-sm text-xs font-medium"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                >
                  <option value="">Todos los Departamentos</option>
                  <option value="CASA_CENTRAL">Casa Central</option>
                  <option value="DAF">DAF / Finanzas</option>
                  <option value="EDUCACION">Educación</option>
                  <option value="SALUD">Salud</option>
                </select>
              </div>

              {(actionFilter || deptFilter) && (
                <button
                  onClick={() => { setActionFilter(''); setDeptFilter(''); }}
                  className="btn btn-ghost btn-xs text-gray-400"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {/* Tabla de Pista de Auditoría */}
          <div className="card bg-white shadow-sm border border-[#e2e8f0]">
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-12 text-gray-400">Cargando eventos de auditoría...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShieldCheck className="mx-auto text-gray-300 mb-2" size={40} />
                  <p className="text-sm font-semibold">No hay registros con los filtros seleccionados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px]">
                        <th>ID Evento</th>
                        <th>Fecha / Hora</th>
                        <th>IP Origen</th>
                        <th>Usuario / RUT</th>
                        <th>Rol / Depto</th>
                        <th>Acción</th>
                        <th>Detalle Forense</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {logs.map((log) => {
                        let parsedDetails: any = {};
                        try {
                          parsedDetails = JSON.parse(log.details || '{}');
                        } catch {
                          parsedDetails = { raw: log.details };
                        }

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="font-mono text-gray-400 font-bold">#{log.id}</td>
                            <td>
                              <div className="font-medium text-gray-800">
                                {new Date(log.createdAt).toLocaleDateString('es-CL')}
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono">
                                {new Date(log.createdAt).toLocaleTimeString('es-CL')}
                              </div>
                            </td>
                            <td>
                              <span className="font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                                {log.ipAddress}
                              </span>
                            </td>
                            <td>
                              <div className="font-bold text-gray-800">{log.userName}</div>
                              <div className="text-[10px] text-gray-500 font-mono">{log.userRut}</div>
                            </td>
                            <td>
                              <div className="font-semibold text-gray-700">{log.userRole}</div>
                              <div className="text-[10px] text-blue-600 font-medium">{log.department}</div>
                            </td>
                            <td>{getActionBadge(log.action)}</td>
                            <td>
                              <div className="max-w-xs truncate text-[11px] font-mono text-gray-600" title={log.details}>
                                {parsedDetails.folio ? (
                                  <span className="font-bold text-[#016098] mr-1">Folio: {parsedDetails.folio}</span>
                                ) : null}
                                {parsedDetails.templateName ? (
                                  <span>{parsedDetails.templateName} </span>
                                ) : null}
                                {parsedDetails.reason ? (
                                  <span className="text-red-600 font-bold">{parsedDetails.reason}</span>
                                ) : null}
                                {!parsedDetails.folio && !parsedDetails.templateName && !parsedDetails.reason ? (
                                  <span>{log.details}</span>
                                ) : null}
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
        </>
      )}
    </div>
  );
}
