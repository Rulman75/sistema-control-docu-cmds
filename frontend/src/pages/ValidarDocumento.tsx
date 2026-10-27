import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, Search, CheckCircle2, XCircle, FileText, Download, Calendar, User, Building2, QrCode, AlertTriangle } from 'lucide-react';

export default function ValidarDocumento() {
  const [searchParams] = useSearchParams();
  const queryCuv = searchParams.get('cuv') || searchParams.get('folio') || '';

  const [inputCode, setInputCode] = useState(queryCuv);
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (queryCuv) {
      setInputCode(queryCuv);
      verifyDocument(queryCuv);
    }
  }, [queryCuv]);

  const verifyDocument = async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    setSearched(true);
    setResult(null);

    try {
      const res = await axios.get(`http://localhost:3001/api/documents/verify/${encodeURIComponent(code.trim())}`);
      setResult(res.data);
    } catch (err: any) {
      setResult({ isValid: false, error: err.response?.data?.error || 'Documento no encontrado o no fidedigno' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    verifyDocument(inputCode);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      {/* Encabezado Institucional de Validación Pública */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-[#016098] text-white rounded-2xl mx-auto flex items-center justify-center shadow-md mb-2">
          <ShieldCheck size={36} />
        </div>
        <h1 className="text-2xl font-extrabold text-[#016098]">Portal de Validación de Documentos Oficiales</h1>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          Corporación Municipal de Desarrollo Social de Antofagasta &bull; Sistema de Verificación Pública bajo Ley N° 19.799 de Firma Electrónica
        </p>
      </div>

      {/* Buscador de Verificación */}
      <div className="card bg-white shadow-sm border border-[#e2e8f0]">
        <div className="card-body p-6">
          <form onSubmit={handleSearch} className="space-y-3">
            <label className="block text-xs font-semibold text-gray-700">
              Ingresa el Folio Oficial o el Código Único de Verificación (CUV):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ej: CMDS-2728BB-2026 o RES-DAF-2026-0001..."
                className="input input-bordered input-sm w-full font-mono text-sm"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="btn btn-sm bg-[#016098] hover:bg-[#014c78] text-white border-none gap-2 font-bold px-6"
              >
                <Search size={16} />
                {loading ? 'Validando...' : 'Verificar'}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              💡 Puedes encontrar este código impreso al pie del documento oficial o escaneando el código QR institucional.
            </p>
          </form>
        </div>
      </div>

      {/* Resultado: Documento Válido */}
      {result && result.isValid && result.document && (
        <div className="card bg-white shadow-lg border-2 border-emerald-500 overflow-hidden">
          <div className="bg-emerald-600 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={28} />
              <div>
                <h2 className="font-extrabold text-base tracking-wide uppercase">Documento Oficial Auténtico</h2>
                <p className="text-xs text-emerald-100">
                  Registrado y verificado en la base institucional de la CMDS
                </p>
              </div>
            </div>
            <span className="badge bg-white text-emerald-800 font-bold border-none text-xs">
              VÁLIDO
            </span>
          </div>

          <div className="card-body p-6 space-y-6">
            {/* Metadatos Principales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-gray-100 text-xs">
              <div>
                <span className="text-gray-400 block uppercase font-semibold text-[10px]">Folio Institucional:</span>
                <span className="text-base font-extrabold font-mono text-[#016098]">
                  {result.document.folio}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block uppercase font-semibold text-[10px]">Código de Verificación (CUV):</span>
                <span className="text-base font-mono font-bold text-gray-800">
                  {result.document.cuv}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block uppercase font-semibold text-[10px]">Formato Tipo:</span>
                <span className="font-bold text-gray-800">{result.document.templateName}</span>
              </div>
              <div>
                <span className="text-gray-400 block uppercase font-semibold text-[10px]">Departamento Origen:</span>
                <span className="font-semibold text-gray-700">{result.document.department}</span>
              </div>
              <div>
                <span className="text-gray-400 block uppercase font-semibold text-[10px]">Fecha de Emisión:</span>
                <span className="font-medium text-gray-800">
                  {new Date(result.document.createdAt).toLocaleString('es-CL')}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block uppercase font-semibold text-[10px]">Versión Vigente:</span>
                <span className="badge badge-sm bg-indigo-50 text-indigo-700 font-mono font-bold">
                  v{result.document.version || '1.0'}
                </span>
              </div>
            </div>

            {/* Sello Criptográfico SHA-256 */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                Huella Digital Criptográfica (SHA-256):
              </span>
              <span className="font-mono text-[10px] text-gray-600 break-all select-all block">
                {result.document.sha256Hash || 'Calculado al momento de la emisión formal'}
              </span>
            </div>

            {/* Cadena de Firmas y Visaciones Digitales */}
            <div>
              <h3 className="text-xs uppercase font-bold text-gray-500 mb-3 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#016098]" /> Cadena Oficial de Visaciones y Firmas Electrónicas:
              </h3>
              {result.document.approvalSteps && result.document.approvalSteps.length > 0 ? (
                <div className="space-y-2">
                  {result.document.approvalSteps.map((step: any) => (
                    <div
                      key={step.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-gray-800">{step.stepName}</div>
                        <div className="text-[11px] text-gray-500">
                          {step.approvedBy ? (
                            <span>
                              Firmado por: <strong>{step.approvedBy}</strong> {step.approverRut ? `(${step.approverRut})` : ''}
                            </span>
                          ) : (
                            <span className="text-amber-600">Pendiente de firma</span>
                          )}
                        </div>
                        {step.comment && (
                          <div className="text-[10px] text-gray-400 italic mt-0.5">"{step.comment}"</div>
                        )}
                      </div>

                      <div className="text-right">
                        {step.status === 'APROBADO' ? (
                          <span className="badge badge-sm bg-emerald-100 text-emerald-800 font-bold border-none">
                            VISADO
                          </span>
                        ) : (
                          <span className="badge badge-sm bg-amber-100 text-amber-800 font-bold border-none">
                            PENDIENTE
                          </span>
                        )}
                        {step.approvedAt && (
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            {new Date(step.approvedAt).toLocaleDateString('es-CL')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400 italic">Documento emitido formalmente sin observaciones.</div>
              )}
            </div>

            {/* Botón de Descarga Oficial */}
            <div className="pt-2 flex justify-end">
              <a
                href={`http://localhost:3001/api/documents/${result.document.id}/download`}
                className="btn btn-sm bg-[#016098] hover:bg-[#014c78] text-white border-none gap-2 font-bold shadow-sm"
              >
                <Download size={15} /> Descargar Copia Oficial Fidedigna (.docx)
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Resultado: Código No Válido */}
      {result && !result.isValid && searched && (
        <div className="card bg-white shadow-md border-2 border-red-500 p-8 text-center space-y-3">
          <XCircle size={44} className="mx-auto text-red-500" />
          <h2 className="text-lg font-bold text-red-800">Código o Folio No Registrado</h2>
          <p className="text-xs text-gray-600 max-w-md mx-auto">
            El código ingresado <strong className="font-mono text-red-700">"{inputCode}"</strong> no corresponde a ningún documento oficial emitido por la Corporación Municipal de Desarrollo Social de Antofagasta.
          </p>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-800 max-w-md mx-auto">
            ⚠️ <em>Verifique que los caracteres hayan sido ingresados exactamente como figuran en el timbre o código de barras. Si sospecha de una falsificación, informe a la Dirección Jurídica de la CMDS.</em>
          </div>
        </div>
      )}
    </div>
  );
}
