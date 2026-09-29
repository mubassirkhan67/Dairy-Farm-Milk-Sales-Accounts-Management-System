import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { INITIAL_USERS } from '../services/storage';

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, role?: Role) => boolean;
  logout: () => void;
  switchRole: (role: Role) => void;
  can: (action: PermissionAction) => boolean;
}

export type PermissionAction =
  | 'delete_financial'
  | 'manage_rates'
  | 'manage_users'
  | 'manage_shopkeepers'
  | 'manage_backup'
  | 'view_financial_report'
  | 'add_sale'
  | 'add_payment'
  | 'edit_sale'
  | 'manage_animals';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = 'dairy_farm_current_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    // Default to admin for immediate ready-to-use access
    return INITIAL_USERS[0];
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  }, [currentUser]);

  const login = (username: string, specifiedRole?: Role): boolean => {
    const trimmed = username.trim().toLowerCase();
    const user = INITIAL_USERS.find((u) => u.username.toLowerCase() === trimmed);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    // Allow quick custom login with role
    if (trimmed.length > 0) {
      const customUser: User = {
        id: `USR-${Date.now()}`,
        name: trimmed === 'admin' ? 'Farm Owner (Admin)' : 'Dairy Staff',
        username: trimmed,
        role: specifiedRole || (trimmed.includes('admin') ? 'admin' : 'employee'),
        created_at: new Date().toISOString(),
      };
      setCurrentUser(customUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const switchRole = (role: Role) => {
    const target = INITIAL_USERS.find((u) => u.role === role) || {
      id: `USR-${role}`,
      name: role === 'admin' ? 'Farm Owner (Admin)' : 'Staff (Employee)',
      username: role,
      role: role,
      created_at: new Date().toISOString(),
    };
    setCurrentUser(target);
  };

  const can = (action: PermissionAction): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;

    // Employee specific permissions
    switch (action) {
      case 'add_sale':
      case 'add_payment':
      case 'edit_sale':
        return true;
      case 'delete_financial':
      case 'manage_rates':
      case 'manage_users':
      case 'manage_backup':
      case 'view_financial_report':
        return false;
      case 'manage_shopkeepers':
      case 'manage_animals':
        return true; // Employee can add/view shopkeepers & animals
      default:
        return false;
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, switchRole, can }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
