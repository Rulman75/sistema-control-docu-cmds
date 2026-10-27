import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Shield,
  Plus,
  Search,
  Edit2,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Layers,
  ArrowUpDown
} from 'lucide-react';

interface DepartmentItem {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

interface RoleItem {
  id: number;
  code: string;
  name: string;
  description?: string;
  hierarchy: number;
  isActive: boolean;
  createdAt: string;
}

export default function DepartamentosRoles() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'DEPARTAMENTOS' | 'ROLES'>('DEPARTAMENTOS');

  // Estados Departamentos
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [deptSearch, setDeptSearch] = useState('');
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<DepartmentItem | null>(null);
  const [deptForm, setDeptForm] = useState({ code: '', name: '', description: '' });

  // Estados Roles
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [roleSearch, setRoleSearch] = useState('');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [roleForm, setRoleForm] = useState({ code: '', name: '', description: '', hierarchy: 1 });

  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAdmin = ['SUPERADMIN', 'DIRECTOR'].includes(currentUser?.role || '');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [deptRes, roleRes] = await Promise.all([
        axios.get('http://localhost:3001/api/departments?all=true'),
        axios.get('http://localhost:3001/api/roles?all=true')
      ]);
      setDepartments(deptRes.data);
      setRoles(roleRes.data);
    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      showNotification('error', 'Error al consultar departamentos y roles');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // ==================== DEPARTAMENTOS HANDLERS ====================
  const handleOpenCreateDept = () => {
    setSelectedDept(null);
    setDeptForm({ code: '', name: '', description: '' });
    setDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept: DepartmentItem) => {
    setSelectedDept(dept);
    setDeptForm({ code: dept.code, name: dept.name, description: dept.description || '' });
    setDeptModalOpen(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedDept) {
        // Editar
        await axios.put(`http://localhost:3001/api/departments/${selectedDept.id}`, {
          name: deptForm.name,
          description: deptForm.description,
        });
        showNotification('success', `Departamento ${deptForm.name} actualizado.`);
      } else {
        // Crear
        await axios.post('http://localhost:3001/api/departments', deptForm);
        showNotification('success', `Departamento ${deptForm.name} creado exitosamente.`);
      }
      setDeptModalOpen(false);
      fetchData();
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || 'Error al guardar departamento');
    }
  };

  const handleToggleDept = async (dept: DepartmentItem) => {
    const actionText = dept.isActive ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Confirmas que deseas ${actionText} el departamento ${dept.name}?`)) return;
    try {
      await axios.put(`http://localhost:3001/api/departments/${dept.id}/toggle-status`);
      showNotification('success', `Estado del departamento ${dept.name} actualizado.`);
      fetchData();
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || 'Error al cambiar estado');
    }
  };

  // ==================== ROLES HANDLERS ====================
  const handleOpenCreateRole = () => {
    setSelectedRole(null);
    setRoleForm({ code: '', name: '', description: '', hierarchy: 1 });
    setRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: RoleItem) => {
    setSelectedRole(role);
    setRoleForm({
      code: role.code,
      name: role.name,
      description: role.description || '',
      hierarchy: role.hierarchy
    });
    setRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedRole) {
        // Editar
        await axios.put(`http://localhost:3001/api/roles/${selectedRole.id}`, {
          name: roleForm.name,
          description: roleForm.description,
          hierarchy: roleForm.hierarchy,
        });
        showNotification('success', `Rol ${roleForm.name} actualizado.`);
      } else {
        // Crear
        await axios.post('http://localhost:3001/api/roles', roleForm);
        showNotification('success', `Rol ${roleForm.name} creado exitosamente.`);
      }
      setRoleModalOpen(false);
      fetchData();
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || 'Error al guardar rol');
    }
  };

  const handleToggleRole = async (role: RoleItem) => {
    const actionText = role.isActive ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Confirmas que deseas ${actionText} el rol ${role.name}?`)) return;
    try {
      await axios.put(`http://localhost:3001/api/roles/${role.id}/toggle-status`);
      showNotification('success', `Estado del rol ${role.name} actualizado.`);
      fetchData();
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || 'Error al cambiar estado');
    }
  };

  // Filtros
  const filteredDepts = departments.filter((d) => {
    const t = deptSearch.toLowerCase();
    return d.name.toLowerCase().includes(t) || d.code.toLowerCase().includes(t);
  });

  const filteredRoles = roles.filter((r) => {
    const t = roleSearch.toLowerCase();
    return r.name.toLowerCase().includes(t) || r.code.toLowerCase().includes(t);
  });

  const getRoleBadgeStyle = (code: string) => {
    switch (code) {
      case 'SUPERADMIN':
        return 'bg-purple-600 text-white';
      case 'DIRECTOR':
        return 'bg-amber-500 text-white';
      case 'JEFE_DEPTO':
        return 'bg-blue-600 text-white';
      case 'AUDITOR_CONTRALORIA':
        return 'bg-rose-600 text-white';
      default:
        return 'bg-[#39BABD] text-white';
    }
  };

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers size={26} className="text-[#016098]" />
            <h1 className="text-2xl font-bold text-[#016098]">Mantenedor de Departamentos y Roles</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Configuración de estructura organizacional institucional y matriz de privilegios RBAC
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            {activeTab === 'DEPARTAMENTOS' ? (
              <button
                onClick={handleOpenCreateDept}
                className="btn btn-sm bg-[#016098] hover:bg-[#014c78] text-white border-none gap-2 shadow-sm"
              >
                <Plus size={16} /> + Nuevo Departamento
              </button>
            ) : (
              <button
                onClick={handleOpenCreateRole}
                className="btn btn-sm bg-[#016098] hover:bg-[#014c78] text-white border-none gap-2 shadow-sm"
              >
                <Plus size={16} /> + Nuevo Rol RBAC
              </button>
            )}
          </div>
        )}
      </div>

      {/* Notificación */}
      {notification && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between text-sm ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="btn btn-ghost btn-xs">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Pestañas de Navegación del Mantenedor */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('DEPARTAMENTOS')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'DEPARTAMENTOS'
              ? 'border-[#016098] text-[#016098] bg-blue-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building2 size={18} />
          Departamentos Institucionales ({departments.length})
        </button>

        <button
          onClick={() => setActiveTab('ROLES')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'ROLES'
              ? 'border-[#016098] text-[#016098] bg-blue-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Shield size={18} />
          Roles & Privilegios RBAC ({roles.length})
        </button>
      </div>

      {/* ==================== VISTA: DEPARTAMENTOS ==================== */}
      {activeTab === 'DEPARTAMENTOS' && (
        <div className="space-y-6">
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card bg-white shadow-sm border border-[#e2e8f0]">
              <div className="card-body p-4">
                <span className="text-[11px] font-semibold text-gray-400 uppercase">Total Direcciones</span>
                <p className="text-2xl font-extrabold text-[#016098] mt-1">{departments.length}</p>
                <span className="text-[10px] text-gray-400 mt-0.5">Estructura organizacional CMDS</span>
              </div>
            </div>

            <div className="card bg-white shadow-sm border border-[#e2e8f0]">
              <div className="card-body p-4">
                <span className="text-[11px] font-semibold text-gray-400 uppercase">Departamentos Activos</span>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                  {departments.filter((d) => d.isActive).length}
                </p>
                <span className="text-[10px] text-emerald-600/80 mt-0.5">Operativos para emisión documental</span>
              </div>
            </div>

            <div className="card bg-white shadow-sm border border-[#e2e8f0]">
              <div className="card-body p-4">
                <span className="text-[11px] font-semibold text-gray-400 uppercase">Departamentos Inactivos</span>
                <p className="text-2xl font-extrabold text-rose-500 mt-1">
                  {departments.filter((d) => !d.isActive).length}
                </p>
                <span className="text-[10px] text-rose-500/80 mt-0.5">Unidades pausadas</span>
              </div>
            </div>
          </div>

          {/* Buscador de Departamentos */}
          <div className="card bg-white shadow-sm border border-[#e2e8f0]">
            <div className="card-body p-3.5 flex flex-row items-center gap-3">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por código (ej: DAF) o nombre de departamento..."
                className="input input-sm w-full focus:outline-none text-xs"
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
              />
              {deptSearch && (
                <button onClick={() => setDeptSearch('')} className="btn btn-ghost btn-xs text-gray-400">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Tabla de Departamentos */}
          <div className="card bg-white shadow-sm border border-[#e2e8f0]">
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-12 text-gray-400">Cargando departamentos...</div>
              ) : filteredDepts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Building2 className="mx-auto text-gray-300 mb-2" size={38} />
                  <p className="text-sm font-semibold">No se encontraron departamentos</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px]">
                        <th>Código</th>
                        <th>Nombre Institucional</th>
                        <th>Descripción Funcional</th>
                        <th>Estado</th>
                        <th className="text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredDepts.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                          <td>
                            <span className="font-mono font-bold text-[#016098] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                              {d.code}
                            </span>
                          </td>
                          <td className="font-bold text-gray-800">{d.name}</td>
                          <td className="text-gray-500 max-w-md truncate">{d.description || 'Sin descripción'}</td>
                          <td>
                            {d.isActive ? (
                              <span className="badge badge-xs bg-emerald-100 text-emerald-800 font-bold border-none inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Activo
                              </span>
                            ) : (
                              <span className="badge badge-xs bg-rose-100 text-rose-800 font-bold border-none inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Inactivo
                              </span>
                            )}
                          </td>
                          <td className="text-right">
                            {isAdmin ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditDept(d)}
                                  className="btn btn-xs bg-blue-50 text-[#016098] hover:bg-blue-100 border border-blue-200 gap-1 font-semibold"
                                  title="Editar departamento"
                                >
                                  <Edit2 size={12} /> Editar
                                </button>
                                <button
                                  onClick={() => handleToggleDept(d)}
                                  className={`btn btn-xs border-none font-semibold ${
                                    d.isActive
                                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                >
                                  {d.isActive ? 'Desactivar' : 'Activar'}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">Solo Lectura</span>
                            )}
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
      )}

      {/* ==================== VISTA: ROLES RBAC ==================== */}
      {activeTab === 'ROLES' && (
        <div className="space-y-6">
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card bg-white shadow-sm border border-[#e2e8f0]">
              <div className="card-body p-4">
                <span className="text-[11px] font-semibold text-gray-400 uppercase">Total Roles RBAC</span>
                <p className="text-2xl font-extrabold text-[#016098] mt-1">{roles.length}</p>
                <span className="text-[10px] text-gray-400 mt-0.5">Perfiles de seguridad configurados</span>
              </div>
            </div>

            <div className="card bg-white shadow-sm border border-[#e2e8f0]">
              <div className="card-body p-4">
                <span className="text-[11px] font-semibold text-gray-400 uppercase">Roles de Mando / Visación</span>
                <p className="text-2xl font-extrabold text-amber-600 mt-1">
                  {roles.filter((r) => r.hierarchy >= 3).length}
                </p>
                <span className="text-[10px] text-amber-600/80 mt-0.5">Jefaturas, Dirección y SuperAdmin</span>
              </div>
            </div>

            <div className="card bg-white shadow-sm border border-[#e2e8f0]">
              <div className="card-body p-4">
                <span className="text-[11px] font-semibold text-gray-400 uppercase">Roles Operativos / Auditoría</span>
                <p className="text-2xl font-extrabold text-blue-600 mt-1">
                  {roles.filter((r) => r.hierarchy < 3).length}
                </p>
                <span className="text-[10px] text-blue-600/80 mt-0.5">Funcionarios y Fiscalizadores</span>
              </div>
            </div>
          </div>

          {/* Buscador de Roles */}
          <div className="card bg-white shadow-sm border border-[#e2e8f0]">
            <div className="card-body p-3.5 flex flex-row items-center gap-3">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por código de rol (ej: JEFE_DEPTO) o nombre..."
                className="input input-sm w-full focus:outline-none text-xs"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
              />
              {roleSearch && (
                <button onClick={() => setRoleSearch('')} className="btn btn-ghost btn-xs text-gray-400">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Tabla de Roles */}
          <div className="card bg-white shadow-sm border border-[#e2e8f0]">
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-12 text-gray-400">Cargando roles...</div>
              ) : filteredRoles.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Shield className="mx-auto text-gray-300 mb-2" size={38} />
                  <p className="text-sm font-semibold">No se encontraron roles</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px]">
                        <th>Código Rol</th>
                        <th>Nombre Institucional</th>
                        <th>Descripción Funcional</th>
                        <th>Nivel Jerárquico</th>
                        <th>Estado</th>
                        <th className="text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRoles.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                          <td>
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${getRoleBadgeStyle(r.code)}`}>
                              {r.code}
                            </span>
                          </td>
                          <td className="font-bold text-gray-800">{r.name}</td>
                          <td className="text-gray-500 max-w-md truncate">{r.description || 'Sin descripción'}</td>
                          <td>
                            <span className="badge badge-xs bg-slate-100 text-slate-700 font-bold border-none">
                              Nivel {r.hierarchy}
                            </span>
                          </td>
                          <td>
                            {r.isActive ? (
                              <span className="badge badge-xs bg-emerald-100 text-emerald-800 font-bold border-none inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Activo
                              </span>
                            ) : (
                              <span className="badge badge-xs bg-rose-100 text-rose-800 font-bold border-none inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Inactivo
                              </span>
                            )}
                          </td>
                          <td className="text-right">
                            {isAdmin ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditRole(r)}
                                  className="btn btn-xs bg-blue-50 text-[#016098] hover:bg-blue-100 border border-blue-200 gap-1 font-semibold"
                                  title="Editar rol"
                                >
                                  <Edit2 size={12} /> Editar
                                </button>
                                <button
                                  onClick={() => handleToggleRole(r)}
                                  className={`btn btn-xs border-none font-semibold ${
                                    r.isActive
                                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                >
                                  {r.isActive ? 'Desactivar' : 'Activar'}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">Solo Lectura</span>
                            )}
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
      )}

      {/* ==================== MODAL DEPARTAMENTO ==================== */}
      {deptModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
            <div className="px-6 py-4 bg-[#016098] text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Building2 size={18} />
                {selectedDept ? 'Editar Departamento' : 'Nuevo Departamento Institucional'}
              </h3>
              <button onClick={() => setDeptModalOpen(false)} className="btn btn-ghost btn-xs text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Código Único (Identificador): *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!selectedDept}
                  placeholder="Ej: DAF, EDUCACION, OBRAS..."
                  className="input input-sm input-bordered w-full text-xs font-mono uppercase"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                />
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Utilizado internamente para folios y permisos RBAC.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nombre Oficial del Departamento: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Dirección de Obras y Operaciones"
                  className="input input-sm input-bordered w-full text-xs"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Descripción o Alcance:
                </label>
                <textarea
                  rows={2}
                  placeholder="Alcance funcional o responsabilidades de la unidad..."
                  className="textarea textarea-bordered textarea-sm w-full text-xs"
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeptModalOpen(false)}
                  className="btn btn-sm btn-ghost text-gray-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-sm bg-[#016098] hover:bg-[#014c78] text-white border-none font-bold"
                >
                  {selectedDept ? 'Guardar Cambios' : 'Crear Departamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL ROL ==================== */}
      {roleModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
            <div className="px-6 py-4 bg-[#016098] text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Shield size={18} />
                {selectedRole ? 'Editar Rol RBAC' : 'Nuevo Rol Institucional'}
              </h3>
              <button onClick={() => setRoleModalOpen(false)} className="btn btn-ghost btn-xs text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Código del Rol: *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!selectedRole}
                  placeholder="Ej: SECRETARIA_TECNICA, COORDINADOR..."
                  className="input input-sm input-bordered w-full text-xs font-mono uppercase"
                  value={roleForm.code}
                  onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nombre Descriptivo: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Secretaría Técnica de Licitaciones"
                  className="input input-sm input-bordered w-full text-xs"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nivel Jerárquico: *
                </label>
                <select
                  className="select select-sm select-bordered w-full text-xs"
                  value={roleForm.hierarchy}
                  onChange={(e) => setRoleForm({ ...roleForm, hierarchy: Number(e.target.value) })}
                >
                  <option value={1}>Nivel 1 - Operativo / Funcionario Solicitante</option>
                  <option value={2}>Nivel 2 - Auditoría / Control Interno</option>
                  <option value={3}>Nivel 3 - Jefatura de Departamento (Visador Técnico)</option>
                  <option value={4}>Nivel 4 - Dirección Ejecutiva (Firma Institucional)</option>
                  <option value={5}>Nivel 5 - Administrador General de Sistemas (SGSI)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Descripción de Facultades:
                </label>
                <textarea
                  rows={2}
                  placeholder="Permisos y atribuciones asociadas a este rol..."
                  className="textarea textarea-bordered textarea-sm w-full text-xs"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRoleModalOpen(false)}
                  className="btn btn-sm btn-ghost text-gray-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-sm bg-[#016098] hover:bg-[#014c78] text-white border-none font-bold"
                >
                  {selectedRole ? 'Guardar Cambios' : 'Crear Rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
