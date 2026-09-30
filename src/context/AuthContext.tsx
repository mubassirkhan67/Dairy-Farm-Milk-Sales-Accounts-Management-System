import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Role } from '../types';
import { INITIAL_USERS, loadDatabase, saveDatabase } from '../services/storage';

export type PermissionAction =
  | 'add_sale'
  | 'edit_sale'
  | 'delete_sale'
  | 'add_payment'
  | 'delete_payment'
  | 'delete_financial'
  | 'manage_rates'
  | 'manage_shopkeepers'
  | 'manage_animals'
  | 'manage_expenses'
  | 'manage_backup'
  | 'view_financial_report'
  | 'edit_settings';

interface AuthContextType {
  currentUser: User;
  isAdmin: boolean;
  isAdminUnlocked: boolean;
  isPasswordModalOpen: boolean;
  unlockAdmin: (password: string) => { success: boolean; error?: string };
  lockAdmin: () => void;
  openPasswordModal: (onSuccessCallback?: () => void) => void;
  closePasswordModal: () => void;
  requireAdmin: (actionCallback: () => void) => void;
  changeAdminPassword: (oldPass: string, newPass: string) => { success: boolean; error?: string };
  can: (action: PermissionAction) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_SESSION_KEY = 'dairy_farm_admin_unlocked_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check if admin was already unlocked in current session
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  // currentUser reflects whether admin is active or staff/viewer
  const currentUser: User = isAdminUnlocked ? INITIAL_USERS[0] : INITIAL_USERS[1];
  const isAdmin = isAdminUnlocked;

  // Sync session storage
  useEffect(() => {
    try {
      if (isAdminUnlocked) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      } else {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
      }
    } catch {
      // ignore
    }
  }, [isAdminUnlocked]);

  // Helper to get active admin password from database
  const getStoredAdminPassword = (): string => {
    try {
      const db = loadDatabase();
      return db.settings?.admin_password || 'admin123';
    } catch {
      return 'admin123';
    }
  };

  const unlockAdmin = useCallback(
    (password: string): { success: boolean; error?: string } => {
      const expectedPassword = getStoredAdminPassword();
      if (!password || password.trim() === '') {
        return { success: false, error: 'Please enter the admin password.' };
      }

      if (password === expectedPassword) {
        setIsAdminUnlocked(true);
        setIsPasswordModalOpen(false);

        // If there was an action waiting for admin authentication, execute it!
        if (pendingCallback) {
          const cb = pendingCallback;
          setPendingCallback(null);
          setTimeout(() => {
            try {
              cb();
            } catch (err) {
              console.error('Error executing pending action:', err);
            }
          }, 50);
        }
        return { success: true };
      }

      return { success: false, error: 'Incorrect password. Only administrator can access or modify data.' };
    },
    [pendingCallback]
  );

  const lockAdmin = useCallback(() => {
    setIsAdminUnlocked(false);
    setPendingCallback(null);
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {}
  }, []);

  const openPasswordModal = useCallback((onSuccessCallback?: () => void) => {
    if (onSuccessCallback) {
      setPendingCallback(() => onSuccessCallback);
    }
    setIsPasswordModalOpen(true);
  }, []);

  const closePasswordModal = useCallback(() => {
    setIsPasswordModalOpen(false);
    setPendingCallback(null);
  }, []);

  /**
   * Guards any enter/edit/erase action:
   * If admin is unlocked, immediately executes actionCallback.
   * If not, prompts for password and runs actionCallback upon successful unlock!
   */
  const requireAdmin = useCallback(
    (actionCallback: () => void) => {
      if (isAdminUnlocked) {
        actionCallback();
      } else {
        openPasswordModal(actionCallback);
      }
    },
    [isAdminUnlocked, openPasswordModal]
  );

  const changeAdminPassword = useCallback(
    (oldPass: string, newPass: string): { success: boolean; error?: string } => {
      const expectedPassword = getStoredAdminPassword();
      if (oldPass !== expectedPassword) {
        return { success: false, error: 'Current password does not match.' };
      }
      if (!newPass || newPass.trim().length < 4) {
        return { success: false, error: 'New password must be at least 4 characters long.' };
      }

      try {
        const db = loadDatabase();
        if (!db.settings) {
          db.settings = {
            farm_name: 'Haji Zafeer Gul Awan Dairy Farm',
            owner_name: 'Haji Zafeer Gul Awan',
            phone: '03181906768',
            address: 'Haji Zafeer Gul Dairy Farm, Katlang Road Mardan',
            currency_symbol: 'Rs.',
            default_unit: 'KG',
          };
        }
        db.settings.admin_password = newPass.trim();
        db.updated_at = new Date().toISOString();
        saveDatabase(db);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to update admin password.' };
      }
    },
    []
  );

  /**
   * ONLY ADMIN is allowed to enter, edit, or erase data.
   */
  const can = useCallback(
    (action: PermissionAction): boolean => {
      // Only unlocked admin can enter, change, or erase data
      if (!isAdmin) {
        // Staff/Viewer can only view reports
        if (action === 'view_financial_report') return true;
        return false;
      }

      // Admin has full privileges
      return true;
    },
    [isAdmin]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAdmin,
        isAdminUnlocked,
        isPasswordModalOpen,
        unlockAdmin,
        lockAdmin,
        openPasswordModal,
        closePasswordModal,
        requireAdmin,
        changeAdminPassword,
        can,
      }}
    >
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
