import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { CalendarDays, CalendarPlus, Clock3, Info, Trash2 } from 'lucide-react';
import {
  useClases,
  useCreateClase,
  useDeleteClase,
  useMaterias,
  useProgramas,
  useSedes,
} from '../api/hooks';
import type { ClaseAcademica, Materia, Programa, Sede } from '../types';
import { DIA_LABELS } from '../types';
import { useConfirm } from '../components/ConfirmProvider';
import { usePeriodoTrabajo } from '../context/PeriodoContext';

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
  const [opened, { open, close }] = useDisclosure(false);

  const [form, setForm] = useState({
    programa_id: '',
    semestre: '',
    materia_id: '',
    sede_ids: [] as string[],
    grupos: [
      { grupo: 1, calendario: 'A' as const, dia_semana: 'L', hora_inicio: '07:00', hora_fin: '09:00' },
    ] as GrupoForm[],
  });

  const materiasDelPrograma = useMemo(
    () => (materias as Materia[]).filter(m => !form.programa_id || m.programa_id === form.programa_id),
    [materias, form.programa_id]
  );

  const programaDelForm = useMemo(
    () => (programas as Programa[]).find(p => p.id === form.programa_id),
    [programas, form.programa_id]
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
        <Button leftSection={<CalendarPlus size={16} />} color="brand" onClick={open}>
          Nueva clase
        </Button>
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
