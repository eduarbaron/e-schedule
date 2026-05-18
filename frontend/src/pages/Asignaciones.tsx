import { useMemo, useState } from 'react';
import {
  Stack, Title, Button, Group, Paper, Text, Badge, ActionIcon,
  Modal, Select, Table, Tooltip, Alert, Card, SimpleGrid
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { FileText, Plus, Trash2, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  useAsignaciones, useCelulas, useDocentes, useSedes, useMaterias,
  useCreateAsignacion, useDeleteAsignacion, useAutoAsignacion, useProgramas,
  useDevPilotStatus, useDevPopulatePilot, useDevClearPilotData, useDevClearPilotAssignments,
  useDevPopulatePilotTeachers, useDevPopulatePilotClasses, useDevClearPilotTeachers, useDevClearPilotClasses
} from '../api/hooks';
import { AsignacionMasiva } from '../components/AsignacionMasiva';
import { useConfirm } from '../components/ConfirmProvider';
import type { Asignacion, CandidatoAsignacion, Sede } from '../types';
import { DIA_LABELS } from '../types';
import { usePeriodoTrabajo } from '../context/PeriodoContext';
import { printReport } from '../utils/reportExport';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S'];
const HORAS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
const BRAND_BLUE = '#528BC9';
const SUCCESS_GREEN = '#87BF58';
const SUCCESS_GREEN_LIGHT = '#f0f7e8';
const SEMANA_OPTIONS = [
  { value: 'A', label: 'Semana A' },
  { value: 'B', label: 'Semana B' },
];

const calendarioLabel = (calendario?: string) =>
  calendario === 'A' ? 'Semana A' : calendario === 'B' ? 'Semana B' : 'Semanal / A + B';

const modoLabel = (modo: Asignacion['modo']) =>
  modo === 'libre' ? 'Libre manual' : modo === 'foraneo' ? 'Foráneo' : 'Automático';

const modoColor = (modo: Asignacion['modo']) =>
  modo === 'libre' ? 'success' : modo === 'foraneo' ? 'orange' : 'brand';

const celulaForaneaLabel = (asignacion: Asignacion) => {
  const origen = asignacion.docente_celula_nombre ?? asignacion.docente_celula_id ?? 'Sin célula';
  const destino = asignacion.sede_celula_nombre ?? asignacion.celula_nombre ?? asignacion.sede_celula_id ?? 'Sin célula';
  return `Docente movido de ${origen} hacia ${destino}`;
};

export function Asignaciones() {
  const confirm = useConfirm();
  const { periodoId: periodoFinal, periodoSeleccionado } = usePeriodoTrabajo();
  const { data: asignaciones = [], isLoading } = useAsignaciones(periodoFinal ? { periodo: periodoFinal } : undefined);
  const { data: docentes = [] } = useDocentes();
  const { data: sedes = [] } = useSedes();
  const { data: celulas = [] } = useCelulas();
  const { data: materias = [] } = useMaterias();
  const { data: programas = [] } = useProgramas();
  const createAsignacion = useCreateAsignacion();
  const deleteAsignacion = useDeleteAsignacion();
  const autoAsignacion = useAutoAsignacion();
  const { data: devStatus } = useDevPilotStatus();
  const devPopulate = useDevPopulatePilot();
  const devClearData = useDevClearPilotData();
  const devClearAssignments = useDevClearPilotAssignments();
  const devPopulateTeachers = useDevPopulatePilotTeachers();
  const devPopulateClasses = useDevPopulatePilotClasses();
  const devClearTeachers = useDevClearPilotTeachers();
  const devClearClasses = useDevClearPilotClasses();

  const [manualOpened, { open: openManual, close: closeManual }] = useDisclosure(false);
  const [autoOpened, { open: openAuto, close: closeAuto }] = useDisclosure(false);
  const [masivOpened, { open: openMasiv, close: closeMasiv }] = useDisclosure(false);
  const [candidatos, setCandidatos] = useState<CandidatoAsignacion[]>([]);
  const [candidatoSeleccionado, setCandidatoSeleccionado] = useState<CandidatoAsignacion | null>(null);

  const [manualForm, setManualForm] = useState({
    docente_id: '', sede_id: '', materia_id: '',
    dia_semana: 'L', hora_inicio: '07:00', hora_fin: '09:00', modo: 'automatico', grupo: 1, calendario: 'A',
  });
  const [autoForm, setAutoForm] = useState({ docente_id: '', materia_id: '', calendario: 'A' });
  const [filtros, setFiltros] = useState({
    docenteId: '',
    sedeId: '',
    materiaId: '',
    celulaId: '',
    semestre: '',
    semana: '',
    modo: '',
  });

  const getTipoCicloMateria = (materiaId: string) => {
    const materia = materias.find((m: any) => m.id === materiaId);
    const programa = programas.find((p: any) => p.id === materia?.programa_id);
    return programa?.tipo_ciclo === 'quincenal' ? 'quincenal' : 'semanal';
  };
  const manualEsQuincenal = getTipoCicloMateria(manualForm.materia_id) === 'quincenal';
  const autoEsQuincenal = getTipoCicloMateria(autoForm.materia_id) === 'quincenal';

  const handleManualCreate = async () => {
    if (!manualForm.docente_id || !manualForm.sede_id || !manualForm.materia_id) {
      notifications.show({ message: 'Todos los campos son requeridos', color: 'red' });
      return;
    }
    try {
      await createAsignacion.mutateAsync({
        ...manualForm,
        calendario: manualEsQuincenal ? manualForm.calendario : 'semanal',
        periodo: periodoFinal,
      });
      notifications.show({ message: 'Asignación creada exitosamente', color: 'green' });
      closeManual();
    } catch (e: any) {
      const errores = e.response?.data?.errores;
      notifications.show({
        message: errores ? errores.join(' | ') : (e.response?.data?.error || 'Error de validación'),
        color: 'red',
        autoClose: 6000,
      });
    }
  };

  const handleAutoSuggest = async () => {
    if (!autoForm.docente_id || !autoForm.materia_id) {
      notifications.show({ message: 'Docente y materia son requeridos', color: 'red' });
      return;
    }
    try {
      const result = await autoAsignacion.mutateAsync({
        ...autoForm,
        calendario: autoEsQuincenal ? autoForm.calendario : 'semanal',
        periodo: periodoFinal,
      });
      setCandidatos(result.candidatos || []);
      setCandidatoSeleccionado(null);
    } catch (e: any) {
      const data = e.response?.data;
      notifications.show({
        message: data?.error || 'No se encontraron candidatos',
        color: 'red',
        autoClose: 6000,
      });
      if (data?.modo_libre_sugerido) {
        notifications.show({
          message: 'Sugerencia: activa el Modo Libre para este docente en la sección Docentes',
          color: 'orange',
          autoClose: 8000,
        });
      }
    }
  };

  const handleConfirmAuto = async () => {
    if (!candidatoSeleccionado) return;
    try {
      await createAsignacion.mutateAsync({ ...candidatoSeleccionado, modo: 'automatico', periodo: periodoFinal });
      notifications.show({ message: 'Asignación automática confirmada', color: 'green' });
      closeAuto();
      setCandidatos([]);
      setCandidatoSeleccionado(null);
    } catch (e: any) {
      const errores = e.response?.data?.errores;
      notifications.show({
        message: errores ? errores.join(' | ') : 'Error al confirmar asignación',
        color: 'red',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({
      title: 'Eliminar asignación',
      message: '¿Eliminar esta asignación?',
      confirmLabel: 'Eliminar',
    }))) return;
    try {
      await deleteAsignacion.mutateAsync(id);
      notifications.show({ message: 'Asignación eliminada', color: 'orange' });
    } catch {
      notifications.show({ message: 'Error al eliminar', color: 'red' });
    }
  };

  const getSedeName = (id: string) => sedes.find((s: any) => s.id === id)?.nombre || id;

  const asigLibre = asignaciones.filter((a: Asignacion) => a.modo === 'libre');
  const asigForaneas = asignaciones.filter((a: Asignacion) => a.modo === 'foraneo');
  const sedesById = useMemo(() => {
    return new Map((sedes as Sede[]).map(sede => [sede.id, sede]));
  }, [sedes]);

  const getSedeCelulaId = (asignacion: Asignacion) =>
    asignacion.sede_celula_id ?? sedesById.get(asignacion.sede_id)?.celula_id ?? null;

  const asignacionesFiltradas = useMemo(() => {
    return (asignaciones as Asignacion[]).filter(a =>
      (!filtros.docenteId || a.docente_id === filtros.docenteId) &&
      (!filtros.sedeId || a.sede_id === filtros.sedeId) &&
      (!filtros.materiaId || a.materia_id === filtros.materiaId) &&
      (!filtros.celulaId || getSedeCelulaId(a) === filtros.celulaId) &&
      (!filtros.semestre || String(a.semestre ?? '') === filtros.semestre) &&
      (!filtros.semana || a.calendario === filtros.semana) &&
      (!filtros.modo || a.modo === filtros.modo)
    );
  }, [asignaciones, filtros, sedesById]);

  const filterOptions = useMemo(() => {
    const docentesMap = new Map<string, string>();
    const sedesMap = new Map<string, string>();
    const materiasMap = new Map<string, string>();
    const semestres = new Set<number>();

    (asignaciones as Asignacion[]).forEach(a => {
      docentesMap.set(a.docente_id, a.docente_nombre ?? a.docente_id);
      const sedeCelulaId = getSedeCelulaId(a);
      if (!filtros.celulaId || sedeCelulaId === filtros.celulaId) {
        sedesMap.set(a.sede_id, a.sede_nombre ?? a.sede_id);
      }
      materiasMap.set(a.materia_id, a.materia_nombre ?? a.materia_id);
      if (a.semestre) semestres.add(a.semestre);
    });

    const toOptions = (map: Map<string, string>) =>
      Array.from(map.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ value, label }));

    return {
      docentes: toOptions(docentesMap),
      sedes: toOptions(sedesMap),
      materias: toOptions(materiasMap),
      celulas: (celulas as any[])
        .filter(celula => (asignaciones as Asignacion[]).some(a => getSedeCelulaId(a) === celula.id))
        .map(celula => ({ value: celula.id, label: celula.nombre }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      semestres: Array.from(semestres)
        .sort((a, b) => a - b)
        .map(value => ({ value: String(value), label: `Semestre ${value}` })),
    };
  }, [asignaciones, celulas, filtros.celulaId, sedesById]);

  const handleDevPopulate = async () => {
    try {
      const res = await devPopulate.mutateAsync();
      notifications.show({
        message: `Piloto poblado: ${res.docentes_creados} docentes y ${res.clases_creadas} clases`,
        color: 'green',
      });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al poblar piloto', color: 'red' });
    }
  };

  const handleDevPopulateTeachers = async () => {
    try {
      const res = await devPopulateTeachers.mutateAsync();
      notifications.show({ message: `${res.docentes_creados} docentes piloto poblados`, color: 'green' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al poblar docentes piloto', color: 'red' });
    }
  };

  const handleDevPopulateClasses = async () => {
    try {
      const res = await devPopulateClasses.mutateAsync();
      notifications.show({ message: `${res.clases_creadas} clases piloto pobladas`, color: 'green' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al poblar clases piloto', color: 'red' });
    }
  };

  const handleDevClearData = async () => {
    if (!(await confirm({
      title: 'Borrar datos piloto',
      message: 'Se eliminarán docentes y asignaciones piloto, y las clases pobladas del programa técnico web.',
      confirmLabel: 'Borrar piloto',
      color: 'orange',
    }))) return;
    try {
      await devClearData.mutateAsync();
      notifications.show({ message: 'Datos piloto eliminados', color: 'orange' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al borrar datos piloto', color: 'red' });
    }
  };

  const handleDevClearTeachers = async () => {
    if (!(await confirm({
      title: 'Borrar docentes piloto',
      message: 'Se eliminarán solo docentes piloto, su disponibilidad y sus asignaciones.',
      confirmLabel: 'Borrar docentes',
      color: 'orange',
    }))) return;
    try {
      await devClearTeachers.mutateAsync();
      notifications.show({ message: 'Docentes piloto eliminados', color: 'orange' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al borrar docentes piloto', color: 'red' });
    }
  };

  const handleDevClearClasses = async () => {
    if (!(await confirm({
      title: 'Borrar clases piloto',
      message: 'Se eliminarán las clases del programa técnico web y sus asignaciones asociadas.',
      confirmLabel: 'Borrar clases',
      color: 'orange',
    }))) return;
    try {
      await devClearClasses.mutateAsync();
      notifications.show({ message: 'Clases piloto eliminadas', color: 'orange' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al borrar clases piloto', color: 'red' });
    }
  };

  const handleDevClearAssignments = async () => {
    if (!(await confirm({
      title: 'Borrar asignaciones piloto',
      message: 'Se eliminarán solo asignaciones hechas a docentes piloto dev. Docentes y clases piloto se conservan.',
      confirmLabel: 'Borrar asignaciones',
      color: 'orange',
    }))) return;
    try {
      const res = await devClearAssignments.mutateAsync();
      notifications.show({ message: `${res.eliminadas ?? 0} asignaciones piloto eliminadas`, color: 'orange' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al borrar asignaciones piloto', color: 'red' });
    }
  };

  const handleExportPdf = () => {
    const ok = printReport({
      title: 'Reporte de asignaciones',
      subtitle: `Periodo de trabajo: ${periodoSeleccionado?.nombre ?? (periodoFinal || 'Sin periodo activo')}`,
      filename: `asignaciones-${periodoFinal || 'periodo'}`,
      meta: [
        { label: 'Docente', value: filterOptions.docentes.find(option => option.value === filtros.docenteId)?.label },
        { label: 'Zona', value: filterOptions.celulas.find(option => option.value === filtros.celulaId)?.label },
        { label: 'Sede', value: filterOptions.sedes.find(option => option.value === filtros.sedeId)?.label },
        { label: 'Materia', value: filterOptions.materias.find(option => option.value === filtros.materiaId)?.label },
        { label: 'Semestre', value: filtros.semestre ? `Semestre ${filtros.semestre}` : undefined },
        { label: 'Semana', value: filtros.semana ? calendarioLabel(filtros.semana) : undefined },
        { label: 'Modo', value: filtros.modo ? modoLabel(filtros.modo as Asignacion['modo']) : undefined },
        { label: 'Registros', value: asignacionesFiltradas.length },
      ],
      columns: [
        { label: 'Docente', value: a => a.docente_nombre },
        { label: 'Materia', value: a => a.materia_nombre },
        { label: 'Sem.', value: a => a.semestre ? `S${a.semestre}` : '' },
        { label: 'Grupo', value: a => `G${a.grupo ?? 1}` },
        { label: 'Semana', value: a => calendarioLabel(a.calendario) },
        { label: 'Sede', value: a => a.sede_nombre },
        { label: 'Zona sede', value: a => a.sede_celula_nombre ?? a.celula_nombre },
        { label: 'Dia', value: a => DIA_LABELS[a.dia_semana] ?? a.dia_semana },
        { label: 'Horario', value: a => `${a.hora_inicio} - ${a.hora_fin}` },
        { label: 'Modo', value: a => modoLabel(a.modo) },
        { label: 'Movimiento', value: a => a.modo === 'foraneo' ? celulaForaneaLabel(a) : '' },
      ],
      rows: asignacionesFiltradas,
    });
    if (!ok) {
      notifications.show({ message: 'El navegador bloqueo la ventana del reporte', color: 'orange' });
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Asignaciones</Title>
        <Group>
          <Button leftSection={<Zap size={16} />} variant="filled" color="brand" onClick={openMasiv}>
            Asignación masiva
          </Button>
          <Button leftSection={<Zap size={16} />} variant="light" color="brand" onClick={openAuto}>
            Asignación individual
          </Button>
          <Button leftSection={<Plus size={16} />} color="success" onClick={openManual}>Manual</Button>
          <Button leftSection={<FileText size={16} />} variant="light" color="gray" onClick={handleExportPdf}>
            PDF
          </Button>
        </Group>
      </Group>

      {asigLibre.length > 0 && (
        <Alert icon={<AlertTriangle size={16} />} color="orange" title="Asignaciones en modo libre">
          {asigLibre.length} asignación(es) fueron realizadas en modo libre manual.
        </Alert>
      )}

      {asigForaneas.length > 0 && (
        <Alert icon={<AlertTriangle size={16} />} color="yellow" title="Asignaciones foráneas">
          {asigForaneas.length} asignación(es) fueron autorizadas como foráneas por el algoritmo.
        </Alert>
      )}

      <Paper p="md" radius="md" withBorder bg="gray.0">
        <Group justify="space-between" align="center">
          <Stack gap={2}>
            <Text fw={700} size="sm">Herramientas de desarrollo · Piloto técnico web</Text>
            <Text size="xs" c="dimmed">
              Pobla docentes de prueba y clases del programa técnico web para probar el algoritmo.
            </Text>
          </Stack>
          <Group gap="xs">
            {devStatus?.schema_ok === false && (
              <Badge color="red" variant="light">Esquema incompleto</Badge>
            )}
            <Badge color="brand" variant="light">{devStatus?.docentes ?? 0} docentes</Badge>
            <Badge color="success" variant="light">{devStatus?.clases ?? 0} clases</Badge>
            <Badge color="orange" variant="light">{devStatus?.asignaciones ?? 0} asignaciones</Badge>
          </Group>
        </Group>
        {devStatus?.schema_ok === false && (
          <Alert icon={<AlertTriangle size={16} />} color="red" mt="sm" title="Migraciones pendientes">
            Faltan tablas para usar el piloto: {(devStatus.missing_tables || []).join(', ')}.
          </Alert>
        )}
        <Group mt="sm" gap="xs">
          <Button size="xs" color="brand" onClick={handleDevPopulate} loading={devPopulate.isPending}>
            Poblar todo
          </Button>
          <Button size="xs" variant="light" color="brand" onClick={handleDevPopulateTeachers} loading={devPopulateTeachers.isPending}>
            Poblar docentes
          </Button>
          <Button size="xs" variant="light" color="success" onClick={handleDevPopulateClasses} loading={devPopulateClasses.isPending}>
            Poblar clases
          </Button>
          <Button size="xs" variant="light" color="orange" onClick={handleDevClearAssignments} loading={devClearAssignments.isPending}>
            Borrar asignaciones piloto
          </Button>
          <Button size="xs" variant="light" color="red" onClick={handleDevClearTeachers} loading={devClearTeachers.isPending}>
            Borrar docentes
          </Button>
          <Button size="xs" variant="light" color="red" onClick={handleDevClearClasses} loading={devClearClasses.isPending}>
            Borrar clases
          </Button>
          <Button size="xs" variant="light" color="red" onClick={handleDevClearData} loading={devClearData.isPending}>
            Borrar todo
          </Button>
        </Group>
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Group gap="xs" align="flex-end">
          <Select
            label="Docente"
            placeholder="Todos"
            data={filterOptions.docentes}
            value={filtros.docenteId || null}
            onChange={v => setFiltros(f => ({ ...f, docenteId: v || '' }))}
            searchable
            clearable
            w={220}
          />
          <Select
            label="Zona"
            placeholder="Todas"
            data={filterOptions.celulas}
            value={filtros.celulaId || null}
            onChange={v => setFiltros(f => {
              const nextCelulaId = v || '';
              const sedeActual = f.sedeId ? sedesById.get(f.sedeId) : undefined;
              return {
                ...f,
                celulaId: nextCelulaId,
                sedeId: nextCelulaId && sedeActual?.celula_id !== nextCelulaId ? '' : f.sedeId,
              };
            })}
            searchable
            clearable
            w={210}
          />
          <Select
            label="Sede"
            placeholder="Todas"
            data={filterOptions.sedes}
            value={filtros.sedeId || null}
            onChange={v => setFiltros(f => ({ ...f, sedeId: v || '' }))}
            searchable
            clearable
            w={220}
          />
          <Select
            label="Materia"
            placeholder="Todas"
            data={filterOptions.materias}
            value={filtros.materiaId || null}
            onChange={v => setFiltros(f => ({ ...f, materiaId: v || '' }))}
            searchable
            clearable
            w={220}
          />
          <Select
            label="Semestre"
            placeholder="Todos"
            data={filterOptions.semestres}
            value={filtros.semestre || null}
            onChange={v => setFiltros(f => ({ ...f, semestre: v || '' }))}
            clearable
            w={130}
          />
          <Select
            label="Semana"
            placeholder="Todas"
            data={[
              { value: 'A', label: 'Semana A' },
              { value: 'B', label: 'Semana B' },
              { value: 'semanal', label: 'Semanal / A + B' },
            ]}
            value={filtros.semana || null}
            onChange={v => setFiltros(f => ({ ...f, semana: v || '' }))}
            clearable
            w={160}
          />
          <Select
            label="Modo"
            placeholder="Todos"
            data={[
              { value: 'automatico', label: 'Automatico' },
              { value: 'foraneo', label: 'Foraneo' },
              { value: 'libre', label: 'Libre manual' },
            ]}
            value={filtros.modo || null}
            onChange={v => setFiltros(f => ({ ...f, modo: v || '' }))}
            clearable
            w={150}
          />
          <Button
            variant="subtle"
            color="gray"
            onClick={() => setFiltros({ docenteId: '', sedeId: '', materiaId: '', celulaId: '', semestre: '', semana: '', modo: '' })}
          >
            Limpiar
          </Button>
        </Group>
        <Text size="xs" c="dimmed" mt="xs">
          Mostrando {asignacionesFiltradas.length} de {asignaciones.length} asignaciones del periodo de trabajo.
        </Text>
      </Paper>

      {isLoading ? (
        <Text c="dimmed">Cargando asignaciones...</Text>
      ) : asignaciones.length === 0 ? (
        <Paper p="xl" radius="md" withBorder ta="center">
          <Text c="dimmed">No hay asignaciones para el período {periodoFinal || 'seleccionado'}</Text>
        </Paper>
      ) : asignacionesFiltradas.length === 0 ? (
        <Paper p="xl" radius="md" withBorder ta="center">
          <Text c="dimmed">No hay asignaciones que coincidan con los filtros seleccionados</Text>
        </Paper>
      ) : (
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Docente</Table.Th>
                <Table.Th>Materia</Table.Th>
                <Table.Th>Grupo</Table.Th>
                <Table.Th>Semana</Table.Th>
                <Table.Th>Sede</Table.Th>
                <Table.Th>Día</Table.Th>
                <Table.Th>Horario</Table.Th>
                <Table.Th>Modo</Table.Th>
                <Table.Th>Distancia</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {asignacionesFiltradas.map((a: Asignacion) => (
                <Table.Tr key={a.id} style={a.modo === 'libre' || a.modo === 'foraneo' ? { background: SUCCESS_GREEN_LIGHT } : {}}>
                  <Table.Td><Text size="sm" fw={500}>{a.docente_nombre}</Text></Table.Td>
                  <Table.Td><Text size="sm">{a.materia_nombre}</Text></Table.Td>
                  <Table.Td>
                    <Badge variant="outline" size="sm" color="gray">G{a.grupo ?? 1}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={a.calendario === 'semanal' ? 'success' : 'brand'} variant="light" size="sm">
                      {calendarioLabel(a.calendario)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={0}>
                      <Text size="sm">{a.sede_nombre}</Text>
                      {a.celula_nombre && <Text size="xs" c="dimmed">{a.celula_nombre}</Text>}
                    </Stack>
                  </Table.Td>
                  <Table.Td><Badge variant="light" size="sm">{DIA_LABELS[a.dia_semana]}</Badge></Table.Td>
                  <Table.Td><Text size="sm">{a.hora_inicio} – {a.hora_fin}</Text></Table.Td>
                  <Table.Td>
                    {a.modo === 'foraneo' ? (
                      <Tooltip label={celulaForaneaLabel(a)} multiline w={260}>
                        <Badge color={modoColor(a.modo)} variant="light" size="sm" style={{ cursor: 'help' }}>
                          {modoLabel(a.modo)}
                        </Badge>
                      </Tooltip>
                    ) : (
                      <Badge color={modoColor(a.modo)} variant="light" size="sm">
                        {modoLabel(a.modo)}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {a.distancia_km != null ? `${Number(a.distancia_km).toFixed(1)} km` : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label="Eliminar asignación">
                      <ActionIcon variant="light" color="red" size="sm" onClick={() => handleDelete(a.id)}>
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

      {/* Modal Asignación Masiva */}
      <AsignacionMasiva opened={masivOpened} onClose={closeMasiv} />

      {/* Modal Asignación Manual */}
      <Modal opened={manualOpened} onClose={closeManual} title="Asignación manual" size="md">
        <Stack gap="sm">
          <Select label="Docente" placeholder="Selecciona docente"
            data={docentes.map((d: any) => ({ value: d.id, label: `${d.nombre} (${d.horas_asignadas}/${d.max_horas}h)` }))}
            value={manualForm.docente_id}
            onChange={v => setManualForm(f => ({ ...f, docente_id: v || '' }))}
            searchable required />
          <Select label="Sede" placeholder="Selecciona sede"
            data={sedes.map((s: any) => ({ value: s.id, label: s.nombre }))}
            value={manualForm.sede_id}
            onChange={v => setManualForm(f => ({ ...f, sede_id: v || '' }))}
            searchable required />
          <Select label="Materia" placeholder="Selecciona materia"
            data={materias.map((m: any) => ({ value: m.id, label: `${m.nombre} (${m.horas_semana}h)` }))}
            value={manualForm.materia_id}
            onChange={v => setManualForm(f => ({ ...f, materia_id: v || '' }))}
            searchable required />
          <Group grow>
            <Select label="Día" data={DIAS.map(d => ({ value: d, label: DIA_LABELS[d] }))}
              value={manualForm.dia_semana}
              onChange={v => setManualForm(f => ({ ...f, dia_semana: v || 'L' }))} />
            <Select label="Hora inicio" data={HORAS} value={manualForm.hora_inicio}
              onChange={v => setManualForm(f => ({ ...f, hora_inicio: v || '07:00' }))} />
            <Select label="Hora fin" data={HORAS} value={manualForm.hora_fin}
              onChange={v => setManualForm(f => ({ ...f, hora_fin: v || '09:00' }))} />
          </Group>
          <Group grow>
            <Select label="Modo"
              data={[{ value: 'automatico', label: 'Automático (respeta célula)' }, { value: 'libre', label: 'Libre (ignora célula)' }]}
              value={manualForm.modo}
              onChange={v => setManualForm(f => ({ ...f, modo: v || 'automatico' }))} />
            <Select label="Grupo"
              data={[1,2,3,4,5].map(n => ({ value: String(n), label: `Grupo ${n}` }))}
              value={String(manualForm.grupo)}
              onChange={v => setManualForm(f => ({ ...f, grupo: Number(v) || 1 }))} />
          </Group>
          {manualEsQuincenal ? (
            <Select
              label="Semana"
              data={SEMANA_OPTIONS}
              value={manualForm.calendario}
              onChange={v => setManualForm(f => ({ ...f, calendario: v || 'A' }))}
              required
            />
          ) : (
            <Paper p="xs" radius="sm" bg="green.0" withBorder>
              <Group justify="space-between" gap="xs">
                <Text size="xs" fw={600} c="green.8">Semana de clase</Text>
                <Badge color="success" variant="filled">Semanal / A + B</Badge>
              </Group>
            </Paper>
          )}
          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={closeManual}>Cancelar</Button>
            <Button onClick={handleManualCreate} loading={createAsignacion.isPending}>Crear asignación</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal Asignación Automática */}
      <Modal opened={autoOpened} onClose={() => { closeAuto(); setCandidatos([]); }} title="Asignación automática" size="lg">
        <Stack gap="md">
          <Group grow>
            <Select label="Docente" placeholder="Selecciona docente"
              data={docentes.map((d: any) => ({
                value: d.id,
                label: `${d.nombre} (${d.horas_asignadas}/${d.max_horas}h)${d.modo_libre ? ' - LIBRE' : ''}`,
              }))}
              value={autoForm.docente_id}
              onChange={v => setAutoForm(f => ({ ...f, docente_id: v || '' }))}
              searchable />
            <Select label="Materia" placeholder="Selecciona materia"
              data={materias.map((m: any) => ({ value: m.id, label: `${m.nombre} (${m.horas_semana}h)` }))}
              value={autoForm.materia_id}
              onChange={v => setAutoForm(f => ({ ...f, materia_id: v || '' }))}
              searchable />
          </Group>
          {autoEsQuincenal ? (
            <Select
              label="Semana"
              data={SEMANA_OPTIONS}
              value={autoForm.calendario}
              onChange={v => setAutoForm(f => ({ ...f, calendario: v || 'A' }))}
              required
            />
          ) : (
            <Paper p="xs" radius="sm" bg="green.0" withBorder>
              <Group justify="space-between" gap="xs">
                <Text size="xs" fw={600} c="green.8">Semana de clase</Text>
                <Badge color="success" variant="filled">Semanal / A + B</Badge>
              </Group>
            </Paper>
          )}
          <Button leftSection={<Zap size={16} />} onClick={handleAutoSuggest}
            loading={autoAsignacion.isPending} fullWidth color="brand">
            Generar candidatos óptimos
          </Button>

          {candidatos.length > 0 && (
            <Stack gap="xs">
              <Text fw={600} size="sm">Candidatos ordenados por score (mayor = mejor):</Text>
              <SimpleGrid cols={1} spacing="xs">
                {candidatos.map((c, i) => (
                  <Card
                    key={i}
                    withBorder
                    padding="sm"
                    radius="md"
                    style={{
                      cursor: 'pointer',
                      borderColor: candidatoSeleccionado === c ? BRAND_BLUE : undefined,
                      background: candidatoSeleccionado === c ? '#eaf1f9' : undefined,
                      boxShadow: candidatoSeleccionado === c ? `inset 3px 0 0 ${SUCCESS_GREEN}` : undefined,
                    }}
                    onClick={() => setCandidatoSeleccionado(c)}
                  >
                    <Group justify="space-between">
                      <Group gap="xs">
                        {candidatoSeleccionado === c
                          ? <CheckCircle size={16} color={SUCCESS_GREEN} />
                          : <Text size="sm" c="dimmed">#{i + 1}</Text>}
                        <Stack gap={0}>
                          <Text size="sm" fw={500}>{getSedeName(c.sede_id)}</Text>
                          <Text size="xs" c="dimmed">
                            {DIA_LABELS[c.dia_semana]} {c.hora_inicio}–{c.hora_fin}
                          </Text>
                        </Stack>
                      </Group>
                      <Group gap="xs">
                        <Badge color={c.calendario === 'semanal' ? 'success' : 'brand'} variant="light" size="sm">
                          {calendarioLabel(c.calendario)}
                        </Badge>
                        <Badge color="brand" variant="light" size="sm">
                          {c.distancia_km.toFixed(1)} km
                        </Badge>
                        <Badge color="success" variant="light" size="sm">
                          Score: {c.score.toFixed(1)}
                        </Badge>
                      </Group>
                    </Group>
                  </Card>
                ))}
              </SimpleGrid>
              <Group justify="flex-end" mt="sm">
                <Button variant="light" onClick={() => { closeAuto(); setCandidatos([]); }}>Cancelar</Button>
                <Button
                  onClick={handleConfirmAuto}
                  disabled={!candidatoSeleccionado}
                  loading={createAsignacion.isPending}
                  color="success"
                >
                  Confirmar selección
                </Button>
              </Group>
            </Stack>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
