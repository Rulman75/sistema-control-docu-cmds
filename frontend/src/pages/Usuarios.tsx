import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  Shield,
  Building2,
  Mail,
  Edit2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Lock,
  UserCheck,
  X
} from 'lucide-react';

interface UserItem {
  id: number;
  rut: number;
  dv: string;
  name: string;
  email: string;
  role: string;
  department: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const formatRutDisplay = (rut: number | string, dv?: string) => {
  if (!rut) return '';
  const numStr = String(rut).replace(/[^0-9]/g, '');
  if (!numStr) return '';
  const formatted = numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dv ? `${formatted}-${dv}` : formatted;
};

// Algoritmo módulo 11 para calcular o sugerir DV chileno
const calculateRutDv = (rutNum: number): string => {
  let m = 0, s = 1;
  let t = rutNum;
  for (; t; t = Math.floor(t / 10)) {
    s = (s + t % 10 * (9 - m++ % 6)) % 11;
  }
  return s ? String(s - 1) : 'K';
};

export default function Usuarios() {
  const { currentUser, setCurrentUser, setUsersList } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('TODOS');
  const [filterDept, setFilterDept] = useState('TODOS');
  const [filterStatus, setFilterStatus] = useState('TODOS');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Formulario de Creación / Edición
  const [formData, setFormData] = useState({
    rut: '',
    dv: '',
    name: '',
    email: '',
    role: 'FUNCIONARIO',
    department: 'DAF',
    password: '',
  });

  // Estado para reseteo de contraseña
  const [customPassword, setCustomPassword] = useState('');
  const [resetSuccessData, setResetSuccessData] = useState<{
    temporaryPassword?: string;
    userName?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Mensajes de feedback
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);

  const isAdmin = ['SUPERADMIN', 'DIRECTOR'].includes(currentUser?.role || '');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [usersRes, deptsRes, rolesRes] = await Promise.all([
        axios.get('http://localhost:3001/api/users?all=true'),
        axios.get('http://localhost:3001/api/departments'),
        axios.get('http://localhost:3001/api/roles')
      ]);
      setUsers(usersRes.data);
      setDepartmentsList(deptsRes.data);
      setRolesList(rolesRes.data);
      if (setUsersList) {
        setUsersList(usersRes.data);
      }
      if (currentUser && setCurrentUser) {
        const updatedSelf = usersRes.data.find((u: any) => u.id === currentUser.id);
        if (updatedSelf) {
          setCurrentUser(updatedSelf);
        }
      }
    } catch (err: any) {
      console.error('Error al cargar usuarios:', err);
      showNotification('error', 'Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleRutChange = (val: string) => {
    const digitsOnly = val.replace(/[^0-9]/g, '');
    const num = parseInt(digitsOnly, 10);
    let autoDv = formData.dv;
    if (!isNaN(num) && num >= 1000000) {
      autoDv = calculateRutDv(num);
    } else if (digitsOnly === '') {
      autoDv = '';
    }
    setFormData(prev => ({
      ...prev,
      rut: digitsOnly,
      dv: autoDv
    }));
  };

  // Abrir Modal de Creación
  const handleOpenCreate = () => {
    setFormData({
      rut: '',
      dv: '',
      name: '',
      email: '',
      role: 'FUNCIONARIO',
      department: departmentsList.length > 0 ? departmentsList[0].code : 'DAF',
      password: '',
    });
    setIsCreateModalOpen(true);
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (user: UserItem) => {
    setSelectedUser(user);
    setFormData({
      rut: String(user.rut),
      dv: user.dv || '',
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      password: '',
    });
    setIsEditModalOpen(true);
  };

  // Abrir Modal de Reseteo de Contraseña
  const handleOpenReset = (user: UserItem) => {
    setSelectedUser(user);
    setCustomPassword('');
    setResetSuccessData(null);
    setCopied(false);
    setIsResetModalOpen(true);
  };

  // Guardar nuevo usuario
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRut = parseInt(formData.rut.replace(/[^0-9]/g, ''), 10);
    const cleanDv = formData.dv.trim().toUpperCase().replace(/[^0-9K]/g, '');

    if (isNaN(cleanRut) || cleanRut <= 0) {
      showNotification('error', 'El RUT debe ser un valor numérico válido.');
      return;
    }
    if (!cleanDv || cleanDv.length !== 1) {
      showNotification('error', 'Debe ingresar un Dígito Verificador (DV) válido (0-9 o K).');
      return;
    }

    try {
      const res = await axios.post('http://localhost:3001/api/users', {
        rut: cleanRut,
        dv: cleanDv,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
        password: formData.password || undefined,
      });
      showNotification(
        'success',
        res.data.updated
          ? `Funcionario ${res.data.user.name} ya existía y su información fue actualizada exitosamente.`
          : `Funcionario ${res.data.user.name} registrado exitosamente.`
      );
      setIsCreateModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || 'Error al crear el usuario');
    }
  };

