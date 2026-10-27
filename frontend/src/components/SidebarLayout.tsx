import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, FilePlus, History, ShieldCheck, Menu, X, ChevronDown, ChevronRight, UserCheck, CheckCircle2, QrCode, Users, Layers } from 'lucide-react';
import { useAuth, type User } from '../context/AuthContext';

export default function SidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const pathname = location.pathname;
  const { currentUser, usersList, setCurrentUser } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [menuDocumentosOpen, setMenuDocumentosOpen] = useState(true);

  const isActive = (path: string) => pathname === path || (path !== '/' && pathname.startsWith(`${path}`));

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'bg-purple-600 text-white';
      case 'DIRECTOR':
        return 'bg-amber-500 text-white';
      case 'AUDITOR_CONTRALORIA':
        return 'bg-rose-600 text-white';
      case 'JEFE_DEPTO':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-[#39BABD] text-white';
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans overflow-hidden">
      {/* Botón menú móvil */}
      <button
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-md shadow-md text-[#016098]"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay Móvil */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Principal */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          w-72 bg-white border-r border-[#e2e8f0] shadow-sm
          transform transition-transform duration-300 ease-in-out flex flex-col
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Cabecera institucional con Logo */}
        <div className="flex flex-col items-center py-5 border-b border-[#e2e8f0] bg-[#016098] text-white">
          <div className="w-14 h-14 bg-white rounded-xl shadow-inner flex items-center justify-center p-2 mb-2">
            <img src="/logo-oficial.png" alt="CMDS Logo" className="object-contain" />
          </div>
          <h1 className="text-xl font-bold tracking-widest text-yellow-400">CMDS</h1>
          <p className="text-[10px] uppercase tracking-wider text-blue-200 mt-0.5 font-semibold">
            Control Documental & SGSI
          </p>
        </div>

        {/* Perfil de Usuario Activo y Selector de Roles RBAC */}
        <div className="px-4 py-3 bg-blue-50 border-b border-[#e2e8f0]">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Usuario Activo (RBAC)</p>
            <span className={`inline-block px-1.5 py-0.2 text-[9px] font-bold rounded ${getRoleBadgeColor(currentUser?.role)}`}>
              {currentUser?.role || 'ROL'}
            </span>
          </div>
          <p className="text-sm font-bold text-[#016098] truncate" title={currentUser?.name}>
            {currentUser?.name || 'Cargando...'}
          </p>
          <div className="text-[10px] text-gray-500 flex items-center justify-between mt-0.5">
            <span>RUT: {currentUser?.rut ? `${currentUser.rut}${currentUser.dv ? '-' + currentUser.dv : ''}` : ''}</span>
            <span className="font-semibold text-blue-700">{currentUser?.department}</span>
          </div>

          {/* Simulador de Sesión para pruebas y demostración */}
          <div className="mt-2.5 pt-2 border-t border-blue-200/80">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold text-gray-700 flex items-center gap-1">
                <UserCheck size={11} className="text-[#016098]" /> Simular Sesión Activa:
              </label>
              <span className="text-[8px] bg-amber-100 text-amber-900 px-1 rounded font-bold uppercase tracking-wider">
                Pruebas
              </span>
            </div>
            <select
              className="w-full text-xs p-1.5 bg-white border border-blue-300 rounded font-medium text-gray-700 focus:outline-none focus:border-[#016098]"
              value={currentUser?.id || ''}
              onChange={(e) => {
                const selected = usersList.find((u: User) => u.id === Number(e.target.value));
                if (selected) setCurrentUser(selected);
              }}
            >
              {usersList.map((u: User) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role} - {u.department})
                </option>
              ))}
            </select>
            <p className="text-[9px] text-gray-500 mt-1 leading-tight">
              Permite alternar entre funcionarios sin cerrar sesión para evaluar permisos y visaciones.
            </p>
          </div>
        </div>

        {/* Menú de Navegación */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-3 px-3 space-y-1">
          <ul className="space-y-1">
            <li>
              <Link
                to="/"
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  pathname === '/'
                    ? 'bg-[#016098] text-white shadow-md shadow-blue-900/20'
                    : 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#016098]'
                }`}
              >
                <LayoutDashboard size={17} />
                <span>Dashboard</span>
              </Link>
            </li>

            <li className="pt-2">
              <button
                onClick={() => setMenuDocumentosOpen(!menuDocumentosOpen)}
                className={`flex justify-between items-center w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  menuDocumentosOpen ? 'text-[#016098]' : 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#016098]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <FileText size={17} />
                  <span>Documentos Oficiales</span>
                </span>
                <span className="text-xs">
                  {menuDocumentosOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              </button>

              {menuDocumentosOpen && (
                <ul className="mt-1 space-y-1 pl-4 border-l-2 border-blue-100 ml-4">
                  <li>
                    <Link
                      to="/plantillas"
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors duration-200 ${
                        isActive('/plantillas')
                          ? 'bg-[#016098] text-white'
                          : 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#016098]'
                      }`}
                    >
                      <FileText size={14} />
                      <span>Gestión de Plantillas</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/generar"
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors duration-200 ${
                        isActive('/generar')
                          ? 'bg-[#016098] text-white'
                          : 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#016098]'
                      }`}
                    >
                      <FilePlus size={14} />
                      <span>Generar Documento</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/historial"
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors duration-200 ${
                        isActive('/historial')
                          ? 'bg-[#016098] text-white'
                          : 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#016098]'
                      }`}
                    >
                      <History size={14} />
                      <span>Historial & Folios</span>
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Bandeja de Visaciones y Firmas (Fase 3) */}
            <li className="pt-1">
              <Link
                to="/aprobaciones"
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive('/aprobaciones')
                    ? 'bg-[#016098] text-white shadow-md shadow-blue-900/20'
                    : 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#016098]'
                }`}
              >
                <CheckCircle2 size={17} />
                <span>Bandeja Visaciones</span>
              </Link>
            </li>

            {/* Mantenedor de Usuarios (RBAC) */}
            <li className="pt-1">
              <Link
                to="/usuarios"
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive('/usuarios')
                    ? 'bg-[#016098] text-white shadow-md shadow-blue-900/20'
                    : 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#016098]'
                }`}
              >
                <Users size={17} />
                <span>Gestión de Usuarios</span>
              </Link>
            </li>

            {/* Mantenedor de Departamentos y Roles */}
            <li className="pt-1">
              <Link
                to="/departamentos-roles"
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive('/departamentos-roles')
                    ? 'bg-[#016098] text-white shadow-md shadow-blue-900/20'
                    : 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#016098]'
                }`}
              >
                <Layers size={17} />
                <span>Deptos & Roles</span>
              </Link>
            </li>

            {/* Módulo de Auditoría y Seguridad SGSI */}
            <li className="pt-1">
              <Link
                to="/auditoria"
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive('/auditoria')
                    ? 'bg-[#016098] text-white shadow-md shadow-blue-900/20'
                    : 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#016098]'
                }`}
              >
                <ShieldCheck size={17} />
                <span>Auditoría SGSI</span>
              </Link>
            </li>

            {/* Portal de Validación Pública */}
            <li className="pt-1">
              <Link
                to="/validar"
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive('/validar')
                    ? 'bg-[#016098] text-white shadow-md shadow-blue-900/20'
                    : 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#016098]'
                }`}
              >
                <QrCode size={17} />
                <span>Validar Documento</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Pie de Barra Lateral */}
        <div className="p-3 border-t border-[#e2e8f0] bg-slate-50 text-[10px] text-gray-400 text-center">
          CMDS Antofagasta &bull; Sistema SGSI v2.0
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 overflow-auto h-screen bg-[#f8fafc] p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
