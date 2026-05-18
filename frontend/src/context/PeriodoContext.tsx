import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { usePeriodos } from '../api/hooks';
import type { Periodo } from '../types';

type PeriodoContextValue = {
  periodoId: string;
  periodoActivo?: Periodo;
  periodoSeleccionado?: Periodo;
  periodos: Periodo[];
  isLoading: boolean;
  setPeriodoId: (periodoId: string) => void;
};

const PeriodoContext = createContext<PeriodoContextValue | null>(null);

export function PeriodoProvider({ children }: { children: ReactNode }) {
  const { data = [], isLoading } = usePeriodos();
  const periodos = data as Periodo[];
  const periodoActivo = periodos.find(p => p.activo === 1);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState('');
  const periodoId = selectedPeriodoId || periodoActivo?.id || '';
  const periodoSeleccionado = periodos.find(p => p.id === periodoId);

  const value = useMemo(() => ({
    periodoId,
    periodoActivo,
    periodoSeleccionado,
    periodos,
    isLoading,
    setPeriodoId: setSelectedPeriodoId,
  }), [periodoId, periodoActivo, periodoSeleccionado, periodos, isLoading]);

  return (
    <PeriodoContext.Provider value={value}>
      {children}
    </PeriodoContext.Provider>
  );
}

export function usePeriodoTrabajo() {
  const context = useContext(PeriodoContext);
  if (!context) {
    throw new Error('usePeriodoTrabajo debe usarse dentro de PeriodoProvider');
  }
  return context;
}
