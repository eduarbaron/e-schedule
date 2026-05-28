import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './client';

export const useProgramas = () =>
  useQuery({ queryKey: ['programas'], queryFn: () => api.get('/programas').then(r => r.data) });

export const useCreatePrograma = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/programas', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programas'] });
      qc.invalidateQueries({ queryKey: ['sedes'] });
    },
  });
};

export const useUpdatePrograma = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/programas/${id}`, data).then(r => r.data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['programas'] });
      qc.invalidateQueries({ queryKey: ['programas', vars.id, 'sedes'] });
      qc.invalidateQueries({ queryKey: ['sedes'] });
    },
  });
};

export const useTogglePrioridadPrograma = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, es_prioritario }: { id: string; es_prioritario: boolean }) =>
      api.patch(`/programas/${id}/prioridad`, { es_prioritario }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programas'] }),
  });
};

export const useDeletePrograma = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/programas/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programas'] }),
  });
};

export const useFacultades = () =>
  useQuery({ queryKey: ['facultades'], queryFn: () => api.get('/facultades').then(r => r.data) });

export const useCreateFacultad = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/facultades', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['facultades'] }),
  });
};

export const useDeleteFacultad = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/facultades/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['facultades'] }),
  });
};

export const useDepartamentos = () =>
  useQuery({ queryKey: ['departamentos'], queryFn: () => api.get('/departamentos').then(r => r.data) });

export const useCreateDepartamento = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/departamentos', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departamentos'] }),
  });
};

export const useDeleteDepartamento = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/departamentos/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departamentos'] }),
  });
};

export const usePeriodos = () =>
  useQuery({ queryKey: ['periodos'], queryFn: () => api.get('/periodos').then(r => r.data) });

export const usePeriodoActivo = () =>
  useQuery({ queryKey: ['periodos', 'activo'], queryFn: () => api.get('/periodos/activo').then(r => r.data) });

export const useCreatePeriodo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/periodos', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['periodos'] }),
  });
};

export const useActivarPeriodo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/periodos/${id}/activar`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['periodos'] }),
  });
};

export const useUpdatePeriodo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/periodos/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['periodos'] }),
  });
};

export const useDeletePeriodo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/periodos/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['periodos'] }),
  });
};

export const useCelulas = () =>
  useQuery({ queryKey: ['celulas'], queryFn: () => api.get('/celulas').then(r => r.data) });

export const useSedes = () =>
  useQuery({ queryKey: ['sedes'], queryFn: () => api.get('/sedes').then(r => r.data) });

export const useDocentes = () =>
  useQuery({ queryKey: ['docentes'], queryFn: () => api.get('/docentes').then(r => r.data) });

export const useMaterias = () =>
  useQuery({ queryKey: ['materias'], queryFn: () => api.get('/materias').then(r => r.data) });

export const useAsignaciones = (params?: Record<string, string>) =>
  useQuery({
    queryKey: ['asignaciones', params],
    queryFn: () => api.get('/asignaciones', { params }).then(r => r.data),
  });

export const useClases = (params?: Record<string, string>) =>
  useQuery({
    queryKey: ['clases', params],
    queryFn: () => api.get('/clases', { params }).then(r => r.data),
  });

export const useClaseTemplates = (programaId?: string) =>
  useQuery({
    queryKey: ['clases', 'templates', programaId],
    queryFn: () => api.get('/clases/templates', { params: programaId ? { programa_id: programaId } : {} }).then(r => r.data),
  });

export const useProyeccionesClases = (params?: Record<string, string>) =>
  useQuery({
    queryKey: ['proyecciones-clases', params],
    queryFn: () => api.get('/proyecciones-clases', { params }).then(r => r.data),
  });

export const useGenerateProyeccionesClases = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/proyecciones-clases/generar', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proyecciones-clases'] }),
  });
};

export const useDeleteProyeccionClase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/proyecciones-clases/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proyecciones-clases'] }),
  });
};

export const useBulkDeleteProyeccionesClases = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Record<string, string>) => api.delete('/proyecciones-clases/bulk', { params }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proyecciones-clases'] }),
  });
};

export const useCreateClaseTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/clases/templates', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clases', 'templates'] }),
  });
};

