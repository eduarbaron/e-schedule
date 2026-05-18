import { useState } from 'react';
import {
  Stack, Title, Button, Group, Paper, Text, Badge, ActionIcon,
  Modal, TextInput, Select, Table, Tooltip, Alert, Switch
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Plus, Trash2, PlayCircle, Info, Calendar, Pencil } from 'lucide-react';
import dayjs from 'dayjs';
import { usePeriodos, useCreatePeriodo, useActivarPeriodo, useDeletePeriodo, useUpdatePeriodo } from '../api/hooks';
import type { Periodo } from '../types';
import { useConfirm } from '../components/ConfirmProvider';

export function Periodos() {
  const confirm = useConfirm();
  const { data: periodos = [], isLoading } = usePeriodos();
  const createPeriodo = useCreatePeriodo();
  const updatePeriodo = useUpdatePeriodo();
  const activarPeriodo = useActivarPeriodo();
  const deletePeriodo = useDeletePeriodo();

  const [opened, { open, close }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [editingPeriodo, setEditingPeriodo] = useState<Periodo | null>(null);
  const [form, setForm] = useState({
    id: '',
    nombre: '',
    fecha_inicio: '',
    calendario_inicio: 'A' as 'A' | 'B',
    activo: false,
  });
  const [editForm, setEditForm] = useState({
    nombre: '',
    fecha_inicio: '',
    calendario_inicio: 'A' as 'A' | 'B',
  });

  const validatePeriodoDate = (fecha: string) => {
    const fechaInicio = dayjs(fecha);
    if (!fechaInicio.isValid()) {
      notifications.show({ message: 'La fecha de inicio no es válida', color: 'red' });
      return false;
    }
    if (fechaInicio.day() !== 1) {
      notifications.show({ message: 'La fecha de inicio debe ser lunes', color: 'red' });
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!form.id || !form.nombre || !form.fecha_inicio) {
      notifications.show({ message: 'ID, nombre y fecha de inicio son requeridos', color: 'red' });
      return;
    }
    if (!validatePeriodoDate(form.fecha_inicio)) return;
    try {
      await createPeriodo.mutateAsync(form);
      notifications.show({ message: 'Período creado exitosamente', color: 'green' });
      close();
      setForm({ id: '', nombre: '', fecha_inicio: '', calendario_inicio: 'A', activo: false });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al crear período', color: 'red' });
    }
  };

  const handleActivar = async (p: Periodo) => {
    if (!(await confirm({
      title: 'Activar período',
      message: `¿Activar el período "${p.nombre}"? El período activo actual quedará inactivo.`,
      confirmLabel: 'Activar',
      color: 'green',
    }))) return;
    try {
      await activarPeriodo.mutateAsync(p.id);
      notifications.show({ message: `Período "${p.nombre}" activado`, color: 'green' });
    } catch {
      notifications.show({ message: 'Error al activar período', color: 'red' });
    }
  };

  const handleOpenEdit = (p: Periodo) => {
    setEditingPeriodo(p);
    setEditForm({
      nombre: p.nombre,
      fecha_inicio: p.fecha_inicio,
      calendario_inicio: p.calendario_inicio,
    });
    openEdit();
  };

  const handleUpdate = async () => {
    if (!editingPeriodo || !editForm.nombre || !editForm.fecha_inicio) {
      notifications.show({ message: 'Nombre y fecha de inicio son requeridos', color: 'red' });
      return;
    }
    if (!validatePeriodoDate(editForm.fecha_inicio)) return;
    try {
      await updatePeriodo.mutateAsync({ id: editingPeriodo.id, ...editForm });
      notifications.show({ message: 'Período actualizado', color: 'green' });
      closeEdit();
      setEditingPeriodo(null);
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al actualizar período', color: 'red' });
    }
  };

  const handleDelete = async (p: Periodo) => {
    if (!(await confirm({
      title: 'Eliminar período',
      message: `¿Eliminar el período "${p.nombre}"?`,
      confirmLabel: 'Eliminar',
    }))) return;
    try {
      await deletePeriodo.mutateAsync(p.id);
      notifications.show({ message: 'Período eliminado', color: 'orange' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al eliminar', color: 'red' });
    }
  };

  const periodoActivo = periodos.find((p: Periodo) => p.activo === 1);

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Períodos académicos</Title>
        <Button leftSection={<Plus size={16} />} onClick={open}>Nuevo período</Button>
      </Group>

      <Alert icon={<Info size={16} />} color="blue" title="Calendarios A y B">
        Los programas <strong>quincenales</strong> alternan entre Calendario A y B cada semana.
        El <strong>calendario de inicio</strong> define cuál es la primera semana del semestre.
        Un docente puede tener clases en Cal-A y Cal-B el mismo horario sin que choquen,
        ya que ocurren en semanas distintas.
      </Alert>

      {periodoActivo && (
        <Paper p="md" radius="md" withBorder style={{ borderColor: '#40c057', background: '#f4fbe8' }}>
          <Group gap="xs">
            <Calendar size={16} color="#40c057" />
            <Text fw={600} c="green.7">Período activo: {periodoActivo.nombre}</Text>
            <Badge color={periodoActivo.calendario_inicio === 'A' ? 'blue' : 'orange'} variant="filled" size="sm">
              Arranca Calendario {periodoActivo.calendario_inicio}
            </Badge>
            <Text size="sm" c="dimmed">desde {periodoActivo.fecha_inicio}</Text>
          </Group>
        </Paper>
      )}

      {isLoading ? (
        <Text c="dimmed">Cargando períodos...</Text>
      ) : periodos.length === 0 ? (
        <Paper p="xl" radius="md" withBorder ta="center">
          <Text c="dimmed">No hay períodos creados aún</Text>
        </Paper>
      ) : (
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID / Período</Table.Th>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Fecha inicio</Table.Th>
                <Table.Th>Cal. inicio</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {periodos.map((p: Periodo) => (
                <Table.Tr key={p.id} style={p.activo === 1 ? { background: '#f4fbe8' } : undefined}>
                  <Table.Td>
                    <Text size="sm" fw={600} ff="monospace">{p.id}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>{p.nombre}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">{p.fecha_inicio}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      variant="filled"
                      color={p.calendario_inicio === 'A' ? 'blue' : 'orange'}
                      size="sm"
                    >
                      Calendario {p.calendario_inicio}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {p.activo === 1 ? (
                      <Badge color="green" variant="light">Activo</Badge>
                    ) : (
                      <Badge color="gray" variant="light">Inactivo</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="Editar período">
                        <ActionIcon variant="light" color="blue" onClick={() => handleOpenEdit(p)}>
                          <Pencil size={16} />
                        </ActionIcon>
                      </Tooltip>
                      {p.activo !== 1 && (
                        <Tooltip label="Activar período">
                          <ActionIcon variant="light" color="green" onClick={() => handleActivar(p)}>
                            <PlayCircle size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      {p.activo !== 1 && (
                        <Tooltip label="Eliminar período">
                          <ActionIcon variant="light" color="red" onClick={() => handleDelete(p)}>
                            <Trash2 size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      <Modal opened={opened} onClose={close} title="Nuevo período académico" size="md">
        <Stack gap="sm">
          <TextInput
            label="ID del período"
            placeholder="Ej: 2025-1"
            description="Identificador único (ej: 2025-1, 2025-2)"
            value={form.id}
            onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
            required
          />
          <TextInput
            label="Nombre"
            placeholder="Ej: Semestre 2025-I"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            required
          />
          <DateInput
            label="Fecha de inicio"
            placeholder="Selecciona una fecha"
            description="Primer lunes del semestre"
            value={form.fecha_inicio}
            onChange={value => setForm(f => ({ ...f, fecha_inicio: value || '' }))}
            valueFormat="YYYY-MM-DD"
            clearable
            firstDayOfWeek={1}
            weekendDays={[0]}
            required
          />
          <Select
            label="Calendario de inicio"
            description="¿En qué calendario arranca la primera semana del semestre?"
            data={[
              { value: 'A', label: 'Calendario A (primera semana es A)' },
              { value: 'B', label: 'Calendario B (primera semana es B)' },
            ]}
            value={form.calendario_inicio}
            onChange={v => setForm(f => ({ ...f, calendario_inicio: (v || 'A') as 'A' | 'B' }))}
          />
          <Switch
            label="Activar este período inmediatamente"
            description="El período activo actual quedará inactivo"
            checked={form.activo}
            onChange={e => {
              const activo = e.currentTarget.checked;
              setForm(f => ({ ...f, activo }));
            }}
            color="green"
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={close}>Cancelar</Button>
            <Button onClick={handleCreate} loading={createPeriodo.isPending}>Crear período</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={editOpened} onClose={closeEdit} title={`Editar período ${editingPeriodo?.id ?? ''}`} size="md">
        <Stack gap="sm">
          <TextInput
            label="ID del período"
            value={editingPeriodo?.id ?? ''}
            disabled
            description="El identificador no se modifica para conservar las referencias existentes"
          />
          <TextInput
            label="Nombre"
            placeholder="Ej: Semestre 2025-I"
            value={editForm.nombre}
            onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))}
            required
          />
          <DateInput
            label="Fecha de inicio"
            placeholder="Selecciona una fecha"
            description="Primer lunes del semestre"
            value={editForm.fecha_inicio}
            onChange={value => setEditForm(f => ({ ...f, fecha_inicio: value || '' }))}
            valueFormat="YYYY-MM-DD"
            clearable
            firstDayOfWeek={1}
            weekendDays={[0]}
            required
          />
          <Select
            label="Calendario de inicio"
            data={[
              { value: 'A', label: 'Calendario A (primera semana es A)' },
              { value: 'B', label: 'Calendario B (primera semana es B)' },
            ]}
            value={editForm.calendario_inicio}
            onChange={v => setEditForm(f => ({ ...f, calendario_inicio: (v || 'A') as 'A' | 'B' }))}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={closeEdit}>Cancelar</Button>
            <Button onClick={handleUpdate} loading={updatePeriodo.isPending}>Guardar cambios</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
