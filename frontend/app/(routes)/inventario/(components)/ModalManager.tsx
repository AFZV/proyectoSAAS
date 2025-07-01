// app/(routes)/inventario/(components)/ModalManager.tsx
"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { InventarioDetalleModal } from "./ListInventario/InventarioDetalleModal";
import { AjusteManualModal } from "./ListInventario/AjusteManualModal";

// Tipos
export type ProductoInventario = {
  id: string;
  nombre: string;
  precioCompra: number;
  fechaCreado: string;
  inventario: { stockReferenciaOinicial: number; stockActual?: number }[];
};

type ModalState = {
  type: 'cardex' | 'ajuste' | null;
  producto: ProductoInventario | null;
  isOpen: boolean;
};

interface ModalManagerContextType {
  modalState: ModalState;
  openCardex: (producto: ProductoInventario) => void;
  openAjuste: (producto: ProductoInventario) => void;
  closeModal: () => void;
  isModalOpen: boolean;
}

const ModalManagerContext = createContext<ModalManagerContextType | null>(null);

export function ModalManager({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<ModalState>({
    type: null,
    producto: null,
    isOpen: false,
  });
  
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Cleanup timeout en unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const closeModal = useCallback(() => {
    setModalState({
      type: null,
      producto: null,
      isOpen: false,
    });
  }, []);

  const openCardex = useCallback((producto: ProductoInventario) => {
    // Si hay un modal abierto, cerrarlo primero
    if (modalState.isOpen) {
      setModalState({ type: null, producto: null, isOpen: false });
      
      // Esperar a que se cierre completamente antes de abrir el nuevo
      timeoutRef.current = setTimeout(() => {
        setModalState({
          type: 'cardex',
          producto,
          isOpen: true,
        });
      }, 100);
    } else {
      setModalState({
        type: 'cardex',
        producto,
        isOpen: true,
      });
    }
  }, [modalState.isOpen]);

  const openAjuste = useCallback((producto: ProductoInventario) => {
    // Si hay un modal abierto, cerrarlo primero
    if (modalState.isOpen) {
      setModalState({ type: null, producto: null, isOpen: false });
      
      // Esperar a que se cierre completamente antes de abrir el nuevo
      timeoutRef.current = setTimeout(() => {
        setModalState({
          type: 'ajuste',
          producto,
          isOpen: true,
        });
      }, 100);
    } else {
      setModalState({
        type: 'ajuste',
        producto,
        isOpen: true,
      });
    }
  }, [modalState.isOpen]);

  const handleAjusteClose = useCallback(() => {
    closeModal();
    // Refresh solo después de ajustes, no de cardex
    timeoutRef.current = setTimeout(() => {
      router.refresh();
    }, 150);
  }, [closeModal, router]);

  const contextValue: ModalManagerContextType = {
    modalState,
    openCardex,
    openAjuste,
    closeModal,
    isModalOpen: modalState.isOpen,
  };

  return (
    <ModalManagerContext.Provider value={contextValue}>
      {children}
      
      {/* Portal único para todos los modales - Solo renderizar cuando esté abierto */}
      {modalState.isOpen && modalState.producto && (
        <>
          {modalState.type === 'cardex' && (
            <InventarioDetalleModal
              open={true}
              onClose={closeModal}
              producto={modalState.producto}
            />
          )}
          
          {modalState.type === 'ajuste' && (
            <AjusteManualModal
              open={true}
              onClose={handleAjusteClose}
              producto={modalState.producto}
            />
          )}
        </>
      )}
    </ModalManagerContext.Provider>
  );
}

export const useModalManager = () => {
  const context = useContext(ModalManagerContext);
  if (!context) {
    throw new Error('useModalManager must be used within a ModalManager');
  }
  return context;
};