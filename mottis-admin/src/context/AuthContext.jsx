import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [staff, setStaff] = useState(() => {
    const saved = localStorage.getItem('staff');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (staffData) => {
    setStaff(staffData);
    localStorage.setItem('staff', JSON.stringify(staffData));
  };

  const logout = () => {
    setStaff(null);
    localStorage.clear();
  };

  const isAuthenticated = !!staff && !!localStorage.getItem('accessToken');

  return (
    <AuthContext.Provider value={{ staff, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
