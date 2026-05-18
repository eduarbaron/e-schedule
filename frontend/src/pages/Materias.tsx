import { useState } from 'react';
import {
  Stack, Title, Button, Group, Paper, Text, Badge, ActionIcon,
  Modal, TextInput, NumberInput, Table, Tooltip, Select
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Plus, Trash2 } from 'lucide-react';
import {
  useMaterias,
  useCreateMateria,
  useDeleteMateria,
  useFacultades,
  useDepartamentos,
  useProgramas,
} from '../api/hooks';
import type { Materia, Facultad, Departamento, Programa } from '../types';
import { useConfirm } from '../components/ConfirmProvider';

export function Materias() {
  const confirm = useConfirm();
  const { data: materias = [], isLoading } = useMaterias();
  const { data: facultades = [] } = useFacultades();
  const { data: departamentos = [] } = useDepartamentos();
  const { data: programas = [] } = useProgramas();
  const createMateria = useCreateMateria();
  const deleteMateria = useDeleteMateria();
  const [opened, { open, close }] = useDisclosure(false);
  const [form, setForm] = useState({
    nombre: '', horas_semana: 2, programa_id: '', departamento_id: '', facultad_id_filtro: '',
  });

  const handleCreate = async () => {
    if (!form.nombre) {
      notifications.show({ message: 'El nombre es requerido', color: 'red' });
      return;
    }
    try {
      await createMateria.mutateAsync({
        nombre: form.nombre,
        horas_semana: form.horas_semana,
        programa_id: form.programa_id || null,
        departamento_id: form.departamento_id || null,
      });
      notifications.show({ message: 'Materia creada exitosamente', color: 'green' });
      close();
      setForm({ nombre: '', horas_semana: 2, programa_id: '', departamento_id: '', facultad_id_filtro: '' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al crear materia', color: 'red' });
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!(await confirm({
      title: 'Eliminar materia',
      message: `¿Eliminar la materia "${nombre}"?`,
      confirmLabel: 'Eliminar',
    }))) return;
    try {
      await deleteMateria.mutateAsync(id);
      notifications.show({ message: 'Materia eliminada', color: 'orange' });
    } catch {
      notifications.show({ message: 'Error al eliminar', color: 'red' });
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Materias</Title>
        <Button leftSection={<Plus size={16} />} onClick={open}>Nueva materia</Button>
      </Group>

      {isLoading ? (
        <Text c="dimmed">Cargando materias...</Text>
      ) : (
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Departamento / Facultad</Table.Th>
                <Table.Th>Programa</Table.Th>
                <Table.Th>Horas/semana</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {materias.map((m: Materia) => (
                <Table.Tr key={m.id}>
                  <Table.Td><Text fw={500}>{m.nombre}</Text></Table.Td>
                  <Table.Td>
                    {m.departamento_nombre ? (
                      <Stack gap={0}>
                        <Text size="sm">{m.departamento_nombre}</Text>
                        {m.facultad_nombre && <Text size="xs" c="dimmed">{m.facultad_nombre}</Text>}
                      </Stack>
                    ) : <Text size="sm" c="dimmed">—</Text>}
                  </Table.Td>
                  <Table.Td>
                    {m.programa_nombre
                      ? <Badge variant="light" color="grape">{m.programa_nombre}</Badge>
                      : <Text size="sm" c="dimmed">—</Text>}
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="blue">{m.horas_semana}h</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label="Eliminar materia">
                      <ActionIcon variant="light" color="red" onClick={() => handleDelete(m.id, m.nombre)}>
                        <Trash2 size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      <Modal opened={opened} onClose={close} title="Nueva materia">
        <Stack gap="sm">
          <TextInput
            label="Nombre de la materia"
            placeholder="Ej: Programación I"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            required
          />
          <Select
            label="Facultad"
            placeholder="Seleccionar facultad..."
            data={(facultades as Facultad[]).map((f: Facultad) => ({ value: f.id, label: f.nombre }))}
            value={form.facultad_id_filtro}
            onChange={v => setForm(f => ({ ...f, facultad_id_filtro: v || '', departamento_id: '' }))}
            clearable
            searchable
          />
          <Select
            label="Departamento *"
            placeholder="Seleccionar departamento..."
            data={(departamentos as Departamento[])
              .filter((d: Departamento) => !form.facultad_id_filtro || d.facultad_id === form.facultad_id_filtro)
              .map((d: Departamento) => ({ value: d.id, label: d.nombre }))}
            value={form.departamento_id}
            onChange={v => setForm(f => ({ ...f, departamento_id: v || '' }))}
            clearable
            searchable
            disabled={!form.facultad_id_filtro}
            description="Determina qué docentes pueden impartir esta materia"
          />
          <Select
            label="Programa académico (opcional)"
            placeholder="Seleccionar programa..."
            data={(programas as Programa[]).map((p: Programa) => ({ value: p.id, label: p.nombre }))}
            value={form.programa_id}
            onChange={v => setForm(f => ({ ...f, programa_id: v || '' }))}
            clearable
            searchable
          />
          <NumberInput
            label="Horas semanales"
            value={form.horas_semana}
            onChange={v => setForm(f => ({ ...f, horas_semana: Number(v) }))}
            min={1}
            max={10}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={close}>Cancelar</Button>
            <Button onClick={handleCreate} loading={createMateria.isPending}>Crear materia</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
