import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, XCircle, Clock, FileText, User, Building2, Download, AlertCircle, Eye, X, ShieldCheck } from 'lucide-react';

export default function Aprobaciones() {
  const { currentUser } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [approveModal, setApproveModal] = useState<any | null>(null);
  const [rejectModal, setRejectModal] = useState<any | null>(null);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchPendingApprovals();
  }, [currentUser]);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:3001/api/approvals/pending');
      setPendingApprovals(res.data);
    } catch (err) {
      console.error('Error fetching pending approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approveModal) return;
    setProcessing(true);
    try {
      const res = await axios.post(`http://localhost:3001/api/approvals/${approveModal.id}/approve`, {
        comment
      });
      setFeedback({ text: res.data.message, type: 'success' });
      setApproveModal(null);
      setComment('');
      fetchPendingApprovals();
    } catch (err: any) {
      setFeedback({ text: err.response?.data?.error || 'Error al aprobar', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    if (!comment) {
      alert('Debes ingresar las observaciones del rechazo');
      return;
    }
    setProcessing(true);
    try {
      const res = await axios.post(`http://localhost:3001/api/approvals/${rejectModal.id}/reject`, {
        comment
      });
      setFeedback({ text: res.data.message, type: 'success' });
      setRejectModal(null);
      setComment('');
      fetchPendingApprovals();
    } catch (err: any) {
      setFeedback({ text: err.response?.data?.error || 'Error al rechazar', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const canApprove = ['SUPERADMIN', 'DIRECTOR', 'JEFE_DEPTO'].includes(currentUser?.role || '');

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={26} className="text-[#016098]" />
            <h1 className="text-2xl font-bold text-[#016098]">Bandeja de Visaciones y Firmas Digitales</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Flujo de aprobación secuencial institucional para expedientes oficiales de la CMDS
          </p>
        </div>

        <div className="badge badge-lg bg-blue-50 text-[#016098] font-bold border border-blue-200">
          {pendingApprovals.length} pendientes para tu rol ({currentUser?.role})
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Si el rol actual no tiene atribución de visación */}
      {!canApprove ? (
        <div className="card bg-amber-50 border border-amber-200 p-8 text-center max-w-xl mx-auto shadow-sm">
          <Clock size={40} className="mx-auto text-amber-500 mb-3" />
          <h2 className="text-base font-bold text-amber-800">Sin Atribución de Visación</h2>
          <p className="text-xs text-gray-600 mt-1">
            Tu perfil actual es <span className="font-bold">{currentUser?.name}</span> ({currentUser?.role}). Los funcionarios generales pueden emitir borradores, pero las visaciones están reservadas a Jefaturas de Departamento y a la Dirección Ejecutiva.
          </p>
          <div className="mt-4 p-3 bg-white rounded border border-amber-200 text-xs text-gray-600">
            💡 <em>Para probar este flujo, cambia tu usuario en la barra lateral a <strong>Carlos Mondaca (Jefe DAF)</strong> o <strong>María Tapia (Directora)</strong>.</em>
          </div>
        </div>
      ) : (
        <>
          {loading ? (
            <div className="text-center py-12 text-gray-400">Cargando bandeja de visaciones...</div>
          ) : pendingApprovals.length === 0 ? (
            <div className="card bg-white shadow-sm border border-[#e2e8f0] p-12 text-center text-gray-500">
              <CheckCircle2 className="mx-auto text-emerald-400 mb-3" size={44} />
              <h3 className="text-base font-bold text-gray-800">¡Bandeja al Día!</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                No tienes documentos oficiales pendientes de firma o visación en este momento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingApprovals.map((step) => {
                const doc = step.document;
                return (
                  <div
                    key={step.id}
                    className="card bg-white shadow-sm border border-[#e2e8f0] hover:border-[#016098]/40 transition-all flex flex-col justify-between"
                  >
                    <div className="card-body p-6">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="badge badge-sm bg-amber-100 text-amber-800 font-bold border-none mb-1">
                            Paso {step.stepNumber}: {step.stepName}
                          </span>
                          <h3 className="text-lg font-bold text-gray-800 leading-snug">
                            {doc?.folio}
                          </h3>
                        </div>
                        <span className="badge badge-sm bg-blue-50 text-[#016098] font-bold border-blue-200">
                          {doc?.version ? `v${doc.version}` : 'v1.0'}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-[#016098] mt-2">
                        {doc?.template?.name || 'Documento Oficial'}
                      </p>

                      <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>
                          <span className="text-[10px] text-gray-400 block uppercase">Solicitado por:</span>
                          <span className="font-medium text-gray-800">{doc?.createdBy}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block uppercase">Departamento:</span>
                          <span className="font-semibold text-gray-700">{doc?.department}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block uppercase">Fecha Emisión:</span>
                          <span>{new Date(doc?.createdAt).toLocaleDateString('es-CL')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block uppercase">Código CUV:</span>
                          <span className="font-mono text-gray-700 font-bold">{doc?.cuv || 'Pendiente'}</span>
                        </div>
                      </div>

                      {doc?.changeLog && (
                        <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-gray-600">
                          <strong>Motivo de la versión:</strong> {doc.changeLog}
                        </div>
                      )}
                    </div>

                    <div className="bg-[#f8fafc] px-6 py-3 border-t border-[#e2e8f0] flex items-center justify-between gap-2 rounded-b-2xl">
                      <a
                        href={`http://localhost:3001/api/documents/${doc?.id}/download`}
                        className="btn btn-ghost btn-xs text-gray-600 hover:text-[#016098] gap-1"
                      >
                        <Download size={13} /> Revisar Borrador
                      </a>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setRejectModal(step);
                            setComment('');
                          }}
                          className="btn btn-xs bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 gap-1 font-bold"
                        >
                          <XCircle size={13} /> Devolver
                        </button>
                        <button
                          onClick={() => {
                            setApproveModal(step);
                            setComment('');
                          }}
                          className="btn btn-xs bg-emerald-600 hover:bg-emerald-700 text-white border-none gap-1 font-bold shadow-sm"
                        >
                          <CheckCircle2 size={13} /> Visar y Firmar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal: Confirmación de Visado y Firma */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
            <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <CheckCircle2 size={20} /> Visación y Firma Electrónica
              </h3>
              <button onClick={() => setApproveModal(null)} className="btn btn-ghost btn-xs text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-emerald-900">
                Estás a punto de visar el documento <strong className="font-mono">{approveModal.document?.folio}</strong>{' '}
                como <strong className="text-emerald-800">{currentUser?.name}</strong> ({currentUser?.role}).
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Observaciones o constancia de visado (Opcional):
                </label>
                <textarea
                  rows={3}
                  className="textarea textarea-bordered textarea-sm w-full text-xs"
                  placeholder="Ej: Se verifica cumplimiento técnico y financiero según Ley 19.886..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <div className="text-[11px] text-gray-500 bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                <div className="flex items-center gap-1 font-bold text-gray-700">
                  <ShieldCheck size={14} className="text-[#016098]" /> Validez Jurídica Institucional
                </div>
                <p>
                  Esta visación electrónica quedará registrada de forma inalterable en la Pista de Auditoría para la Contraloría General de la República con tu RUT y dirección IP.
                </p>
              </div>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <button onClick={() => setApproveModal(null)} className="btn btn-xs btn-ghost text-gray-600">
                Cancelar
              </button>
              <button
                onClick={handleApprove}
                disabled={processing}
                className="btn btn-xs bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm gap-1 font-bold px-4"
              >
                {processing ? 'Firmando...' : 'Confirmar y Firmar Digitalmente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Devolución / Rechazo con Observaciones */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
            <div className="px-6 py-4 bg-red-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <XCircle size={20} /> Devolución con Observaciones
              </h3>
              <button onClick={() => setRejectModal(null)} className="btn btn-ghost btn-xs text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs bg-red-50 p-3 rounded-lg border border-red-200 text-red-900">
                El documento <strong className="font-mono">{rejectModal.document?.folio}</strong> volverá al estado{' '}
                <strong>BORRADOR</strong> para que el funcionario creador corrija las observaciones.
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Observaciones obligatorias para el creador:
                </label>
                <textarea
                  rows={3}
                  className="textarea textarea-bordered textarea-sm w-full text-xs"
                  placeholder="Indica con claridad qué datos o montos deben corregirse antes de visar..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <button onClick={() => setRejectModal(null)} className="btn btn-xs btn-ghost text-gray-600">
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !comment}
                className="btn btn-xs bg-red-600 hover:bg-red-700 text-white border-none shadow-sm gap-1 font-bold px-4"
              >
                {processing ? 'Devolviendo...' : 'Confirmar Devolución'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