  // Guardar edición de usuario
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const res = await axios.put(`http://localhost:3001/api/users/${selectedUser.id}`, {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
      });
      showNotification('success', `Funcionario ${res.data.user.name} actualizado correctamente.`);
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || 'Error al actualizar el usuario');
    }
  };

  // Confirmar reseteo de contraseña
  const handleResetPassword = async () => {
    if (!selectedUser) return;
    try {
      const res = await axios.post(`http://localhost:3001/api/users/${selectedUser.id}/reset-password`, {
        newPassword: customPassword.trim() || undefined,
      });
      setResetSuccessData({
        temporaryPassword: res.data.temporaryPassword,
        userName: res.data.userName,
      });
      showNotification('success', 'Contraseña restablecida y auditada con éxito.');
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || 'Error al resetear contraseña');
    }
  };

  // Activar / Desactivar estado
  const handleToggleStatus = async (user: UserItem) => {
    const actionText = user.isActive ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Confirmas que deseas ${actionText} la cuenta de ${user.name}?`)) {
      return;
    }
    try {
      await axios.put(`http://localhost:3001/api/users/${user.id}/toggle-status`);
      showNotification('success', `Estado de ${user.name} actualizado.`);
      fetchUsers();
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || 'Error al cambiar estado');
    }
  };

  const handleCopyPassword = () => {
    if (resetSuccessData?.temporaryPassword) {
      navigator.clipboard.writeText(resetSuccessData.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Filtro de usuarios
  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    const formattedRut = formatRutDisplay(u.rut, u.dv).toLowerCase();
    const rawRutStr = String(u.rut || '').toLowerCase();
    const dvStr = (u.dv || '').toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(term) ||
      rawRutStr.includes(term) ||
      formattedRut.includes(term) ||
      (u.dv && `${rawRutStr}-${dvStr}`.includes(term)) ||
      u.email.toLowerCase().includes(term);

    const matchesRole = filterRole === 'TODOS' || u.role === filterRole;
    const matchesDept = filterDept === 'TODOS' || u.department === filterDept;
    const matchesStatus =
      filterStatus === 'TODOS' ||
      (filterStatus === 'ACTIVO' && u.isActive) ||
      (filterStatus === 'INACTIVO' && !u.isActive);

    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return <span className="badge badge-xs bg-purple-600 text-white font-bold border-none">SUPERADMIN</span>;
      case 'DIRECTOR':
        return <span className="badge badge-xs bg-amber-500 text-white font-bold border-none">DIRECCIÓN</span>;
      case 'JEFE_DEPTO':
        return <span className="badge badge-xs bg-blue-600 text-white font-bold border-none">JEFE DEPTO</span>;
      case 'AUDITOR_CONTRALORIA':
        return <span className="badge badge-xs bg-rose-600 text-white font-bold border-none">AUDITOR CONTRALORÍA</span>;
      default:
        return <span className="badge badge-xs bg-[#39BABD] text-white font-bold border-none">FUNCIONARIO</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users size={26} className="text-[#016098]" />
            <h1 className="text-2xl font-bold text-[#016098]">Mantenedor de Usuarios & Roles RBAC</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Administración de funcionarios, asignación de privilegios departamentales y control de credenciales
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="btn btn-sm bg-[#016098] hover:bg-[#014c78] text-white border-none gap-2 shadow-sm self-start md:self-auto"
          >
            <UserPlus size={16} /> + Nuevo Usuario
          </button>
        )}
      </div>

      {/* Alerta de notificación */}
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

      {/* Tarjetas de Métricas de Usuarios */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card bg-white shadow-sm border border-[#e2e8f0]">
          <div className="card-body p-4">
            <span className="text-[11px] font-semibold text-gray-400 uppercase">Total Usuarios</span>
            <p className="text-2xl font-extrabold text-[#016098] mt-1">{users.length}</p>
            <span className="text-[10px] text-gray-400 mt-1 block">Registrados en la CMDS</span>
          </div>
        </div>

        <div className="card bg-white shadow-sm border border-[#e2e8f0]">
          <div className="card-body p-4">
            <span className="text-[11px] font-semibold text-gray-400 uppercase">Cuentas Activas</span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">
              {users.filter((u) => u.isActive).length}
            </p>
            <span className="text-[10px] text-emerald-600/80 mt-1 block">Con acceso autorizado</span>
          </div>
        </div>

        <div className="card bg-white shadow-sm border border-[#e2e8f0]">
          <div className="card-body p-4">
            <span className="text-[11px] font-semibold text-gray-400 uppercase">Cuentas Inactivas</span>
            <p className="text-2xl font-extrabold text-rose-500 mt-1">
              {users.filter((u) => !u.isActive).length}
            </p>
            <span className="text-[10px] text-rose-500/80 mt-1 block">Acceso revocado</span>
          </div>
        </div>

        <div className="card bg-white shadow-sm border border-[#e2e8f0]">
          <div className="card-body p-4">
            <span className="text-[11px] font-semibold text-gray-400 uppercase">Jefaturas & Dirección</span>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">
              {users.filter((u) => ['DIRECTOR', 'JEFE_DEPTO'].includes(u.role)).length}
            </p>
            <span className="text-[10px] text-amber-600/80 mt-1 block">Autoridades visadoras</span>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="card bg-white shadow-sm border border-[#e2e8f0]">
        <div className="card-body p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search size={18} className="text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar funcionario por nombre, RUT (ej: 12.345.678-9) o correo..."
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

            {/* Filtro por Rol */}
            <select
              className="select select-bordered select-sm text-xs w-full md:w-44"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="TODOS">Todos los Roles</option>
              {rolesList.map((r) => (
                <option key={r.id} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* Filtro por Departamento */}
            <select
              className="select select-bordered select-sm text-xs w-full md:w-44"
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
            >
              <option value="TODOS">Todos los Deptos</option>
              {departmentsList.map((d) => (
                <option key={d.id} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Filtro por Estado */}
            <select
              className="select select-bordered select-sm text-xs w-full md:w-36"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="ACTIVO">Solo Activos</option>
              <option value="INACTIVO">Solo Inactivos</option>
            </select>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-100">
            <span>
              Mostrando <strong className="text-[#016098]">{filteredUsers.length}</strong> de {users.length} funcionarios
            </span>
            {(search || filterRole !== 'TODOS' || filterDept !== 'TODOS' || filterStatus !== 'TODOS') && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterRole('TODOS');
                  setFilterDept('TODOS');
                  setFilterStatus('TODOS');
                }}
                className="text-blue-600 hover:underline font-semibold"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="card bg-white shadow-sm border border-[#e2e8f0]">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Cargando directorio de usuarios...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="mx-auto text-gray-300 mb-2" size={38} />
              <p className="text-sm font-semibold">No se encontraron usuarios</p>
              <p className="text-xs text-gray-400 mt-1">
                Ajusta los términos de búsqueda o filtros aplicados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px]">
                    <th>Funcionario / RUT</th>
                    <th>Contacto</th>
                    <th>Rol</th>
                    <th>Departamento</th>
                    <th>Estado Acceso</th>
                    <th>Fecha Registro</th>
                    <th className="text-right">Acciones Administrativas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      <td>
                        <div className="font-bold text-gray-800 text-xs">{user.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                          RUT: <span className="font-semibold text-gray-700">{formatRutDisplay(user.rut, user.dv)}</span>
                        </div>
                      </td>

                      <td>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Mail size={12} className="text-[#016098]" />
                          <span>{user.email}</span>
                        </div>
                      </td>

                      <td>{getRoleBadge(user.role)}</td>

                      <td>
                        <span className="badge badge-xs bg-slate-100 text-slate-700 font-semibold border-none">
                          {user.department}
                        </span>
                      </td>

                      <td>
                        {user.isActive ? (
                          <span className="badge badge-xs bg-emerald-100 text-emerald-800 font-bold border-none inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Activo
                          </span>
                        ) : (
                          <span className="badge badge-xs bg-rose-100 text-rose-800 font-bold border-none inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Inactivo
                          </span>
                        )}
                      </td>

                      <td>
                        <span className="text-[11px] text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString('es-CL')}
                        </span>
                      </td>

                      <td className="text-right">
                        {isAdmin ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Editar Rol / Depto */}
                            <button
                              onClick={() => handleOpenEdit(user)}
                              className="btn btn-xs bg-blue-50 text-[#016098] hover:bg-blue-100 border border-blue-200 gap-1 font-semibold"
                              title="Editar datos, rol y departamento"
                            >
                              <Edit2 size={12} /> Editar
                            </button>

                            {/* Resetear Contraseña */}
                            <button
                              onClick={() => handleOpenReset(user)}
                              className="btn btn-xs bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 gap-1 font-semibold"
                              title="Resetear contraseña de acceso"
                            >
                              <KeyRound size={12} /> Clave
                            </button>

                            {/* Activar / Desactivar */}
                            <button
                              onClick={() => handleToggleStatus(user)}
                              className={`btn btn-xs border-none font-semibold ${
                                user.isActive
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                              title={user.isActive ? 'Desactivar cuenta' : 'Activar cuenta'}
                            >
                              {user.isActive ? 'Desactivar' : 'Activar'}
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

      {/* Modal: Crear Nuevo Usuario */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-200">
            <div className="px-6 py-4 bg-[#016098] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <UserPlus size={18} /> Registrar Nuevo Funcionario
                </h3>
                <p className="text-xs text-blue-200">Asignación de credenciales y rol de usuario</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="btn btn-ghost btn-xs text-white hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    RUT de la persona: *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="Ej: 12345678"
                    className="input input-sm input-bordered w-full min-w-0 text-xs font-mono"
                    value={formData.rut}
                    onChange={(e) => handleRutChange(e.target.value)}
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Solo números, sin puntos
                  </span>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    DV: *
                  </label>
                  <input
                    type="text"
                    maxLength={1}
                    required
                    placeholder="K"
                    className="input input-sm input-bordered w-full min-w-0 text-center text-xs font-mono font-bold uppercase"
                    value={formData.dv}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dv: e.target.value.toUpperCase() }))}
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block text-center">
                    0-9 o K
                  </span>
                </div>

                <div className="md:col-span-6">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nombre Completo: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Juan Pérez González"
                    className="input input-sm input-bordered w-full min-w-0 text-xs"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Correo Electrónico: *
                </label>
                <input
                  type="email"
                  required
                  placeholder="usuario@cmds.cl"
                  className="input input-sm input-bordered w-full text-xs"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Rol del Sistema (RBAC): *
                  </label>
                  <select
                    className="select select-sm select-bordered w-full text-xs"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    {rolesList.map((r) => (
                      <option key={r.id} value={r.code}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Departamento Asignado: *
                  </label>
                  <select
                    className="select select-sm select-bordered w-full text-xs"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  >
                    {departmentsList.map((d) => (
                      <option key={d.id} value={d.code}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Contraseña Inicial: (Opcional - por defecto: <code>cmds2026</code>)
                </label>
                <input
                  type="text"
                  placeholder="Dejar en blanco para usar 'cmds2026'"
                  className="input input-sm input-bordered w-full text-xs font-mono"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-sm btn-ghost text-gray-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-sm bg-[#016098] hover:bg-[#014c78] text-white border-none font-bold"
                >
                  Registrar Funcionario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Usuario */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
            <div className="px-6 py-4 bg-[#016098] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Edit2 size={18} /> Modificar Funcionario
                </h3>
                <p className="text-xs text-blue-200">Actualización de privilegios departamentales y rol</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="btn btn-ghost btn-xs text-white hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-xs text-gray-600 flex justify-between">
                <span>RUT: <strong className="font-mono text-gray-800">{formatRutDisplay(selectedUser.rut, selectedUser.dv)}</strong></span>
                <span>ID: #{selectedUser.id}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nombre Completo: *
                </label>
                <input
                  type="text"
                  required
                  className="input input-sm input-bordered w-full text-xs"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Correo Electrónico: *
                </label>
                <input
                  type="email"
                  required
                  className="input input-sm input-bordered w-full text-xs"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Rol del Sistema: *
                  </label>
                  <select
                    className="select select-sm select-bordered w-full text-xs"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    {rolesList.map((r) => (
                      <option key={r.id} value={r.code}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Departamento Asignado: *
                  </label>
                  <select
                    className="select select-sm select-bordered w-full text-xs"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  >
                    {departmentsList.map((d) => (
                      <option key={d.id} value={d.code}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="btn btn-sm btn-ghost text-gray-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-sm bg-[#016098] hover:bg-[#014c78] text-white border-none font-bold"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Resetear Contraseña */}
      {isResetModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
            <div className="px-6 py-4 bg-amber-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <KeyRound size={18} /> Resetear Contraseña
                </h3>
                <p className="text-xs text-amber-100">Restablecimiento seguro de clave de acceso</p>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="btn btn-ghost btn-xs text-white hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <p className="text-gray-500 font-medium">
                  Funcionario: <strong className="text-gray-800">{selectedUser.name}</strong>
                </p>
                <p className="text-gray-500 font-medium">
                  RUT: <strong className="font-mono text-[#016098]">{formatRutDisplay(selectedUser.rut, selectedUser.dv)}</strong>
                </p>
                <p className="text-gray-500 font-medium">
                  Correo: <span>{selectedUser.email}</span>
                </p>
              </div>

              {!resetSuccessData ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nueva Contraseña Personalizada (Opcional):
                    </label>
                    <input
                      type="text"
                      placeholder="Dejar vacío para generar clave aleatoria segura..."
                      className="input input-sm input-bordered w-full text-xs font-mono"
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      💡 Si no ingresas una contraseña, el sistema generará automáticamente una clave temporal segura (ej. <code>Cmds#4821</code>).
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsResetModalOpen(false)}
                      className="btn btn-sm btn-ghost text-gray-500"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleResetPassword}
                      className="btn btn-sm bg-amber-600 hover:bg-amber-700 text-white border-none font-bold"
                    >
                      Confirmar Reseteo
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                    <CheckCircle className="mx-auto text-emerald-600" size={32} />
                    <h4 className="font-bold text-sm text-emerald-900">¡Contraseña Restablecida!</h4>
                    <p className="text-xs text-emerald-800">
                      Copia esta contraseña temporal y entrégala de forma segura al funcionario:
                    </p>

                    <div className="flex items-center justify-center gap-2 mt-2">
                      <code className="bg-white px-3 py-1.5 rounded-lg border border-emerald-300 font-mono text-base font-bold text-emerald-900 select-all shadow-inner">
                        {resetSuccessData.temporaryPassword}
                      </code>
                      <button
                        onClick={handleCopyPassword}
                        className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white border-none gap-1"
                        title="Copiar contraseña"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copiada' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400">
                    🔒 La acción ha quedado debidamente asentada en la Pista de Auditoría inalterable del SGSI.
                  </p>

                  <div className="pt-2 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setIsResetModalOpen(false);
                        setResetSuccessData(null);
                      }}
                      className="btn btn-sm bg-[#016098] text-white border-none w-full"
                    >
                      Finalizar y Cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
