import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  FilePlus,
  History,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  Archive,
  FileEdit
} from 'lucide-react';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    totalTemplates: 0,
    totalDocuments: 0,
    totalAudits: 0,
    draftsCount: 0,
    inReviewCount: 0,
    emittedCount: 0,
    archivedCount: 0
  });
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const isApprover = ['SUPERADMIN', 'DIRECTOR', 'JEFE_DEPTO'].includes(currentUser?.role || '');

      const [statsRes, docsRes, appRes] = await Promise.all([
        axios.get('http://localhost:3001/api/stats'),
        axios.get('http://localhost:3001/api/documents'),
        isApprover ? axios.get('http://localhost:3001/api/approvals/pending') : Promise.resolve({ data: [] })
      ]);
      setStats(statsRes.data);
      setRecentDocs(docsRes.data.slice(0, 5));
      setPendingApprovalsCount(appRes.data.length);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BORRADOR':
        return <span className="badge badge-xs bg-slate-100 text-slate-700 font-bold border-none">BORRADOR</span>;
      case 'EN_REVISION':
        return <span className="badge badge-xs bg-amber-100 text-amber-800 font-bold border-none">EN REVISIÓN</span>;
      case 'EMITIDO':
        return <span className="badge badge-xs bg-emerald-100 text-emerald-800 font-bold border-none">EMITIDO</span>;
      case 'ARCHIVADO':
        return <span className="badge badge-xs bg-purple-100 text-purple-800 font-bold border-none">ARCHIVADO</span>;
      default:
        return <span className="badge badge-xs">{status}</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#016098]">Sistema de Control Documental & SGSI</h1>
            <span className="badge badge-sm bg-blue-100 text-[#016098] font-bold border-none">
              ISO 27001 / Contraloría
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Corporación Municipal de Desarrollo Social de Antofagasta &bull; Alcance:{' '}
            <strong className="text-gray-700">{currentUser?.department}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/generar"
            className="btn btn-sm bg-[#016098] hover:bg-[#014c78] text-white border-none shadow-sm gap-2"
          >
            <FilePlus size={16} /> Emitir Documento
          </Link>
          <Link
            to="/plantillas"
            className="btn btn-sm bg-[#39BABD] hover:bg-[#2c989b] text-white border-none shadow-sm gap-2"
          >
            <FileText size={16} /> Formatos Tipo
          </Link>
        </div>
      </div>

      {/* Alerta de Visaciones Pendientes para el Rol */}
      {pendingApprovalsCount > 0 && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-sm">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                Tienes {pendingApprovalsCount} {pendingApprovalsCount === 1 ? 'documento pendiente' : 'documentos pendientes'} de visación y firma digital
              </h3>
              <p className="text-xs text-amber-800">
                Como <strong>{currentUser?.role}</strong> ({currentUser?.department}), requieres revisar y visar expedientes para continuar el flujo institucional.
              </p>
            </div>
          </div>
          <Link
            to="/aprobaciones"
            className="btn btn-sm bg-amber-600 hover:bg-amber-700 text-white border-none gap-2 shrink-0 font-bold shadow-sm"
          >
            Ir a Bandeja de Visaciones <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Tarjetas Principales de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-white shadow-sm border border-[#e2e8f0]">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-400 uppercase">Formatos Tipo</span>
              <div className="p-2 bg-blue-50 text-[#016098] rounded-lg">
                <FileText size={16} />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-[#016098] mt-1">
              {loading ? '...' : stats.totalTemplates}
            </p>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <Link to="/plantillas" className="text-[11px] font-medium text-[#016098] hover:underline flex items-center gap-1">
                Ver plantillas <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        </div>

        <div className="card bg-white shadow-sm border border-[#e2e8f0]">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-400 uppercase">Emitidos Oficiales</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">
              {loading ? '...' : stats.emittedCount}
            </p>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <Link to="/historial" className="text-[11px] font-medium text-emerald-600 hover:underline flex items-center gap-1">
                Ver historial foliado <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        </div>

        <div className="card bg-white shadow-sm border border-[#e2e8f0]">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-400 uppercase">Borradores & Revisión</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Clock size={16} />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-amber-700 mt-1">
              {loading ? '...' : (stats.draftsCount || 0) + (stats.inReviewCount || 0)}
            </p>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <Link to="/historial" className="text-[11px] font-medium text-amber-600 hover:underline flex items-center gap-1">
                {stats.draftsCount || 0} borradores &bull; {stats.inReviewCount || 0} en revisión
              </Link>
            </div>
          </div>
        </div>

        <div className="card bg-white shadow-sm border border-[#e2e8f0]">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-400 uppercase">Auditoría SGSI</span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <ShieldCheck size={16} />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-purple-700 mt-1">
              {loading ? '...' : stats.totalAudits}
            </p>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <Link to="/auditoria" className="text-[11px] font-medium text-purple-600 hover:underline flex items-center gap-1">
                Pista forense inalterable <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Banner de Ciclo de Vida y Versionamiento */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#016098] text-white rounded-xl shadow-sm">
            <Layers size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#016098]">Control de Versiones y Políticas de Retención Legal</h3>
            <p className="text-xs text-gray-600">
              Crea nuevas versiones (<code className="text-[#016098] font-bold">v1.1</code>, <code className="text-[#016098] font-bold">v1.2</code>) sin sobrescribir documentos anteriores. Archiva expedientes según plazo legal (5 años).
            </p>
          </div>
        </div>
        <Link to="/historial" className="btn btn-xs bg-[#016098] text-white border-none shrink-0 font-bold">
          Explorar Versiones
        </Link>
      </div>

      {/* Tabla de Documentos Recientes con Estados y Versiones */}
      <div className="card bg-white shadow-sm border border-[#e2e8f0]">
        <div className="card-body p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#016098] flex items-center gap-2">
                <History size={18} /> Últimos Documentos en el Ciclo de Vida
              </h2>
              <p className="text-xs text-gray-400">Documentos foliados, versionados y auditados</p>
            </div>
            {recentDocs.length > 0 && (
              <Link to="/historial" className="text-xs font-semibold text-[#016098] hover:underline">
                Ver todos ({stats.totalDocuments})
              </Link>
            )}
          </div>

          {recentDocs.length === 0 ? (
            <div className="text-center py-10 bg-[#f8fafc] rounded-lg border border-dashed border-gray-200">
              <FileText className="mx-auto text-gray-300 mb-2" size={36} />
              <p className="text-sm font-medium text-gray-600">Aún no se han emitido documentos para tu departamento</p>
              <div className="mt-4 flex justify-center gap-3">
                <Link to="/plantillas" className="btn btn-xs bg-[#39BABD] text-white border-none">
                  Ver Plantillas
                </Link>
                <Link to="/generar" className="btn btn-xs bg-[#016098] text-white border-none">
                  Emitir Documento
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase text-[10px]">
                    <th>Folio & Versión</th>
                    <th>Estado</th>
                    <th>Formato Tipo</th>
                    <th>Departamento</th>
                    <th>Emisor</th>
                    <th>Fecha</th>
                    <th className="text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#016098]">
                            {doc.folio || `#${doc.id}`}
                          </span>
                          <span className="badge badge-xs bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 font-mono">
                            v{doc.version || '1.0'}
                          </span>
                        </div>
                      </td>
                      <td>{getStatusBadge(doc.status)}</td>
                      <td className="font-semibold text-gray-800">
                        {doc.template?.name || 'Plantilla'}
                      </td>
                      <td>
                        <span className="badge badge-xs bg-slate-100 text-slate-700 border-none font-semibold">
                          {doc.department}
                        </span>
                      </td>
                      <td className="text-gray-600">{doc.createdBy || 'Funcionario'}</td>
                      <td className="text-gray-500">
                        {new Date(doc.createdAt).toLocaleDateString('es-CL')}
                      </td>
                      <td className="text-right">
                        <Link
                          to="/historial"
                          className="btn btn-xs bg-blue-50 text-[#016098] hover:bg-blue-100 border-none gap-1"
                        >
                          Ver Detalle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