export const useUpdateClaseTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/clases/templates/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clases', 'templates'] }),
  });
};

export const useDeleteClaseTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/clases/templates/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clases', 'templates'] }),
  });
};

export const useCreateClase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/clases', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clases'] }),
  });
};

export const useGenerateClases = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/clases/generar', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clases'] });
      qc.invalidateQueries({ queryKey: ['asignaciones'] });
      qc.invalidateQueries({ queryKey: ['docentes'] });
    },
  });
};

export const useBulkDeleteClases = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Record<string, string>) => api.delete('/clases/bulk', { params }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clases'] });
      qc.invalidateQueries({ queryKey: ['asignaciones'] });
      qc.invalidateQueries({ queryKey: ['docentes'] });
    },
  });
};

export const useUpdateClase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/clases/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clases'] }),
  });
};

export const useDeleteClase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/clases/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clases'] }),
  });
};

export const useDocente = (id: string) =>
  useQuery({
    queryKey: ['docentes', id],
    queryFn: () => api.get(`/docentes/${id}`).then(r => r.data),
    enabled: !!id,
  });

export const useDocenteAsignaciones = (id: string, periodo?: string) =>
  useQuery({
    queryKey: ['docentes', id, 'asignaciones', periodo],
    queryFn: () => api.get(`/docentes/${id}/asignaciones`, { params: periodo ? { periodo } : {} }).then(r => r.data),
    enabled: !!id,
  });

export const useDocenteDisponibilidad = (id: string) =>
  useQuery({
    queryKey: ['docentes', id, 'disponibilidad'],
    queryFn: () => api.get(`/docentes/${id}/disponibilidad`).then(r => r.data),
    enabled: !!id,
  });

export const useCreateDocente = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/docentes', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docentes'] }),
  });
};

export const useUpdateDocente = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/docentes/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docentes'] }),
  });
};

export const useDeleteDocente = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/docentes/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docentes'] }),
  });
};

export const useToggleModoLibre = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/docentes/${id}/modo-libre`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docentes'] }),
  });
};

export const useSedesProgramas = (sedeId: string) =>
  useQuery({
    queryKey: ['sedes', sedeId, 'programas'],
    queryFn: () => api.get(`/sedes/${sedeId}/programas`).then(r => r.data),
    enabled: !!sedeId,
  });

export const useProgramaSedes = (programaId: string) =>
  useQuery({
    queryKey: ['programas', programaId, 'sedes'],
    queryFn: () => api.get(`/programas/${programaId}/sedes`).then(r => r.data),
    enabled: !!programaId,
  });

export const useSetProgramaSedes = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programaId, sede_ids }: { programaId: string; sede_ids: string[] }) =>
      api.put(`/programas/${programaId}/sedes`, { sede_ids }).then(r => r.data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['programas', vars.programaId, 'sedes'] });
      qc.invalidateQueries({ queryKey: ['sedes'] });
    },
  });
};

export const useAddSedePrograma = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sedeId, programa_id }: { sedeId: string; programa_id: string }) =>
      api.post(`/sedes/${sedeId}/programas`, { programa_id }).then(r => r.data),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['sedes', vars.sedeId, 'programas'] }),
  });
};

export const useRemoveSedePrograma = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sedeId, programaId }: { sedeId: string; programaId: string }) =>
      api.delete(`/sedes/${sedeId}/programas/${programaId}`).then(r => r.data),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['sedes', vars.sedeId, 'programas'] }),
  });
};

export const useCreateSede = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/sedes', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sedes'] }),
  });
};

export const useUpdateSede = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: any }) =>
      api.put(`/sedes/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sedes'] }),
  });
};

export const useDeleteSede = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/sedes/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sedes'] }),
  });
};

export const useCreateCelula = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/celulas', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['celulas'] }),
  });
};

export const useUpdateCelula = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: any }) =>
      api.put(`/celulas/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['celulas'] }),
  });
};

export const useCreateMateria = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/materias', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materias'] }),
  });
};

export const useUpdateMateria = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: any }) =>
      api.put(`/materias/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materias'] }),
  });
};

export const useDeleteMateria = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/materias/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materias'] }),
  });
};

