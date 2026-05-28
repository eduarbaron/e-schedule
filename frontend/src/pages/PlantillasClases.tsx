import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  MultiSelect,
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ArrowLeft, CalendarPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  useClaseTemplates,
  useCreateClaseTemplate,
  useDeleteClaseTemplate,
  useProgramas,
  useUpdateClaseTemplate,
} from '../api/hooks';
import { useConfirm } from '../components/ConfirmProvider';
import type { ClaseTemplate, Programa } from '../types';
import { DIA_LABELS } from '../types';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S'];
const HORAS = Array.from({ length: 17 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`);
const DIA_OPTIONS = DIAS.map(d => ({ value: d, label: DIA_LABELS[d] }));
const iconButtonColumn = { flex: '0 0 36px' };
const timeInputColumn = { flex: '1 1 92px', minWidth: 0 };
const compactNumberColumn = { flex: '0 0 112px' };
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

type DiaConfigForm = {
  dia_semana: string;
  jornadas: JornadaForm[];
  max_clases: number | null;
  break_minutos: number;
};

type TemplateForm = {
  id: string;
  nombre: string;
  programa_id: string;
  dias_semana: string[];
  jornadas: JornadaForm[];
  dias_config: DiaConfigForm[];
  semestres: { semestre: number; grupos: number }[];
};

const defaultJornadas = (): JornadaForm[] => [
  { hora_inicio: '07:00', hora_fin: '13:00' },
  { hora_inicio: '14:00', hora_fin: '17:00' },
];

const diasConfigDesdeLegacy = (dias: string[], jornadas: JornadaForm[]): DiaConfigForm[] =>
  dias.map(dia_semana => ({
    dia_semana,
    jornadas: jornadas.length > 0 ? jornadas : defaultJornadas(),
    max_clases: null,
    break_minutos: 0,
  }));

const syncDiasConfig = (dias: string[], current: DiaConfigForm[], fallback: JornadaForm[]) =>
  dias.map(dia_semana => current.find(dia => dia.dia_semana === dia_semana) ?? {
    dia_semana,
    jornadas: fallback.length > 0 ? fallback : defaultJornadas(),
    max_clases: null,
    break_minutos: 0,
  });

const defaultForm = (programaId = ''): TemplateForm => ({
  id: '',
  nombre: '',
  programa_id: programaId,
  dias_semana: ['S'],
  jornadas: defaultJornadas(),
  dias_config: diasConfigDesdeLegacy(['S'], defaultJornadas()),
  semestres: [{ semestre: 1, grupos: 1 }],
});

export function PlantillasClases() {
  const confirm = useConfirm();
  const [programaFiltro, setProgramaFiltro] = useState('');
  const { data: programas = [] } = useProgramas();
  const { data: templates = [], isLoading } = useClaseTemplates(programaFiltro || undefined);
  const createTemplate = useCreateClaseTemplate();
  const updateTemplate = useUpdateClaseTemplate();
  const deleteTemplate = useDeleteClaseTemplate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<TemplateForm>(defaultForm());
  const templatesList = Array.isArray(templates) ? templates as ClaseTemplate[] : [];
  const programasList = Array.isArray(programas) ? programas as Programa[] : [];

  const programaOptions = useMemo(
    () => programasList.map(p => ({ value: p.id, label: p.nombre })),
    [programasList]
  );
  const programaForm = useMemo(
    () => programasList.find(p => p.id === form.programa_id),
    [programasList, form.programa_id]
  );
  const semestreOptions = useMemo(
    () => semestreOptionsForPrograma(programaForm),
    [programaForm]
  );

  const openCreate = () => {
    setForm(defaultForm(programaFiltro));
    setEditing(true);
  };

  const openEdit = (template: ClaseTemplate) => {
    const diasSemana = template.dias_semana?.length ? template.dias_semana : ['S'];
    const jornadas = Array.isArray(template.jornadas) && template.jornadas.length > 0 ? template.jornadas : defaultJornadas();
    setForm({
      id: template.id,
      nombre: template.nombre,
      programa_id: template.programa_id ?? '',
      dias_semana: diasSemana,
      jornadas,
      dias_config: Array.isArray(template.dias_config) && template.dias_config.length > 0
        ? template.dias_config.map(dia => ({ ...dia, break_minutos: Number(dia.break_minutos ?? 0) }))
        : diasConfigDesdeLegacy(diasSemana, jornadas),
      semestres: Array.isArray(template.semestres) && template.semestres.length > 0 ? template.semestres : [{ semestre: 1, grupos: 1 }],
    });
    setEditing(true);
  };

  const closeEditor = () => {
    setEditing(false);
    setForm(defaultForm(programaFiltro));
  };

  const setDiasSemana = (dias: string[]) => {
    setForm(f => ({
      ...f,
      dias_semana: dias,
      dias_config: syncDiasConfig(dias, f.dias_config, f.jornadas),
    }));
  };

  const setDiaJornada = (dia: string, index: number, patch: Partial<JornadaForm>) => {
    setForm(f => ({
      ...f,
      dias_config: f.dias_config.map(config => config.dia_semana === dia
        ? { ...config, jornadas: config.jornadas.map((jornada, idx) => idx === index ? { ...jornada, ...patch } : jornada) }
        : config),
    }));
  };

  const addDiaJornada = (dia: string) => {
    setForm(f => ({
      ...f,
      dias_config: f.dias_config.map(config => config.dia_semana === dia
        ? { ...config, jornadas: [...config.jornadas, { hora_inicio: '07:00', hora_fin: '09:00' }] }
        : config),
    }));
  };

  const removeDiaJornada = (dia: string, index: number) => {
    setForm(f => ({
      ...f,
      dias_config: f.dias_config.map(config => config.dia_semana === dia
        ? { ...config, jornadas: config.jornadas.filter((_, idx) => idx !== index) }
        : config),
    }));
  };

  const setDiaMaxClases = (dia: string, value: number | null) => {
    setForm(f => ({
      ...f,
      dias_config: f.dias_config.map(config => config.dia_semana === dia ? { ...config, max_clases: value } : config),
    }));
  };

  const setDiaBreakMinutos = (dia: string, value: number) => {
    setForm(f => ({
      ...f,
      dias_config: f.dias_config.map(config => config.dia_semana === dia ? { ...config, break_minutos: Math.max(0, Number(value) || 0) } : config),
    }));
  };

  const setSemestre = (index: number, patch: Partial<{ semestre: number; grupos: number }>) => {
    setForm(f => ({
      ...f,
      semestres: f.semestres.map((semestre, idx) => idx === index ? { ...semestre, ...patch } : semestre),
    }));
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      notifications.show({ message: 'El nombre de la plantilla es requerido', color: 'red' });
      return;
    }
    if (form.dias_semana.length === 0) {
      notifications.show({ message: 'Selecciona al menos un dia de clase', color: 'red' });
      return;
    }
    const diasConfig = form.dias_config.filter(dia => form.dias_semana.includes(dia.dia_semana));
    if (diasConfig.some(dia => dia.jornadas.length === 0 || dia.jornadas.some(j => !j.hora_inicio || !j.hora_fin || j.hora_inicio >= j.hora_fin))) {
      notifications.show({ message: 'Cada dia debe tener jornadas validas', color: 'red' });
      return;
    }
    if (form.semestres.some(s => !s.semestre || s.grupos < 1)) {
      notifications.show({ message: 'Define semestres y grupos validos', color: 'red' });
      return;
    }
    const maxSemestre = Number(programaForm?.numero_semestres ?? 10);
    if (form.semestres.some(s => s.semestre > maxSemestre)) {
      notifications.show({ message: `Este programa solo tiene ${maxSemestre} semestre(s)`, color: 'red' });
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      programa_id: form.programa_id || null,
      dias_semana: diasConfig.map(dia => dia.dia_semana),
      jornadas: diasConfig[0]?.jornadas ?? form.jornadas,
      dias_config: diasConfig,
      semestres: form.semestres,
    };

    try {
      if (form.id) {
        await updateTemplate.mutateAsync({ id: form.id, ...payload });
        notifications.show({ message: 'Plantilla actualizada', color: 'green' });
      } else {
        await createTemplate.mutateAsync(payload);
        notifications.show({ message: 'Plantilla creada', color: 'green' });
      }
      closeEditor();
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al guardar plantilla', color: 'red' });
    }
  };

  const handleDelete = async (template: ClaseTemplate) => {
    if (!(await confirm({
      title: 'Eliminar plantilla',
      message: `Eliminar la plantilla "${template.nombre}". Las clases ya generadas no se eliminan.`,
      confirmLabel: 'Eliminar',
      color: 'red',
    }))) return;
    try {
      await deleteTemplate.mutateAsync(template.id);
      notifications.show({ message: 'Plantilla eliminada', color: 'orange' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al eliminar plantilla', color: 'red' });
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Plantillas de clases</Title>
          <Text size="sm" c="dimmed">Patrones reutilizables para generar clases por sede</Text>
        </div>
        {editing ? (
          <Button leftSection={<ArrowLeft size={16} />} variant="light" onClick={closeEditor}>
            Volver al listado
          </Button>
        ) : (
          <Button leftSection={<CalendarPlus size={16} />} color="brand" onClick={openCreate}>
            Nueva plantilla
          </Button>
        )}
      </Group>

      {!editing && (
        <>
      <Paper p="md" radius="md" withBorder>
        <Select
          label="Programa"
          placeholder="Todas las plantillas"
          data={programaOptions}
          value={programaFiltro || null}
          onChange={v => setProgramaFiltro(v || '')}
          clearable
          searchable
        />
      </Paper>

      {isLoading ? (
        <Text c="dimmed">Cargando plantillas...</Text>
      ) : templatesList.length === 0 ? (
        <Paper p="xl" radius="md" withBorder ta="center">
          <Text c="dimmed">No hay plantillas configuradas</Text>
        </Paper>
      ) : (
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Plantilla</Table.Th>
                <Table.Th>Programa</Table.Th>
                <Table.Th>Dias</Table.Th>
                <Table.Th>Jornadas</Table.Th>
                <Table.Th>Semestres y grupos</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {templatesList.map(template => {
                const diasConfig = Array.isArray(template.dias_config) && template.dias_config.length > 0
                  ? template.dias_config
                  : diasConfigDesdeLegacy(template.dias_semana ?? [], template.jornadas ?? []);
                const semestres = Array.isArray(template.semestres) ? template.semestres : [];
                const programa = programasList.find(p => p.id === template.programa_id);
                return (
                  <Table.Tr key={template.id}>
                    <Table.Td><Text size="sm" fw={600}>{template.nombre}</Text></Table.Td>
                    <Table.Td>
                      <Badge color={template.programa_id ? 'brand' : 'gray'} variant="light">
                        {programa?.nombre ?? 'Global'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {(diasConfig.length ? diasConfig.map(dia => dia.dia_semana) : ['S']).map(dia => (
                          <Badge key={dia} variant="light">{DIA_LABELS[dia]}</Badge>
                        ))}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        {diasConfig.map(dia => (
                          <Text key={dia.dia_semana} size="xs">
                            {DIA_LABELS[dia.dia_semana]}: {dia.jornadas.map(j => `${j.hora_inicio}-${j.hora_fin}`).join(', ')}
                            {dia.max_clases ? ` · max ${dia.max_clases}` : ''}
                          </Text>
                        ))}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {semestres.map(item => (
                          <Badge key={item.semestre} color="success" variant="light">
                            {item.semestre}°: {item.grupos} grupo(s)
                          </Badge>
                        ))}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end">
                        <Tooltip label="Editar">
                          <ActionIcon variant="light" color="brand" onClick={() => openEdit(template)}>
                            <Pencil size={15} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Eliminar">
                          <ActionIcon variant="light" color="red" onClick={() => handleDelete(template)}>
                            <Trash2 size={15} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

        </>
      )}

      {editing && (
      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={700}>{form.id ? 'Editar plantilla' : 'Nueva plantilla'}</Text>
            <Text size="sm" c="dimmed">Configura dias, jornadas, descansos y oferta por semestre.</Text>
          </div>
          <Button variant="subtle" leftSection={<ArrowLeft size={16} />} onClick={closeEditor}>
            Volver
          </Button>
        </Group>
        <Stack gap="md">
          <TextInput
            label="Nombre"
            placeholder="Ej. Sabado completo - Semestres 1 y 3"
            value={form.nombre}
            onChange={event => setForm(f => ({ ...f, nombre: event?.currentTarget?.value ?? '' }))}
            required
          />
          <Group grow>
            <Select
              label="Programa"
              placeholder="Global"
              data={programaOptions}
              value={form.programa_id || null}
              onChange={v => setForm(f => ({ ...f, programa_id: v || '' }))}
              clearable
              searchable
            />
            <MultiSelect
              label="Dias de clase"
              data={DIA_OPTIONS}
              value={form.dias_semana}
              onChange={setDiasSemana}
              clearable={false}
              required
            />
          </Group>

          <Paper p="sm" radius="md" withBorder>
            <Stack gap="xs">
              <Text size="sm" fw={700}>Franjas por dia</Text>
              {form.dias_config.map((dia, diaIndex) => (
                <Stack
                  key={dia.dia_semana}
                  gap="xs"
                  pt={diaIndex === 0 ? 0 : 'sm'}
                  style={diaIndex === 0 ? undefined : { borderTop: '1px solid var(--mantine-color-gray-2)' }}
                >
                  <Group justify="space-between">
                    <Badge variant="light" color="brand">{DIA_LABELS[dia.dia_semana]}</Badge>
                  </Group>
                  {dia.jornadas.map((jornada, index) => (
                    <Group key={index} gap="sm" align="flex-end" wrap="nowrap">
                      <Select
                        label={`Inicio ${index + 1}`}
                        data={HORAS}
                        value={jornada.hora_inicio}
                        onChange={v => setDiaJornada(dia.dia_semana, index, { hora_inicio: v || '07:00' })}
                        styles={{ root: timeInputColumn }}
                      />
                      <Select
                        label={`Fin ${index + 1}`}
                        data={HORAS}
                        value={jornada.hora_fin}
                        onChange={v => setDiaJornada(dia.dia_semana, index, { hora_fin: v || '09:00' })}
                        styles={{ root: timeInputColumn }}
                      />
                      <NumberInput
                        label="Maximo"
                        placeholder="Sin limite"
                        min={1}
                        max={100}
                        value={dia.max_clases ?? ''}
                        onChange={value => setDiaMaxClases(dia.dia_semana, typeof value === 'number' ? value : null)}
                        styles={{ root: compactNumberColumn }}
                      />
                      <NumberInput
                        label="Descanso"
                        suffix=" min"
                        min={0}
                        max={240}
                        value={dia.break_minutos ?? 0}
                        onChange={value => setDiaBreakMinutos(dia.dia_semana, typeof value === 'number' ? value : 0)}
                        styles={{ root: compactNumberColumn }}
                      />
                      <ActionIcon style={iconButtonColumn} variant="light" color="red" onClick={() => removeDiaJornada(dia.dia_semana, index)} disabled={dia.jornadas.length === 1}>
                        <Trash2 size={16} />
                      </ActionIcon>
                      {index === dia.jornadas.length - 1 ? (
                        <Tooltip label="Agregar jornada">
                          <ActionIcon style={iconButtonColumn} variant="light" color="brand" onClick={() => addDiaJornada(dia.dia_semana)}>
                            <Plus size={16} />
                          </ActionIcon>
                        </Tooltip>
                      ) : (
                        <div style={iconButtonColumn} />
                      )}
                    </Group>
                  ))}
                </Stack>
              ))}
              {form.dias_config.length === 0 && (
                <Text size="sm" c="dimmed">Selecciona al menos un dia para configurar franjas.</Text>
              )}
            </Stack>
          </Paper>
          <Paper p="sm" radius="md" withBorder>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={700}>Semestres y grupos</Text>
                <Button size="xs" variant="light" onClick={() => setForm(f => ({ ...f, semestres: [...f.semestres, { semestre: 1, grupos: 1 }] }))}>
                  Agregar otro semestre
                </Button>
              </Group>
              {form.semestres.map((semestre, index) => (
                <Group key={index} grow align="flex-end" wrap="nowrap">
                  <Select
                    label="Semestre del programa"
                    data={semestreOptions}
                    value={String(semestre.semestre)}
                    onChange={v => setSemestre(index, { semestre: Number(v) || 1 })}
                    searchable
                  />
                  <NumberInput label="Grupos" min={1} max={20} value={semestre.grupos} onChange={v => setSemestre(index, { grupos: Number(v) || 1 })} />
                  <ActionIcon style={iconButtonColumn} variant="light" color="red" onClick={() => setForm(f => ({ ...f, semestres: f.semestres.filter((_, idx) => idx !== index) }))} disabled={form.semestres.length === 1}>
                    <Trash2 size={16} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          </Paper>

          <Group justify="flex-end">
            <Button variant="light" onClick={closeEditor}>Cancelar</Button>
            <Button color="brand" onClick={handleSave} loading={createTemplate.isPending || updateTemplate.isPending}>
              Guardar plantilla
            </Button>
          </Group>
        </Stack>
      </Paper>
      )}
    </Stack>
  );
}
