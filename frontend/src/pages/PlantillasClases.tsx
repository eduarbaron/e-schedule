import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
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
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { CalendarPlus, Pencil, Trash2 } from 'lucide-react';
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

type TemplateForm = {
  id: string;
  nombre: string;
  programa_id: string;
  dias_semana: string[];
  jornadas: JornadaForm[];
  semestres: { semestre: number; grupos: number }[];
};

const defaultForm = (programaId = ''): TemplateForm => ({
  id: '',
  nombre: '',
  programa_id: programaId,
  dias_semana: ['S'],
  jornadas: [
    { hora_inicio: '07:00', hora_fin: '13:00' },
    { hora_inicio: '14:00', hora_fin: '17:00' },
  ],
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
  const [opened, { open, close }] = useDisclosure(false);
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
    open();
  };

  const openEdit = (template: ClaseTemplate) => {
    setForm({
      id: template.id,
      nombre: template.nombre,
      programa_id: template.programa_id ?? '',
      dias_semana: template.dias_semana?.length ? template.dias_semana : ['S'],
      jornadas: Array.isArray(template.jornadas) && template.jornadas.length > 0 ? template.jornadas : defaultForm().jornadas,
      semestres: Array.isArray(template.semestres) && template.semestres.length > 0 ? template.semestres : [{ semestre: 1, grupos: 1 }],
    });
    open();
  };

  const setJornada = (index: number, patch: Partial<JornadaForm>) => {
    setForm(f => ({
      ...f,
      jornadas: f.jornadas.map((jornada, idx) => idx === index ? { ...jornada, ...patch } : jornada),
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
    if (form.jornadas.some(j => !j.hora_inicio || !j.hora_fin || j.hora_inicio >= j.hora_fin)) {
      notifications.show({ message: 'Cada jornada debe tener hora inicio menor que hora fin', color: 'red' });
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
      dias_semana: form.dias_semana,
      jornadas: form.jornadas,
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
      close();
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
        <Button leftSection={<CalendarPlus size={16} />} color="brand" onClick={openCreate}>
          Nueva plantilla
        </Button>
      </Group>

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
                const jornadas = Array.isArray(template.jornadas) ? template.jornadas : [];
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
                        {(template.dias_semana?.length ? template.dias_semana : ['S']).map(dia => (
                          <Badge key={dia} variant="light">{DIA_LABELS[dia]}</Badge>
                        ))}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        {jornadas.map((jornada, index) => (
                          <Text key={index} size="xs">{jornada.hora_inicio} - {jornada.hora_fin}</Text>
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

      <Modal
        opened={opened}
        onClose={close}
        title={form.id ? 'Editar plantilla' : 'Nueva plantilla'}
        size="lg"
        styles={{ content: { overflow: 'hidden' }, body: { maxHeight: 'calc(100dvh - 140px)', overflowY: 'auto' } }}
      >
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
              onChange={v => setForm(f => ({ ...f, dias_semana: v }))}
              clearable={false}
              required
            />
          </Group>

          <Paper p="sm" radius="md" withBorder>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={700}>Jornadas</Text>
                <Button size="xs" variant="light" onClick={() => setForm(f => ({ ...f, jornadas: [...f.jornadas, { hora_inicio: '07:00', hora_fin: '09:00' }] }))}>
                  Agregar jornada
                </Button>
              </Group>
              {form.jornadas.map((jornada, index) => (
                <Group key={index} grow align="flex-end" wrap="nowrap">
                  <Select label={`Inicio ${index + 1}`} data={HORAS} value={jornada.hora_inicio} onChange={v => setJornada(index, { hora_inicio: v || '07:00' })} />
                  <Select label={`Fin ${index + 1}`} data={HORAS} value={jornada.hora_fin} onChange={v => setJornada(index, { hora_fin: v || '09:00' })} />
                  <ActionIcon style={iconButtonColumn} variant="light" color="red" onClick={() => setForm(f => ({ ...f, jornadas: f.jornadas.filter((_, idx) => idx !== index) }))} disabled={form.jornadas.length === 1}>
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
            <Button variant="light" onClick={close}>Cancelar</Button>
            <Button color="brand" onClick={handleSave} loading={createTemplate.isPending || updateTemplate.isPending}>
              Guardar plantilla
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