export const useCreateAsignacion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/asignaciones', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asignaciones'] });
      qc.invalidateQueries({ queryKey: ['docentes'] });
    },
  });
};

export const useAutoAsignacion = () =>
  useMutation({
    mutationFn: (data: any) => api.post('/asignaciones/auto', data).then(r => r.data),
  });

export const useAutoBulkDraft = () =>
  useMutation({
    mutationFn: (data: { periodo: string; programa_id?: string }) =>
      api.post('/asignaciones/auto-bulk', data).then(r => r.data),
  });

export const useRevertirPrograma = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programa_id, periodo }: { programa_id: string; periodo: string }) =>
      api.delete(`/asignaciones/revertir-programa?programa_id=${programa_id}&periodo=${periodo}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asignaciones'] }),
  });
};

export const useConfirmBulk = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (asignaciones: any[]) =>
      api.post('/asignaciones/bulk', asignaciones).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asignaciones'] });
      qc.invalidateQueries({ queryKey: ['docentes'] });
    },
  });
};

export const useDeleteAsignacion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/asignaciones/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asignaciones'] });
      qc.invalidateQueries({ queryKey: ['docentes'] });
    },
  });
};

export const useBulkDeleteAsignaciones = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Record<string, string>) => api.delete('/asignaciones/bulk', { params }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asignaciones'] });
      qc.invalidateQueries({ queryKey: ['docentes'] });
      qc.invalidateQueries({ queryKey: ['clases'] });
    },
  });
};

export const useAddDisponibilidad = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docenteId, ...data }: any) =>
      api.post(`/docentes/${docenteId}/disponibilidad`, data).then(r => r.data),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['docentes', vars.docenteId, 'disponibilidad'] }),
  });
};

export const useDeleteDisponibilidad = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docenteId, dispId }: { docenteId: string; dispId: string }) =>
      api.delete(`/docentes/${docenteId}/disponibilidad/${dispId}`).then(r => r.data),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['docentes', vars.docenteId, 'disponibilidad'] }),
  });
};

export const useDevPilotStatus = () =>
  useQuery({
    queryKey: ['dev', 'piloto', 'estado'],
    queryFn: () => api.get('/dev/piloto/estado').then(r => r.data),
  });

export const useDevPopulatePilot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/dev/piloto/poblar').then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dev', 'piloto', 'estado'] });
      qc.invalidateQueries({ queryKey: ['docentes'] });
      qc.invalidateQueries({ queryKey: ['clases'] });
    },
  });
};

export const useDevPopulatePilotTeachers = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/dev/piloto/docentes').then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dev', 'piloto', 'estado'] });
      qc.invalidateQueries({ queryKey: ['docentes'] });
      qc.invalidateQueries({ queryKey: ['asignaciones'] });
    },
  });
};

export const useDevPopulatePilotClasses = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/dev/piloto/clases').then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dev', 'piloto', 'estado'] });
      qc.invalidateQueries({ queryKey: ['clases'] });
      qc.invalidateQueries({ queryKey: ['asignaciones'] });
    },
  });
};

export const useDevClearPilotData = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/dev/piloto/poblado').then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dev', 'piloto', 'estado'] });
      qc.invalidateQueries({ queryKey: ['docentes'] });
      qc.invalidateQueries({ queryKey: ['clases'] });
      qc.invalidateQueries({ queryKey: ['asignaciones'] });
    },
  });
};

export const useDevClearPilotTeachers = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/dev/piloto/docentes').then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dev', 'piloto', 'estado'] });
      qc.invalidateQueries({ queryKey: ['docentes'] });
      qc.invalidateQueries({ queryKey: ['asignaciones'] });
    },
  });
};

export const useDevClearPilotClasses = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/dev/piloto/clases').then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dev', 'piloto', 'estado'] });
      qc.invalidateQueries({ queryKey: ['clases'] });
      qc.invalidateQueries({ queryKey: ['asignaciones'] });
    },
  });
};

export const useDevClearPilotAssignments = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/dev/piloto/asignaciones').then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dev', 'piloto', 'estado'] });
      qc.invalidateQueries({ queryKey: ['docentes'] });
      qc.invalidateQueries({ queryKey: ['asignaciones'] });
    },
  });
};
