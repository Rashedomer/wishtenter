import { useState, createContext, useContext, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, X, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const recentRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const dedupeKey = `${type}:${message}`;
    const now = Date.now();
    const lastShown = recentRef.current.get(dedupeKey);
    if (lastShown && now - lastShown < 3000) return;
    recentRef.current.set(dedupeKey, now);

    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              className={`
                flex items-center gap-4 px-6 py-4 rounded-[24px] shadow-2xl border backdrop-blur-md
                ${t.type === "success" ? "bg-green-50/90 border-green-100 text-green-900" : ""}
                ${t.type === "error" ? "bg-red-50/90 border-red-100 text-red-900" : ""}
                ${t.type === "info" ? "bg-blue-50/90 border-blue-100 text-blue-900" : ""}
              `}
            >
              {t.type === "success" && <CheckCircle2 className="text-green-500" size={24} />}
              {t.type === "error" && <XCircle className="text-red-500" size={24} />}
              {t.type === "info" && <Info className="text-blue-500" size={24} />}
              
              <p className="font-bold text-sm tracking-tight">{t.message}</p>
              
              <button 
                onClick={() => removeToast(t.id)}
                className="ml-2 p-1 hover:bg-black/5 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
