import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Menu,
  Modal,
  MultiSelect,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { CalendarDays, CalendarPlus, Clock3, FileSpreadsheet, Info, Settings2, Trash2, Wand2 } from 'lucide-react';
import {
  useClases,
  useCreateClase,
  useDeleteClase,
  useBulkDeleteClases,
  useClaseTemplates,
  useCreateClaseTemplate,
  useDeleteClaseTemplate,
  useGenerateClases,
  useMaterias,
  useProgramaSedes,
  useProgramas,
  useSedes,
  useUpdateClaseTemplate,
} from '../api/hooks';
import api from '../api/client';
import type { ClaseAcademica, ClaseTemplate, Materia, Programa, Sede } from '../types';
import { DIA_LABELS } from '../types';
import { useConfirm } from '../components/ConfirmProvider';
import { usePeriodoTrabajo } from '../context/PeriodoContext';
import { exportHorarioProgramaExcel } from '../utils/horarioExcelExport';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S'];
const HORAS = Array.from({ length: 17 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`);
const DIA_OPTIONS = DIAS.map(d => ({ value: d, label: d }));
const SEMANA_OPTIONS = [
  { value: 'A', label: 'Semana A' },
  { value: 'B', label: 'Semana B' },
];

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatDuration = (inicio: string, fin: string) => {
  const minutes = Math.max(0, toMinutes(fin) - toMinutes(inicio));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
};

type GrupoForm = {
  grupo: number;
  calendario: 'A' | 'B' | 'semanal';
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
};

const semestreOptionsForPrograma = (programa?: Programa | null) => {
  const total = Math.max(1, Math.min(10, Number(programa?.numero_semestres ?? 10)));
  return Array.from({ length: total }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}° semestre`,
  }));
};

type JornadaForm = {
  hora_inicio: string;
  hora_fin: string;
};

