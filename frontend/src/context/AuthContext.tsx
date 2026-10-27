import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export interface User {
  id: number;
  rut: number | string;
  dv?: string;
  name: string;
  email: string;
  role: 'SUPERADMIN' | 'DIRECTOR' | 'JEFE_DEPTO' | 'FUNCIONARIO' | 'AUDITOR_CONTRALORIA';
  department: 'CASA_CENTRAL' | 'DAF' | 'EDUCACION' | 'SALUD' | 'JURIDICA';
}

interface AuthContextType {
  currentUser: User | null;
  usersList: User[];
  setCurrentUser: (user: User) => void;
  setUsersList: React.Dispatch<React.SetStateAction<User[]>>;
  refreshUsers: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  usersList: [],
  setCurrentUser: () => {},
  setUsersList: () => {},
  refreshUsers: async () => {},
  loading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Configurar interceptor de axios para enviar cabeceras RBAC y Auditoría
    const interceptor = axios.interceptors.request.use((config) => {
      const savedUserStr = localStorage.getItem('cmds_current_user');
      if (savedUserStr) {
        try {
          const user: User = JSON.parse(savedUserStr);
          config.headers['x-user-id'] = user.id;
          config.headers['x-user-role'] = user.role;
          config.headers['x-user-rut'] = user.dv ? `${user.rut}-${user.dv}` : String(user.rut);
          config.headers['x-user-name'] = encodeURIComponent(user.name);
          config.headers['x-user-dept'] = user.department;
        } catch (e) {
          console.error(e);
        }
      }
      return config;
    });

    fetchUsers();

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:3001/api/users');
      setUsersList(res.data);

      const savedUserStr = localStorage.getItem('cmds_current_user');
      let userToSet: User | null = null;

      if (savedUserStr && res.data.length > 0) {
        try {
          const parsed = JSON.parse(savedUserStr);
          const stillExists = res.data.find((u: User) => u.id === parsed.id || u.rut === parsed.rut);
          if (stillExists) {
            userToSet = stillExists;
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (!userToSet && res.data.length > 0) {
        userToSet = res.data.find((u: User) => u.role === 'SUPERADMIN') || res.data[0];
      }

      if (userToSet) {
        setCurrentUser(userToSet);
        localStorage.setItem('cmds_current_user', JSON.stringify(userToSet));
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrentUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('cmds_current_user', JSON.stringify(user));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        usersList,
        setCurrentUser: handleSetCurrentUser,
        setUsersList,
        refreshUsers: fetchUsers,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
