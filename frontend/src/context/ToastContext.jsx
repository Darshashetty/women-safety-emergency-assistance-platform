import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import ToastViewport from '../components/ToastViewport';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timeoutMap = useRef(new Map());

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));

    const timeoutId = timeoutMap.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutMap.current.delete(id);
    }
  }, []);

  const pushToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextToast = {
      id,
      variant: 'info',
      ...toast,
    };

    setToasts((current) => [nextToast, ...current].slice(0, 4));

    const timeoutId = setTimeout(() => {
      dismissToast(id);
    }, toast.duration || 3500);

    timeoutMap.current.set(id, timeoutId);
    return id;
  }, [dismissToast]);

  useEffect(() => () => {
    timeoutMap.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutMap.current.clear();
  }, []);

  const value = useMemo(() => ({
    toasts,
    dismissToast,
    toast: pushToast,
    success: (title, description) => pushToast({ title, description, variant: 'success' }),
    error: (title, description) => pushToast({ title, description, variant: 'error' }),
    warning: (title, description) => pushToast({ title, description, variant: 'warning' }),
    info: (title, description) => pushToast({ title, description, variant: 'info' }),
  }), [dismissToast, pushToast, toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
