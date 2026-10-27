import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import SidebarLayout from './components/SidebarLayout';
import Dashboard from './pages/Dashboard';
import Plantillas from './pages/Plantillas';
import Generar from './pages/Generar';
import Historial from './pages/Historial';
import Auditoria from './pages/Auditoria';
import Aprobaciones from './pages/Aprobaciones';
import ValidarDocumento from './pages/ValidarDocumento';
import Usuarios from './pages/Usuarios';
import DepartamentosRoles from './pages/DepartamentosRoles';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <SidebarLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/plantillas" element={<Plantillas />} />
            <Route path="/generar" element={<Generar />} />
            <Route path="/historial" element={<Historial />} />
            <Route path="/aprobaciones" element={<Aprobaciones />} />
            <Route path="/auditoria" element={<Auditoria />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/departamentos-roles" element={<DepartamentosRoles />} />
            <Route path="/validar" element={<ValidarDocumento />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SidebarLayout>
      </Router>
    </AuthProvider>
  );
}
