import { useState } from 'react';
import {
  Stack, Title, Button, Group, Paper, Text, Badge, ActionIcon,
  Modal, TextInput, Textarea, Table, Tooltip, Accordion, ThemeIcon
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Plus, Trash2, Building, BookOpen } from 'lucide-react';
import {
  useFacultades, useCreateFacultad, useDeleteFacultad,
  useDepartamentos, useCreateDepartamento, useDeleteDepartamento,
} from '../api/hooks';
import type { Facultad, Departamento } from '../types';
import { useConfirm } from '../components/ConfirmProvider';

export function Facultades() {
  const confirm = useConfirm();
  const { data: facultades = [], isLoading } = useFacultades();
  const { data: departamentos = [] } = useDepartamentos();
  const createFacultad = useCreateFacultad();
  const deleteFacultad = useDeleteFacultad();
  const createDepartamento = useCreateDepartamento();
  const deleteDepartamento = useDeleteDepartamento();

  const [facOpened, { open: openFac, close: closeFac }] = useDisclosure(false);
  const [depOpened, { open: openDep, close: closeDep }] = useDisclosure(false);

  const [facForm, setFacForm] = useState({ nombre: '', descripcion: '' });
  const [depForm, setDepForm] = useState({ nombre: '', descripcion: '', facultad_id: '' });

  const handleCreateFacultad = async () => {
    if (!facForm.nombre) {
      notifications.show({ message: 'El nombre es requerido', color: 'red' });
      return;
    }
    try {
      await createFacultad.mutateAsync(facForm);
      notifications.show({ message: 'Facultad creada', color: 'green' });
      closeFac();
      setFacForm({ nombre: '', descripcion: '' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al crear facultad', color: 'red' });
    }
  };

  const handleDeleteFacultad = async (f: Facultad) => {
    if (!(await confirm({
      title: 'Eliminar facultad',
      message: `¿Eliminar la facultad "${f.nombre}"? Se eliminarán todos sus departamentos.`,
      confirmLabel: 'Eliminar',
    }))) return;
    try {
      await deleteFacultad.mutateAsync(f.id);
      notifications.show({ message: 'Facultad eliminada', color: 'orange' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al eliminar', color: 'red' });
    }
  };

  const handleCreateDepartamento = async () => {
    if (!depForm.nombre || !depForm.facultad_id) {
      notifications.show({ message: 'Nombre y facultad son requeridos', color: 'red' });
      return;
    }
    try {
      await createDepartamento.mutateAsync(depForm);
      notifications.show({ message: 'Departamento creado', color: 'green' });
      closeDep();
      setDepForm({ nombre: '', descripcion: '', facultad_id: '' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al crear departamento', color: 'red' });
    }
  };

  const handleDeleteDepartamento = async (d: Departamento) => {
    if (!(await confirm({
      title: 'Eliminar departamento',
      message: `¿Eliminar el departamento "${d.nombre}"?`,
      confirmLabel: 'Eliminar',
    }))) return;
    try {
      await deleteDepartamento.mutateAsync(d.id);
      notifications.show({ message: 'Departamento eliminado', color: 'orange' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al eliminar', color: 'red' });
    }
  };

  const depsPorFacultad = (facultadId: string) =>
    (departamentos as Departamento[]).filter(d => d.facultad_id === facultadId);

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Facultades y departamentos</Title>
        <Group>
          <Button variant="light" leftSection={<Plus size={16} />} onClick={openDep}>
            Nuevo departamento
          </Button>
          <Button leftSection={<Plus size={16} />} onClick={openFac}>
            Nueva facultad
          </Button>
        </Group>
      </Group>

      {isLoading ? (
        <Text c="dimmed">Cargando...</Text>
      ) : (facultades as Facultad[]).length === 0 ? (
        <Paper p="xl" radius="md" withBorder ta="center">
          <Text c="dimmed">No hay facultades creadas aún</Text>
        </Paper>
      ) : (
        <Accordion variant="separated" radius="md">
          {(facultades as Facultad[]).map((f: Facultad) => {
            const deps = depsPorFacultad(f.id);
            return (
              <Accordion.Item key={f.id} value={f.id}>
                <Accordion.Control>
                  <Group justify="space-between" pr="md">
                    <Group gap="sm">
                      <ThemeIcon color="blue" variant="light" size="md">
                        <Building size={16} />
                      </ThemeIcon>
                      <div>
                        <Text fw={600}>{f.nombre}</Text>
                        {f.descripcion && <Text size="xs" c="dimmed">{f.descripcion}</Text>}
                      </div>
                    </Group>
                    <Badge variant="light" color="blue" size="sm">
                      {deps.length} departamento{deps.length !== 1 ? 's' : ''}
                    </Badge>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="sm">
                    {deps.length === 0 ? (
                      <Text size="sm" c="dimmed" ta="center" py="xs">
                        Sin departamentos — usa "Nuevo departamento" para añadir
                      </Text>
                    ) : (
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Departamento</Table.Th>
                            <Table.Th>Descripción</Table.Th>
                            <Table.Th></Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {deps.map((d: Departamento) => (
                            <Table.Tr key={d.id}>
                              <Table.Td>
                                <Group gap="xs">
                                  <BookOpen size={14} color="#7950f2" />
                                  <Text size="sm" fw={500}>{d.nombre}</Text>
                                </Group>
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm" c="dimmed">{d.descripcion || '—'}</Text>
                              </Table.Td>
                              <Table.Td>
                                <Tooltip label="Eliminar departamento">
                                  <ActionIcon variant="light" color="red" size="sm"
                                    onClick={() => handleDeleteDepartamento(d)}>
                                    <Trash2 size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    )}
                    <Group justify="flex-end">
                      <Tooltip label="Eliminar facultad">
                        <ActionIcon variant="light" color="red" onClick={() => handleDeleteFacultad(f)}>
                          <Trash2 size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>
      )}

      {/* Modal nueva facultad */}
      <Modal opened={facOpened} onClose={closeFac} title="Nueva facultad" size="md">
        <Stack gap="sm">
          <TextInput
            label="Nombre de la facultad"
            placeholder="Ej: Facultad de Ingeniería"
            value={facForm.nombre}
            onChange={e => setFacForm(f => ({ ...f, nombre: e.target.value }))}
            required
          />
          <Textarea
            label="Descripción (opcional)"
            value={facForm.descripcion}
            onChange={e => setFacForm(f => ({ ...f, descripcion: e.target.value }))}
            rows={2}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={closeFac}>Cancelar</Button>
            <Button onClick={handleCreateFacultad} loading={createFacultad.isPending}>Crear facultad</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal nuevo departamento */}
      <Modal opened={depOpened} onClose={closeDep} title="Nuevo departamento" size="md">
        <Stack gap="sm">
          <TextInput
            label="Nombre del departamento"
            placeholder="Ej: Departamento de Matemáticas"
            value={depForm.nombre}
            onChange={e => setDepForm(f => ({ ...f, nombre: e.target.value }))}
            required
          />
          <Textarea
            label="Descripción (opcional)"
            value={depForm.descripcion}
            onChange={e => setDepForm(f => ({ ...f, descripcion: e.target.value }))}
            rows={2}
          />
          <Stack gap="xs">
            <Text size="sm" fw={500}>Facultad *</Text>
            {(facultades as Facultad[]).map((f: Facultad) => (
              <Paper
                key={f.id}
                p="sm"
                radius="md"
                withBorder
                style={{
                  cursor: 'pointer',
                  borderColor: depForm.facultad_id === f.id ? '#228be6' : undefined,
                  background: depForm.facultad_id === f.id ? '#e7f5ff' : undefined,
                }}
                onClick={() => setDepForm(d => ({ ...d, facultad_id: f.id }))}
              >
                <Text size="sm" fw={depForm.facultad_id === f.id ? 600 : 400}>{f.nombre}</Text>
              </Paper>
            ))}
          </Stack>
          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={closeDep}>Cancelar</Button>
            <Button onClick={handleCreateDepartamento} loading={createDepartamento.isPending}>
              Crear departamento
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