export function Clases() {
  const confirm = useConfirm();
  const { periodoId: periodoFinal, periodoSeleccionado } = usePeriodoTrabajo();
  const [programaFiltro, setProgramaFiltro] = useState('');
  const [sedeFiltro, setSedeFiltro] = useState('');
  const [semestreFiltro, setSemestreFiltro] = useState('');

  const { data: clases = [], isLoading } = useClases({
    ...(periodoFinal ? { periodo: periodoFinal } : {}),
    ...(programaFiltro ? { programa_id: programaFiltro } : {}),
    ...(sedeFiltro ? { sede_id: sedeFiltro } : {}),
    ...(semestreFiltro ? { semestre: semestreFiltro } : {}),
  });
  const { data: programas = [] } = useProgramas();
  const { data: materias = [] } = useMaterias();
  const { data: sedes = [] } = useSedes();
  const createClase = useCreateClase();
  const deleteClase = useDeleteClase();
  const generateClases = useGenerateClases();
  const bulkDeleteClases = useBulkDeleteClases();
  const [opened, { open, close }] = useDisclosure(false);
  const [generatorOpened, { open: openGenerator, close: closeGenerator }] = useDisclosure(false);
  const [templateOpened, { open: openTemplate, close: closeTemplate }] = useDisclosure(false);
  const [exporting, setExporting] = useState<'proyeccion' | 'asignaciones' | null>(null);

  const [form, setForm] = useState({
    programa_id: '',
    semestre: '',
    materia_id: '',
    sede_ids: [] as string[],
    grupos: [
      { grupo: 1, calendario: 'A' as const, dia_semana: 'L', hora_inicio: '07:00', hora_fin: '09:00' },
    ] as GrupoForm[],
  });
  const [generatorForm, setGeneratorForm] = useState({
    programa_id: '',
    sede_ids: [] as string[],
    template_por_sede: {} as Record<string, string>,
    semestres_por_sede: {} as Record<string, string[]>,
    grupos_por_semestre: 2,
    dias_semana: ['S'] as string[],
    jornadas: [
      { hora_inicio: '07:00', hora_fin: '13:00' },
      { hora_inicio: '14:00', hora_fin: '17:00' },
    ] as JornadaForm[],
    reemplazar_existentes: false,
  });

  const { data: sedesProgramaGenerador = [] } = useProgramaSedes(generatorForm.programa_id);
  const { data: claseTemplates = [] } = useClaseTemplates(generatorForm.programa_id);
  const createTemplate = useCreateClaseTemplate();
  const updateTemplate = useUpdateClaseTemplate();
  const deleteTemplate = useDeleteClaseTemplate();
  const claseTemplatesList = Array.isArray(claseTemplates) ? claseTemplates as ClaseTemplate[] : [];
  const [templateForm, setTemplateForm] = useState({
    id: '',
    nombre: '',
    programa_id: '',
    dias_semana: ['S'] as string[],
    jornadas: [
      { hora_inicio: '07:00', hora_fin: '13:00' },
      { hora_inicio: '14:00', hora_fin: '17:00' },
    ] as JornadaForm[],
    semestres: [
      { semestre: 1, grupos: 1 },
    ] as { semestre: number; grupos: number }[],
  });

  const materiasDelPrograma = useMemo(
    () => (materias as Materia[]).filter(m => !form.programa_id || m.programa_id === form.programa_id),
    [materias, form.programa_id]
  );

  const programaDelForm = useMemo(
    () => (programas as Programa[]).find(p => p.id === form.programa_id),
    [programas, form.programa_id]
  );

  const programaGenerador = useMemo(
    () => (programas as Programa[]).find(p => p.id === generatorForm.programa_id),
    [programas, generatorForm.programa_id]
  );

  const materiasProgramaGenerador = useMemo(
    () => (materias as Materia[]).filter(m => m.programa_id === generatorForm.programa_id),
    [materias, generatorForm.programa_id]
  );

  const semestresGenerador = useMemo(() => {
    const semestres = [...new Set(materiasProgramaGenerador.map(m => m.semestre).filter((sem): sem is number => sem != null))]
      .sort((a, b) => a - b);
    return semestres.map(sem => ({ value: String(sem), label: `${sem}° semestre` }));
  }, [materiasProgramaGenerador]);

  const sedesGenerador = useMemo(
    () => ((sedesProgramaGenerador as Sede[]).length > 0 ? sedesProgramaGenerador : sedes) as Sede[],
    [sedesProgramaGenerador, sedes]
  );

  const sedesSeleccionadasGenerador = useMemo(
    () => sedesGenerador.filter(s => generatorForm.sede_ids.includes(s.id)),
    [sedesGenerador, generatorForm.sede_ids]
  );

  const templateOptions = useMemo(
    () => claseTemplatesList.map(template => ({
      value: template.id,
      label: template.programa_id ? template.nombre : `${template.nombre} (global)`,
    })),
    [claseTemplatesList]
  );

  const templatesById = useMemo(
    () => new Map(claseTemplatesList.map(template => [template.id, template])),
    [claseTemplatesList]
  );
  const programaTemplateForm = useMemo(
    () => (programas as Programa[]).find(p => p.id === templateForm.programa_id),
    [programas, templateForm.programa_id]
  );
  const semestreOptionsTemplate = useMemo(
    () => semestreOptionsForPrograma(programaTemplateForm),
    [programaTemplateForm]
  );

  const esQuincenal = programaDelForm?.tipo_ciclo === 'quincenal';
  const calendarioDerivado = esQuincenal ? 'Semana por grupo' : 'A + B';
  const tipoCicloLabel = programaDelForm?.tipo_ciclo === 'quincenal' ? 'Quincenal' : 'Semanal';

  const semestresDisponibles = useMemo(() => {
    const semestres = [...new Set(materiasDelPrograma.map(m => m.semestre).filter((sem): sem is number => sem != null))]
      .sort((a, b) => a - b);
    return semestres.map(sem => ({ value: String(sem), label: `${sem}° semestre` }));
  }, [materiasDelPrograma]);

  const semestresFiltroDisponibles = useMemo(() => {
    const materiasBase = (materias as Materia[]).filter(m => !programaFiltro || m.programa_id === programaFiltro);
    const semestres = [...new Set(materiasBase.map(m => m.semestre).filter((sem): sem is number => sem != null))]
      .sort((a, b) => a - b);
    return semestres.map(sem => ({ value: String(sem), label: `${sem}° semestre` }));
  }, [materias, programaFiltro]);

  const materiasFiltradas = useMemo(
    () => materiasDelPrograma.filter(m => !form.semestre || m.semestre === Number(form.semestre)),
    [materiasDelPrograma, form.semestre]
  );

  const clasesFiltradas = clases as ClaseAcademica[];
  const resumenClases = useMemo(() => {
    const sedesSet = new Set<string>();
    const semestresSet = new Set<number>();
    const gruposSet = new Set<string>();
    const asignadas = clasesFiltradas.filter(clase => clase.estado === 'asignada').length;

    clasesFiltradas.forEach(clase => {
      sedesSet.add(clase.sede_id);
      if (clase.semestre) semestresSet.add(clase.semestre);
      gruposSet.add(`${clase.sede_id}|${clase.semestre ?? 'na'}|${clase.grupo}`);
    });

    return {
      total: clasesFiltradas.length,
      sedes: sedesSet.size,
      semestres: [...semestresSet].sort((a, b) => a - b),
      grupos: gruposSet.size,
      asignadas,
      pendientes: clasesFiltradas.filter(clase => clase.estado === 'pendiente').length,
    };
  }, [clasesFiltradas]);

  const totalAcrear = form.sede_ids.length * form.grupos.length;

  const setGrupo = (index: number, patch: Partial<GrupoForm>) => {
    setForm(f => ({
      ...f,
      grupos: f.grupos.map((grupo, idx) => idx === index ? { ...grupo, ...patch } : grupo),
    }));
  };

  const setCantidadGrupos = (cantidad: number) => {
    const nextCantidad = Math.max(1, Math.min(20, cantidad || 1));
    setForm(f => {
      const grupos = [...f.grupos];
      while (grupos.length < nextCantidad) {
        const last = grupos[grupos.length - 1];
        grupos.push({
          grupo: grupos.length + 1,
          calendario: last?.calendario === 'B' ? 'B' : 'A',
          dia_semana: last?.dia_semana ?? 'L',
          hora_inicio: last?.hora_inicio ?? '07:00',
          hora_fin: last?.hora_fin ?? '09:00',
        });
      }
      return {
        ...f,
        grupos: grupos.slice(0, nextCantidad).map((grupo, idx) => ({ ...grupo, grupo: idx + 1 })),
      };
    });
  };



  const setSemestresSede = (sedeId: string, semestres: string[]) => {
    setGeneratorForm(f => ({
      ...f,
      semestres_por_sede: { ...f.semestres_por_sede, [sedeId]: semestres },
    }));
  };

  const setTemplateSede = (sedeId: string, templateId: string) => {
    setGeneratorForm(f => ({
      ...f,
      template_por_sede: { ...f.template_por_sede, [sedeId]: templateId },
    }));
  };

  const applyTemplateToAll = (templateId: string) => {
    setGeneratorForm(f => ({
      ...f,
      template_por_sede: Object.fromEntries(f.sede_ids.map(sedeId => [sedeId, templateId])),
    }));
  };

  const openCreateTemplate = () => {
    setTemplateForm({
      id: '',
      nombre: '',
      programa_id: generatorForm.programa_id,
      dias_semana: generatorForm.dias_semana,
      jornadas: generatorForm.jornadas,
      semestres: semestresGenerador.slice(0, 1).map(s => ({ semestre: Number(s.value), grupos: generatorForm.grupos_por_semestre })),
    });
    openTemplate();
  };

  const openEditTemplate = (template: ClaseTemplate) => {
    setTemplateForm({
      id: template.id,
      nombre: template.nombre,
      programa_id: template.programa_id ?? '',
      dias_semana: template.dias_semana?.length ? template.dias_semana : ['S'],
      jornadas: template.jornadas.length > 0 ? template.jornadas : generatorForm.jornadas,
      semestres: template.semestres.length > 0 ? template.semestres : [{ semestre: 1, grupos: 1 }],
    });
    openTemplate();
  };

  const setTemplateJornada = (index: number, patch: Partial<JornadaForm>) => {
    setTemplateForm(f => ({
      ...f,
      jornadas: f.jornadas.map((jornada, idx) => idx === index ? { ...jornada, ...patch } : jornada),
    }));
  };

  const setTemplateSemestre = (index: number, patch: Partial<{ semestre: number; grupos: number }>) => {
    setTemplateForm(f => ({
      ...f,
      semestres: f.semestres.map((semestre, idx) => idx === index ? { ...semestre, ...patch } : semestre),
    }));
  };

  const handleCreate = async () => {
    if (!periodoFinal || !form.programa_id || !form.materia_id || form.sede_ids.length === 0) {
      notifications.show({ message: 'Periodo, programa, materia y al menos una sede son requeridos', color: 'red' });
      return;
    }
    if (form.grupos.some(grupo => grupo.hora_inicio >= grupo.hora_fin)) {
      notifications.show({ message: 'Cada grupo debe tener hora inicio menor que hora fin', color: 'red' });
      return;
    }

    try {
      await Promise.all(
        form.sede_ids.flatMap(sede_id =>
          form.grupos.map(grupo =>
            createClase.mutateAsync({
              periodo: periodoFinal,
              programa_id: form.programa_id,
              materia_id: form.materia_id,
              sede_id,
              ...grupo,
              calendario: esQuincenal ? grupo.calendario : 'semanal',
            })
          )
        )
      );
      notifications.show({ message: `${totalAcrear} clase(s) creada(s)`, color: 'green' });
      close();
      setForm(f => ({
        ...f,
        materia_id: '',
        sede_ids: [],
        grupos: [{ grupo: 1, calendario: 'A', dia_semana: 'L', hora_inicio: '07:00', hora_fin: '09:00' }],
      }));
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al crear clases', color: 'red' });
    }
  };

  const handleGenerate = async () => {
    if (!periodoFinal || !generatorForm.programa_id || generatorForm.sede_ids.length === 0) {
      notifications.show({ message: 'Periodo, programa y al menos una sede son requeridos', color: 'red' });
      return;
    }
    const sedesSinTemplate = generatorForm.sede_ids.filter(sedeId => !generatorForm.template_por_sede[sedeId]);
    if (sedesSinTemplate.length > 0) {
      notifications.show({ message: 'Selecciona una plantilla para cada sede', color: 'red' });
      return;
    }
    if (generatorForm.jornadas.some(j => !j.hora_inicio || !j.hora_fin || j.hora_inicio >= j.hora_fin)) {
      notifications.show({ message: 'Cada jornada debe tener hora inicio menor que hora fin', color: 'red' });
      return;
    }
    if (generatorForm.reemplazar_existentes) {
      const confirmed = await confirm({
        title: 'Reemplazar clases existentes',
        message: 'Esta accion borrara clases existentes del programa en las sedes seleccionadas y tambien sus asignaciones asociadas. Esta operacion no se puede deshacer.',
        confirmLabel: 'Reemplazar y borrar',
        color: 'red',
      });
      if (!confirmed) return;
    }

    const semestresPorSede = Object.fromEntries(
      generatorForm.sede_ids.map(sedeId => [
        sedeId,
        (generatorForm.semestres_por_sede[sedeId]?.length ? generatorForm.semestres_por_sede[sedeId] : semestresGenerador.map(s => s.value))
          .map(Number),
      ])
    );

    try {
      const res = await generateClases.mutateAsync({
        periodo: periodoFinal,
        programa_id: generatorForm.programa_id,
        sede_ids: generatorForm.sede_ids,
        sede_templates: generatorForm.sede_ids.map(sedeId => ({
          sede_id: sedeId,
          template_id: generatorForm.template_por_sede[sedeId],
        })),
        semestres_por_sede: semestresPorSede,
        grupos_por_semestre: generatorForm.grupos_por_semestre,
        dias_semana: generatorForm.dias_semana,
        jornadas: generatorForm.jornadas,
        reemplazar_existentes: generatorForm.reemplazar_existentes,
      });
      notifications.show({ message: `${res.clases_creadas} clase(s) generada(s)`, color: 'green' });
      closeGenerator();
    } catch (e: any) {
      const detalles = e.response?.data?.detalles?.[0] ? ` ${e.response.data.detalles[0]}` : '';
      notifications.show({ message: `${e.response?.data?.error || 'Error al generar clases'}${detalles}`, color: 'red' });
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.nombre.trim()) {
      notifications.show({ message: 'El nombre de la plantilla es requerido', color: 'red' });
      return;
    }
    if (templateForm.dias_semana.length === 0) {
      notifications.show({ message: 'Selecciona al menos un dia de clase', color: 'red' });
      return;
    }
    if (templateForm.jornadas.some(j => !j.hora_inicio || !j.hora_fin || j.hora_inicio >= j.hora_fin)) {
      notifications.show({ message: 'Cada jornada debe tener hora inicio menor que hora fin', color: 'red' });
      return;
    }
    if (templateForm.semestres.length === 0 || templateForm.semestres.some(s => !s.semestre || s.grupos < 1)) {
      notifications.show({ message: 'Define al menos un semestre con grupos', color: 'red' });
      return;
    }
    const maxSemestre = Number(programaTemplateForm?.numero_semestres ?? 10);
    if (templateForm.semestres.some(s => s.semestre > maxSemestre)) {
      notifications.show({ message: `Este programa solo tiene ${maxSemestre} semestre(s)`, color: 'red' });
      return;
    }

    try {
      const payload = {
        nombre: templateForm.nombre.trim(),
        programa_id: templateForm.programa_id || null,
        dias_semana: templateForm.dias_semana,
        jornadas: templateForm.jornadas,
        semestres: templateForm.semestres,
      };
      if (templateForm.id) {
        await updateTemplate.mutateAsync({ id: templateForm.id, ...payload });
        notifications.show({ message: 'Plantilla actualizada', color: 'green' });
      } else {
        await createTemplate.mutateAsync(payload);
        notifications.show({ message: 'Plantilla creada', color: 'green' });
      }
      closeTemplate();
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al guardar plantilla', color: 'red' });
    }
  };

  const handleDeleteTemplate = async (template: ClaseTemplate) => {
    if (!(await confirm({
      title: 'Eliminar plantilla',
      message: `Eliminar la plantilla "${template.nombre}". Las clases ya generadas no se eliminan.`,
      confirmLabel: 'Eliminar',
      color: 'red',
    }))) return;
    try {
      await deleteTemplate.mutateAsync(template.id);
      setGeneratorForm(f => ({
        ...f,
        template_por_sede: Object.fromEntries(Object.entries(f.template_por_sede).filter(([, id]) => id !== template.id)),
      }));
      notifications.show({ message: 'Plantilla eliminada', color: 'orange' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al eliminar plantilla', color: 'red' });
    }
  };

  const handleBulkDelete = async () => {
    if (!periodoFinal) {
      notifications.show({ message: 'Selecciona un periodo de trabajo', color: 'red' });
      return;
    }
    if (!(await confirm({
      title: 'Borrar clases filtradas',
      message: 'Se eliminarán las clases que coincidan con los filtros actuales y también sus asignaciones asociadas.',
      confirmLabel: 'Borrar clases',
      color: 'red',
    }))) return;

    try {
      const params: Record<string, string> = { periodo: periodoFinal };
      if (programaFiltro) params.programa_id = programaFiltro;
      if (sedeFiltro) params.sede_id = sedeFiltro;
      if (semestreFiltro) params.semestre = semestreFiltro;
      const res = await bulkDeleteClases.mutateAsync(params);
      notifications.show({
        message: `${res.clases_eliminadas ?? 0} clase(s) y ${res.asignaciones_eliminadas ?? 0} asignación(es) eliminadas`,
        color: 'orange',
      });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al borrar clases', color: 'red' });
    }
  };

  const handleExportExcel = async (mode: 'proyeccion' | 'asignaciones') => {
    if (!periodoFinal) {
      notifications.show({ message: 'Selecciona un periodo de trabajo', color: 'red' });
      return;
    }
    if (!programaFiltro) {
      notifications.show({ message: 'Selecciona un programa para exportar el Excel', color: 'orange' });
      return;
    }
    const programa = (programas as Programa[]).find(p => p.id === programaFiltro);
    if (!programa) {
      notifications.show({ message: 'Programa no encontrado', color: 'red' });
      return;
    }

    setExporting(mode);
    try {
      const [clasesRes, asignacionesRes] = await Promise.all([
        api.get('/clases', { params: { periodo: periodoFinal, programa_id: programaFiltro } }),
        mode === 'asignaciones'
          ? api.get('/asignaciones', { params: { periodo: periodoFinal } })
          : Promise.resolve({ data: [] }),
      ]);
      const clasesPrograma = clasesRes.data as ClaseAcademica[];
      if (clasesPrograma.length === 0) {
        notifications.show({ message: 'No hay clases para exportar con ese programa y periodo', color: 'orange' });
        return;
      }

      await exportHorarioProgramaExcel({
        clases: clasesPrograma,
        asignaciones: asignacionesRes.data,
        materias: materias as Materia[],
        programa,
        periodoNombre: periodoSeleccionado?.nombre ?? periodoFinal,
        mode,
      });
      notifications.show({
        message: mode === 'proyeccion' ? 'Excel de proyeccion generado' : 'Excel con asignaciones generado',
        color: 'green',
      });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al exportar Excel', color: 'red' });
    } finally {
      setExporting(null);
    }
  };

  const handleDelete = async (clase: ClaseAcademica) => {
    if (!(await confirm({
      title: 'Eliminar clase',
      message: `¿Eliminar la clase de "${clase.materia_nombre}"?`,
      confirmLabel: 'Eliminar',
    }))) return;
    try {
      await deleteClase.mutateAsync(clase.id);
      notifications.show({ message: 'Clase eliminada', color: 'orange' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al eliminar clase', color: 'red' });
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Clases</Title>
          <Text size="sm" c="dimmed">Oferta académica parametrizada antes de asignar docentes</Text>
        </div>
        <Group gap="xs">
          <Menu shadow="md" width={250}>
            <Menu.Target>
              <Button
                leftSection={<FileSpreadsheet size={16} />}
                variant="light"
                color="success"
                loading={exporting !== null}
              >
                Exportar Excel
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Formato institucional</Menu.Label>
              <Menu.Item leftSection={<FileSpreadsheet size={14} />} onClick={() => handleExportExcel('proyeccion')}>
                Proyeccion horaria
              </Menu.Item>
              <Menu.Item leftSection={<FileSpreadsheet size={14} />} onClick={() => handleExportExcel('asignaciones')}>
                Horario con asignaciones
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <Button leftSection={<Wand2 size={16} />} color="brand" onClick={openGenerator}>
            Generar clases
          </Button>
          <Button
            leftSection={<Trash2 size={16} />}
            variant="light"
            color="red"
            onClick={handleBulkDelete}
            loading={bulkDeleteClases.isPending}
          >
            Borrar filtradas
          </Button>
          <Button leftSection={<CalendarPlus size={16} />} variant="light" color="brand" onClick={open}>
            Nueva clase
          </Button>
        </Group>
      </Group>

      <Alert icon={<Info size={16} />} color="brand" title="Nuevo flujo de asignación">
        Define aquí las clases con sus sedes, grupos y horarios. La asignación masiva usará estas clases como demanda
        y buscará docentes compatibles para cubrirlas.
      </Alert>

      <Paper p="md" radius="md" withBorder>
        <Group grow>
          <Select
            label="Programa"
            placeholder="Todos los programas"
            data={(programas as Programa[]).map(p => ({ value: p.id, label: p.nombre }))}
            value={programaFiltro || null}
            onChange={v => setProgramaFiltro(v || '')}
            clearable
            searchable
          />
          <Select
            label="Sede"
            placeholder="Todas las sedes"
            data={(sedes as Sede[]).map(s => ({ value: s.id, label: s.nombre }))}
            value={sedeFiltro || null}
            onChange={v => setSedeFiltro(v || '')}
            clearable
            searchable
          />
          <Select
            label="Semestre"
            placeholder="Todos"
            data={semestresFiltroDisponibles}
            value={semestreFiltro || null}
            onChange={v => setSemestreFiltro(v || '')}
            disabled={semestresFiltroDisponibles.length === 0}
            clearable
            searchable
          />
        </Group>
      </Paper>

      <Paper p="md" radius="md" withBorder bg="gray.0">
        <Group justify="space-between" align="center">
          <Stack gap={2}>
            <Text size="sm" fw={700}>Resumen de clases filtradas</Text>
            <Text size="xs" c="dimmed">
              Este conteo refleja exactamente lo que muestran los filtros actuales.
            </Text>
          </Stack>
          <Group gap="xs">
            <Badge size="lg" color="brand" variant="filled">{resumenClases.total} clases</Badge>
            <Badge size="lg" color="gray" variant="light">{resumenClases.sedes} sede(s)</Badge>
            <Badge size="lg" color="teal" variant="light">{resumenClases.grupos} grupo(s)</Badge>
            <Badge size="lg" color="success" variant="light">{resumenClases.asignadas} asignada(s)</Badge>
            <Badge size="lg" color="orange" variant="light">{resumenClases.pendientes} pendiente(s)</Badge>
          </Group>
        </Group>
        {resumenClases.semestres.length > 0 && (
          <Group gap="xs" mt="sm">
            <Text size="xs" c="dimmed" fw={600}>Semestres:</Text>
            {resumenClases.semestres.map(semestre => (
              <Badge key={semestre} color="gray" variant="outline">{semestre}°</Badge>
            ))}
          </Group>
        )}
      </Paper>

      {isLoading ? (
        <Text c="dimmed">Cargando clases...</Text>
      ) : (clases as ClaseAcademica[]).length === 0 ? (
        <Paper p="xl" radius="md" withBorder ta="center">
          <Text c="dimmed">No hay clases parametrizadas para los filtros seleccionados</Text>
        </Paper>
      ) : (
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Materia</Table.Th>
                <Table.Th>Semestre</Table.Th>
                <Table.Th>Programa</Table.Th>
                <Table.Th>Sede</Table.Th>
                <Table.Th>Grupo</Table.Th>
                <Table.Th>Calendario</Table.Th>
                <Table.Th>Día</Table.Th>
                <Table.Th>Horario</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(clases as ClaseAcademica[]).map(clase => (
                <Table.Tr key={clase.id}>
                  <Table.Td><Text size="sm" fw={500}>{clase.materia_nombre}</Text></Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="gray">{clase.semestre ? `${clase.semestre}°` : 'N/A'}</Badge>
                  </Table.Td>
                  <Table.Td><Text size="sm">{clase.programa_nombre}</Text></Table.Td>
                  <Table.Td>
                    <Stack gap={0}>
                      <Text size="sm">{clase.sede_nombre}</Text>
                      {clase.celula_nombre && <Text size="xs" c="dimmed">{clase.celula_nombre}</Text>}
                    </Stack>
                  </Table.Td>
                  <Table.Td><Badge variant="outline" color="gray">G{clase.grupo}</Badge></Table.Td>
                  <Table.Td>
                    <Badge color={clase.calendario === 'semanal' ? 'success' : 'brand'} variant="light">
                      {clase.calendario === 'semanal' ? 'Semanal / A + B' : `Semana ${clase.calendario}`}
                    </Badge>
                  </Table.Td>
                  <Table.Td><Badge variant="light">{DIA_LABELS[clase.dia_semana]}</Badge></Table.Td>
                  <Table.Td><Text size="sm">{clase.hora_inicio} - {clase.hora_fin}</Text></Table.Td>
                  <Table.Td><Badge color="gray" variant="light">{clase.estado}</Badge></Table.Td>
                  <Table.Td>
                    <Tooltip label="Eliminar clase">
                      <ActionIcon variant="light" color="red" size="sm" onClick={() => handleDelete(clase)}>
                        <Trash2 size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      <Modal
        opened={generatorOpened}
        onClose={closeGenerator}
        title="Generar clases"
        size="xl"
        styles={{
          content: { overflow: 'hidden' },
          body: { maxHeight: 'calc(100dvh - 140px)', overflowY: 'auto' },
        }}
      >
        <Stack gap="md">
          <Group grow>
            <Paper p="sm" radius="md" withBorder bg="gray.0">
              <Text size="xs" c="dimmed">Periodo de trabajo</Text>
              <Text size="sm" fw={700}>{periodoSeleccionado?.nombre ?? (periodoFinal || 'Sin periodo activo')}</Text>
            </Paper>
            <Select
              label="Programa"
              data={(programas as Programa[]).map(p => ({ value: p.id, label: p.nombre }))}
              value={generatorForm.programa_id || null}
              onChange={v => setGeneratorForm(f => ({
                ...f,
                programa_id: v || '',
                sede_ids: [],
                template_por_sede: {},
                semestres_por_sede: {},
              }))}
              searchable
              required
            />
          </Group>

          {programaGenerador && (
            <Paper p="sm" radius="md" withBorder bg="gray.0">
              <Group justify="space-between" gap="sm">
                <Group gap="xs">
                  <ThemeIcon color="brand" variant="light" radius="md">
                    <Settings2 size={16} />
                  </ThemeIcon>
                  <Text size="sm" fw={700}>Parametria detectada</Text>
                </Group>
                <Group gap="xs">
                  <Badge color={programaGenerador.tipo_ciclo === 'quincenal' ? 'brand' : 'success'} variant="filled">
                    {programaGenerador.tipo_ciclo === 'quincenal' ? 'Quincenal' : 'Semanal'}
                  </Badge>
                  <Badge color="gray" variant="light">{semestresGenerador.length} semestre(s)</Badge>
                  <Badge color="gray" variant="light">{sedesGenerador.length} sede(s) ofertada(s)</Badge>
                </Group>
              </Group>
            </Paper>
          )}

          <MultiSelect
            label="Sedes donde se generaran clases"
            placeholder="Selecciona las sedes ofertadas del programa"
            data={sedesGenerador.map(s => ({ value: s.id, label: s.nombre }))}
            value={generatorForm.sede_ids}
            onChange={v => setGeneratorForm(f => {
              const defaultSemestre = semestresGenerador[0]?.value ? [semestresGenerador[0].value] : [];
              const semestresPorSede = Object.fromEntries(
                v.map(sedeId => [sedeId, f.semestres_por_sede[sedeId] ?? defaultSemestre])
              );
              const templatePorSede = Object.fromEntries(
                v.map(sedeId => [sedeId, f.template_por_sede[sedeId] ?? ''])
              );
              return { ...f, sede_ids: v, semestres_por_sede: semestresPorSede, template_por_sede: templatePorSede };
            })}
            disabled={!generatorForm.programa_id}
            searchable
            required
          />

          <Paper p="sm" radius="md" withBorder>
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <div>
                  <Text size="sm" fw={700}>Plantillas</Text>
                  <Text size="xs" c="dimmed">Cada plantilla define días, jornadas, semestres y grupos.</Text>
                </div>
                <Button size="xs" leftSection={<CalendarPlus size={14} />} variant="light" color="brand" onClick={openCreateTemplate}>
                  Nueva plantilla
                </Button>
              </Group>
              <Group grow align="flex-end">
                <Select
                  label="Aplicar plantilla a todas las sedes"
                  placeholder="Selecciona una plantilla"
                  data={templateOptions}
                  onChange={v => v && applyTemplateToAll(v)}
                  disabled={templateOptions.length === 0 || generatorForm.sede_ids.length === 0}
                  searchable
                />
                <Text size="xs" c="dimmed">
                  Puedes aplicar una base a todas y luego cambiar solo las sedes especiales.
                </Text>
              </Group>
              {templateOptions.length === 0 && (
                <Alert color="orange" icon={<Info size={16} />}>
                  Aun no hay plantillas para este programa. Crea una plantilla para poder generar clases por sede.
                </Alert>
              )}
              {claseTemplatesList.length > 0 && (
                <Group gap="xs">
                  {claseTemplatesList.map(template => (
                    <Badge key={template.id} color="gray" variant="light" size="lg">
                      <Group gap={6}>
                        <Text size="xs">{template.nombre}</Text>
                        <ActionIcon variant="subtle" color="brand" size="xs" onClick={() => openEditTemplate(template)}>
                          <Settings2 size={12} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" size="xs" onClick={() => handleDeleteTemplate(template)}>
                          <Trash2 size={12} />
                        </ActionIcon>
                      </Group>
                    </Badge>
                  ))}
                </Group>
              )}
            </Stack>
          </Paper>

          {sedesSeleccionadasGenerador.length > 0 && (
            <Paper p="sm" radius="md" withBorder>
              <Stack gap="sm">
                <Text size="sm" fw={700}>Plantilla por sede</Text>
                {sedesSeleccionadasGenerador.map(sede => (
                  <Group key={sede.id} grow align="flex-end">
                    <Select
                      label={sede.nombre}
                      placeholder="Selecciona una plantilla"
                      data={templateOptions}
                      value={generatorForm.template_por_sede[sede.id] || null}
                      onChange={v => setTemplateSede(sede.id, v || '')}
                      searchable
                      required
                    />
                    {generatorForm.template_por_sede[sede.id] && (
                      <Paper p="xs" radius="sm" bg="gray.0" withBorder>
                        <Text size="xs" fw={600}>{templatesById.get(generatorForm.template_por_sede[sede.id])?.nombre}</Text>
                        <Text size="xs" c="dimmed">
                          {(templatesById.get(generatorForm.template_por_sede[sede.id])?.dias_semana ?? [])
                            .map(dia => DIA_LABELS[dia])
                            .join(' / ')}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {(templatesById.get(generatorForm.template_por_sede[sede.id])?.semestres ?? [])
                            .map(s => `${s.semestre}°: ${s.grupos} grupo(s)`)
                            .join(' · ')}
                        </Text>
                      </Paper>
                    )}
                  </Group>
                ))}
              </Stack>
            </Paper>
          )}

          {false && sedesSeleccionadasGenerador.length > 0 && (
            <Paper p="sm" radius="md" withBorder>
              <Stack gap="sm">
                <Text size="sm" fw={700}>Semestres por sede</Text>
                {sedesSeleccionadasGenerador.map(sede => (
                  <MultiSelect
                    key={sede.id}
                    label={sede.nombre}
                    placeholder="Selecciona los semestres que se ofertan en esta sede"
                    data={semestresGenerador}
                    value={generatorForm.semestres_por_sede[sede.id] ?? []}
                    onChange={v => setSemestresSede(sede.id, v)}
                    searchable
                    clearable
                  />
                ))}
              </Stack>
            </Paper>
          )}

          <Switch
            checked={generatorForm.reemplazar_existentes}
            onChange={event => setGeneratorForm(f => ({ ...f, reemplazar_existentes: event.currentTarget.checked }))}
            label="Reemplazar clases existentes del programa en las sedes seleccionadas"
            description="Peligro: borra clases existentes y sus asignaciones asociadas antes de generar. Dejelo apagado si solo quiere agregar nuevas clases."
            color="red"
          />

          {generatorForm.reemplazar_existentes && (
            <Alert icon={<Info size={16} />} color="red" title="Accion destructiva">
              Al generar, se eliminaran clases existentes del periodo, programa y sedes seleccionadas. Tambien se borraran sus asignaciones.
            </Alert>
          )}

          <Paper p="sm" radius="md" bg="brand.0">
            <Text size="sm" fw={600}>
              Se generaran clases en {generatorForm.sede_ids.length} sede(s), usando una plantilla academica por sede.
            </Text>
          </Paper>

          <Group justify="flex-end">
            <Button variant="light" onClick={closeGenerator}>Cancelar</Button>
            <Button color="brand" leftSection={<Wand2 size={16} />} onClick={handleGenerate} loading={generateClases.isPending}>
              Generar clases
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={templateOpened}
        onClose={closeTemplate}
        title={templateForm.id ? 'Editar plantilla' : 'Nueva plantilla'}
        size="lg"
        styles={{
          content: { overflow: 'hidden' },
          body: { maxHeight: 'calc(100dvh - 140px)', overflowY: 'auto' },
        }}
      >
        <Stack gap="md">
          <TextInput
            label="Nombre"
            placeholder="Ej. Sabado completo - Semestres 1 y 3"
            value={templateForm.nombre}
            onChange={event => setTemplateForm(f => ({ ...f, nombre: event?.currentTarget?.value ?? '' }))}
            required
          />
          <Group grow>
            <Select
              label="Programa"
              placeholder="Global"
              data={(programas as Programa[]).map(p => ({ value: p.id, label: p.nombre }))}
              value={templateForm.programa_id || null}
              onChange={v => setTemplateForm(f => ({ ...f, programa_id: v || '' }))}
              clearable
              searchable
            />
            <MultiSelect
              label="Dias de clase"
              data={DIA_OPTIONS.map(d => ({ ...d, label: DIA_LABELS[d.value] }))}
              value={templateForm.dias_semana}
              onChange={v => setTemplateForm(f => ({ ...f, dias_semana: v }))}
              clearable={false}
              required
            />
          </Group>

          <Paper p="sm" radius="md" withBorder>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={700}>Jornadas</Text>
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => setTemplateForm(f => ({ ...f, jornadas: [...f.jornadas, { hora_inicio: '07:00', hora_fin: '09:00' }] }))}
                >
                  Agregar jornada
                </Button>
              </Group>
              {templateForm.jornadas.map((jornada, index) => (
                <Group key={index} grow align="flex-end">
                  <Select
                    label={`Inicio ${index + 1}`}
                    data={HORAS}
                    value={jornada.hora_inicio}
                    onChange={v => setTemplateJornada(index, { hora_inicio: v || '07:00' })}
                  />
                  <Select
                    label={`Fin ${index + 1}`}
                    data={HORAS}
                    value={jornada.hora_fin}
                    onChange={v => setTemplateJornada(index, { hora_fin: v || '09:00' })}
                  />
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => setTemplateForm(f => ({ ...f, jornadas: f.jornadas.filter((_, idx) => idx !== index) }))}
                    disabled={templateForm.jornadas.length === 1}
                  >
                    <Trash2 size={16} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          </Paper>

          <Paper p="sm" radius="md" withBorder>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={700}>Semestres y grupos</Text>
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => setTemplateForm(f => ({ ...f, semestres: [...f.semestres, { semestre: 1, grupos: 1 }] }))}
                >
                  Agregar semestre
                </Button>
              </Group>
              {templateForm.semestres.map((semestre, index) => (
                <Group key={index} grow align="flex-end">
                  <Select
                    label="Semestre del programa"
                    data={semestreOptionsTemplate}
                    value={String(semestre.semestre)}
                    onChange={v => setTemplateSemestre(index, { semestre: Number(v) || 1 })}
                    searchable
                  />
                  <NumberInput
                    label="Grupos"
                    min={1}
                    max={20}
                    value={semestre.grupos}
                    onChange={v => setTemplateSemestre(index, { grupos: Number(v) || 1 })}
                  />
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => setTemplateForm(f => ({ ...f, semestres: f.semestres.filter((_, idx) => idx !== index) }))}
                    disabled={templateForm.semestres.length === 1}
                  >
                    <Trash2 size={16} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          </Paper>

          <Group justify="flex-end">
            <Button variant="light" onClick={closeTemplate}>Cancelar</Button>
            <Button color="brand" onClick={handleSaveTemplate} loading={createTemplate.isPending || updateTemplate.isPending}>
              Guardar plantilla
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={opened}
        onClose={close}
        title="Nueva clase"
        size="xl"
        styles={{
          content: { overflow: 'hidden' },
          body: { maxHeight: 'calc(100dvh - 140px)', overflowY: 'auto' },
        }}
      >
        <Stack gap="sm">
          <Group grow>
            <Paper p="sm" radius="md" withBorder bg="gray.0">
              <Text size="xs" c="dimmed">Periodo de trabajo</Text>
              <Text size="sm" fw={700}>{periodoSeleccionado?.nombre ?? (periodoFinal || 'Sin periodo activo')}</Text>
            </Paper>
            <Select
              label="Programa"
              data={(programas as Programa[]).map(p => ({ value: p.id, label: p.nombre }))}
              value={form.programa_id}
              onChange={v => setForm(f => ({ ...f, programa_id: v || '', semestre: '', materia_id: '' }))}
              searchable
              required
            />
          </Group>
          <Group grow>
            <Select
              label="Semestre"
              placeholder="Filtra por semestre"
              data={semestresDisponibles}
              value={form.semestre || null}
              onChange={v => setForm(f => ({ ...f, semestre: v || '', materia_id: '' }))}
              disabled={!form.programa_id || semestresDisponibles.length === 0}
              clearable
              searchable
            />
            <Select
              label="Materia"
              data={materiasFiltradas.map(m => ({ value: m.id, label: `${m.nombre} (${m.horas_semana}h)` }))}
              value={form.materia_id}
              onChange={v => setForm(f => ({ ...f, materia_id: v || '' }))}
              searchable
              required
            />
            <MultiSelect
              label="Sedes"
              placeholder="Selecciona una o varias sedes"
              data={(sedes as Sede[]).map(s => ({ value: s.id, label: s.nombre }))}
              value={form.sede_ids}
              onChange={v => setForm(f => ({ ...f, sede_ids: v }))}
              searchable
              required
            />
          </Group>
          <NumberInput
            label="Cantidad de grupos"
            description="Cada grupo tendrá su propio horario. Se crearán en todas las sedes seleccionadas."
            min={1}
            max={20}
            value={form.grupos.length}
            onChange={v => setCantidadGrupos(Number(v))}
          />
          <Paper p="sm" radius="md" bg="gray.0" withBorder>
            <Group justify="space-between" gap="sm">
              <Text size="sm" c="dimmed">Ciclo de clases</Text>
              <Group gap="xs">
                <Badge color={esQuincenal ? 'brand' : 'success'} variant="filled">
                  {tipoCicloLabel}
                </Badge>
                <Badge color={esQuincenal ? 'brand' : 'success'} variant="light">
                  {calendarioDerivado}
                </Badge>
              </Group>
            </Group>
          </Paper>
          <Divider label="Horarios por grupo" labelPosition="left" />
          <Stack gap="sm">
            {form.grupos.map((grupo, index) => (
              <Paper
                key={grupo.grupo}
                p="md"
                radius="md"
                withBorder
                bg="white"
                style={{ borderLeft: '4px solid var(--mantine-color-brand-6)' }}
              >
                <Stack gap="sm">
                  <Group justify="space-between" align="center" gap="sm" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                      <ThemeIcon color="brand" variant="light" size="lg" radius="md">
                        <CalendarDays size={18} />
                      </ThemeIcon>
                      <div>
                        <Group gap="xs">
                          <Text size="sm" fw={700}>Grupo {grupo.grupo}</Text>
                          <Badge color="gray" variant="light">{DIA_LABELS[grupo.dia_semana]}</Badge>
                          <Badge color={esQuincenal ? 'brand' : 'success'} variant="light">
                            {esQuincenal ? `Semana ${grupo.calendario}` : 'A + B'}
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {grupo.hora_inicio} - {grupo.hora_fin} · {formatDuration(grupo.hora_inicio, grupo.hora_fin)}
                        </Text>
                      </div>
                    </Group>
                    <Badge color="brand" variant="outline" leftSection={<Clock3 size={12} />}>
                      Horario
                    </Badge>
                  </Group>

                  <SegmentedControl
                    fullWidth
                    data={DIA_OPTIONS}
                    value={grupo.dia_semana}
                    onChange={v => setGrupo(index, { dia_semana: v })}
                  />

                  {esQuincenal ? (
                    <SegmentedControl
                      fullWidth
                      color="brand"
                      data={SEMANA_OPTIONS}
                      value={grupo.calendario === 'B' ? 'B' : 'A'}
                      onChange={v => setGrupo(index, { calendario: v as 'A' | 'B' })}
                    />
                  ) : (
                    <Paper p="xs" radius="sm" bg="green.0" withBorder>
                      <Group justify="space-between" gap="xs">
                        <Text size="xs" fw={600} c="green.8">Semana de clase</Text>
                        <Badge color="success" variant="filled">Semanal / A + B</Badge>
                      </Group>
                    </Paper>
                  )}

                  <Group grow align="flex-start">
                    <Select
                      label="Hora inicio"
                      data={HORAS}
                      value={grupo.hora_inicio}
                      onChange={v => setGrupo(index, { hora_inicio: v || '07:00' })}
                    />
                    <Select
                      label="Hora fin"
                      data={HORAS}
                      value={grupo.hora_fin}
                      onChange={v => setGrupo(index, { hora_fin: v || '09:00' })}
                    />
                  </Group>
                </Stack>
              </Paper>
            ))}
          </Stack>
          <Paper p="sm" radius="md" bg="brand.0">
            <Text size="sm" fw={600}>
              Se crearán {totalAcrear} clase(s): {form.sede_ids.length} sede(s) x {form.grupos.length} grupo(s)
            </Text>
          </Paper>
          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={close}>Cancelar</Button>
            <Button color="brand" onClick={handleCreate} loading={createClase.isPending}>Crear clases</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
