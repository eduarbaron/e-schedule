import { useState } from 'react';
import {
  Stack, Title, Button, Group, Paper, Text, Badge, Progress, ActionIcon,
  Modal, TextInput, Select, NumberInput, Table, Tooltip, Alert, SimpleGrid
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Plus, Trash2, Unlock, Lock, Eye, AlertTriangle, Clock } from 'lucide-react';
import { useDocentes, useCelulas, useCreateDocente, useDeleteDocente, useToggleModoLibre, useFacultades, useDepartamentos } from '../api/hooks';
import type { Docente, Facultad, Departamento } from '../types';
import { DocenteDetalle } from '../components/DocenteDetalle';
import { useConfirm } from '../components/ConfirmProvider';

export function Docentes() {
  const confirm = useConfirm();
  const { data: docentes = [], isLoading } = useDocentes();
  const { data: celulas = [] } = useCelulas();
  const createDocente = useCreateDocente();
  const deleteDocente = useDeleteDocente();
  const toggleModoLibre = useToggleModoLibre();

  const { data: facultades = [] } = useFacultades();
  const { data: departamentos = [] } = useDepartamentos();
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'disponibles' | 'completos'>('todos');
  const [form, setForm] = useState({
    nombre: '', email: '', tipo_vinculacion: 'celula', celula_id: '',
    max_horas: 19, departamento_id: '', facultad_id_filtro: '',
  });

  const handleCreate = async () => {
    if (!form.nombre || !form.email) {
      notifications.show({ message: 'Nombre y email son requeridos', color: 'red' });
      return;
    }
    try {
      await createDocente.mutateAsync({
        nombre: form.nombre,
        email: form.email,
        tipo_vinculacion: form.tipo_vinculacion,
        celula_id: form.tipo_vinculacion === 'celula' ? form.celula_id || null : null,
        max_horas: form.max_horas,
        departamento_id: form.departamento_id || null,
      });
      notifications.show({ message: 'Docente creado exitosamente', color: 'green' });
      closeCreate();
      setForm({ nombre: '', email: '', tipo_vinculacion: 'celula', celula_id: '', max_horas: 19, departamento_id: '', facultad_id_filtro: '' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al crear docente', color: 'red' });
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!(await confirm({
      title: 'Eliminar docente',
      message: `¿Eliminar a ${nombre}?`,
      confirmLabel: 'Eliminar',
    }))) return;
    try {
      await deleteDocente.mutateAsync(id);
      notifications.show({ message: 'Docente eliminado', color: 'orange' });
    } catch {
      notifications.show({ message: 'Error al eliminar', color: 'red' });
    }
  };

  const handleToggleModo = async (docente: Docente) => {
    try {
      await toggleModoLibre.mutateAsync(docente.id);
      const nuevoModo = docente.modo_libre === 0;
      notifications.show({
        message: nuevoModo ? `Modo libre activado para ${docente.nombre}` : `Modo libre desactivado para ${docente.nombre}`,
        color: nuevoModo ? 'orange' : 'green',
        icon: nuevoModo ? <Unlock size={16} /> : <Lock size={16} />,
      });
    } catch {
      notifications.show({ message: 'Error al cambiar modo', color: 'red' });
    }
  };

  if (detalleId) {
    return <DocenteDetalle docenteId={detalleId} onBack={() => setDetalleId(null)} />;
  }

  const docentesModoLibre = docentes.filter((d: Docente) => d.modo_libre === 1);
  const docentesConHorasLibres = docentes.filter((d: Docente) => d.horas_asignadas < d.max_horas);
  const totalCapacidad = docentes.reduce((acc: number, d: Docente) => acc + d.max_horas, 0);
  const totalAsignadas = docentes.reduce((acc: number, d: Docente) => acc + d.horas_asignadas, 0);
  const totalDisponibles = Math.max(0, totalCapacidad - totalAsignadas);
  const pctCapacidadUsada = totalCapacidad > 0 ? Math.min(100, Math.round((totalAsignadas / totalCapacidad) * 100)) : 0;

  const docentesFiltrados = docentes.filter((d: Docente) => {
    if (filtro === 'disponibles') return d.horas_asignadas < d.max_horas;
    if (filtro === 'completos') return d.horas_asignadas >= d.max_horas;
    return true;
  });

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Docentes</Title>
        <Button leftSection={<Plus size={16} />} onClick={openCreate}>Nuevo docente</Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        <Paper p="md" radius="md" withBorder>
          <Text size="xs" c="dimmed" fw={700}>Capacidad total</Text>
          <Text size="xl" fw={800}>{totalCapacidad}h</Text>
          <Text size="xs" c="dimmed">{docentes.length} docente(s)</Text>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Text size="xs" c="dimmed" fw={700}>Horas asignadas</Text>
          <Text size="xl" fw={800}>{totalAsignadas}h</Text>
          <Progress value={pctCapacidadUsada} color={pctCapacidadUsada >= 90 ? 'green' : pctCapacidadUsada >= 60 ? 'blue' : 'orange'} size="sm" mt={6} />
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Text size="xs" c="dimmed" fw={700}>Capacidad disponible</Text>
          <Group gap="xs" align="baseline">
            <Text size="xl" fw={800}>{totalDisponibles}h</Text>
            <Badge color={totalDisponibles > 0 ? 'orange' : 'green'} variant="light">
              {100 - pctCapacidadUsada}% libre
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">Disponible para nuevas asignaciones</Text>
        </Paper>
      </SimpleGrid>

      <Group gap="xs">
        <Button
          size="xs"
          variant={filtro === 'todos' ? 'filled' : 'light'}
          color="gray"
          onClick={() => setFiltro('todos')}
        >
          Todos ({docentes.length})
        </Button>
        <Button
          size="xs"
          variant={filtro === 'disponibles' ? 'filled' : 'light'}
          color="orange"
          leftSection={<Clock size={13} />}
          onClick={() => setFiltro('disponibles')}
        >
          Con horas disponibles ({docentesConHorasLibres.length})
        </Button>
        <Button
          size="xs"
          variant={filtro === 'completos' ? 'filled' : 'light'}
          color="green"
          onClick={() => setFiltro('completos')}
        >
          Carga completa ({docentes.length - docentesConHorasLibres.length})
        </Button>
      </Group>

      {docentesModoLibre.length > 0 && (
        <Alert icon={<AlertTriangle size={16} />} color="orange" title="Modo libre activo">
          {docentesModoLibre.length} docente(s) tienen el modo libre habilitado — pueden ser asignados a cualquier célula.
        </Alert>
      )}

      {isLoading ? (
        <Text c="dimmed">Cargando docentes...</Text>
      ) : (
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Célula</Table.Th>
                <Table.Th>Carga</Table.Th>
                <Table.Th>Modo</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {docentesFiltrados.map((d: Docente) => {
                const pct = Math.min(100, Math.round((d.horas_asignadas / d.max_horas) * 100));
                const horasLibres = d.max_horas - d.horas_asignadas;
                const tieneHorasLibres = horasLibres > 0;
                const necesitaModoLibre = tieneHorasLibres && d.tipo_vinculacion === 'celula';
                return (
                  <Table.Tr
                    key={d.id}
                    style={{
                      background: d.modo_libre === 1
                        ? '#fff9f0'
                        : tieneHorasLibres
                        ? '#fffbf0'
                        : undefined,
                      borderLeft: tieneHorasLibres
                        ? '3px solid #fd7e14'
                        : d.horas_asignadas >= d.max_horas
                        ? '3px solid #40c057'
                        : undefined,
                    }}
                  >
                    <Table.Td>
                      <Text fw={500}>{d.nombre}</Text>
                    </Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{d.email}</Text></Table.Td>
                    <Table.Td>
                      <Badge color={d.tipo_vinculacion === 'central' ? 'blue' : 'green'} variant="light">
                        {d.tipo_vinculacion === 'central' ? 'Central' : 'Célula'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{d.celula_nombre ?? '—'}</Text>
                    </Table.Td>
                    <Table.Td style={{ minWidth: 160 }}>
                      <Group gap="xs" wrap="nowrap">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 80 }}>
                          <Group gap={4}>
                            <Text size="xs" c="dimmed">{d.horas_asignadas}/{d.max_horas}h</Text>
                            {tieneHorasLibres && (
                              <Tooltip label={`${horasLibres}h disponibles para asignación manual`}>
                                <Badge
                                  size="xs"
                                  color="orange"
                                  variant="filled"
                                  leftSection={<Clock size={9} />}
                                  style={{ cursor: 'help' }}
                                >
                                  +{horasLibres}h libres
                                </Badge>
                              </Tooltip>
                            )}
                          </Group>
                          <Progress
                            value={pct}
                            color={pct >= 100 ? 'green' : pct >= 60 ? 'blue' : 'orange'}
                            size="sm"
                          />
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {d.modo_libre === 1 ? (
                        <Badge color="orange" variant="filled" leftSection={<Unlock size={11} />}>
                          Libre
                        </Badge>
                      ) : necesitaModoLibre ? (
                        <Badge color="gray" variant="outline" size="sm">Normal</Badge>
                      ) : (
                        <Badge color="green" variant="light" size="sm">Normal</Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="Ver detalle y disponibilidad">
                          <ActionIcon variant="light" color="blue" onClick={() => setDetalleId(d.id)}>
                            <Eye size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label={d.modo_libre === 1 ? 'Desactivar modo libre' : 'Activar modo libre'}>
                          <ActionIcon
                            variant="light"
                            color={d.modo_libre === 1 ? 'orange' : 'gray'}
                            onClick={() => handleToggleModo(d)}
                          >
                            {d.modo_libre === 1 ? <Lock size={16} /> : <Unlock size={16} />}
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Eliminar docente">
                          <ActionIcon variant="light" color="red" onClick={() => handleDelete(d.id, d.nombre)}>
                            <Trash2 size={16} />
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

      <Modal opened={createOpened} onClose={closeCreate} title="Nuevo docente" size="md">
        <Stack gap="sm">
          <TextInput
            label="Nombre completo"
            placeholder="Ej: Juan Pérez"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            required
          />
          <TextInput
            label="Email"
            placeholder="docente@institucion.edu"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
          />
          <Select
            label="Tipo de vinculación"
            data={[
              { value: 'central', label: 'Sede central (movilidad total)' },
              { value: 'celula', label: 'Célula regional (movilidad restringida)' },
            ]}
            value={form.tipo_vinculacion}
            onChange={v => setForm(f => ({ ...f, tipo_vinculacion: v || 'celula' }))}
          />
          {form.tipo_vinculacion === 'celula' && (
            <Select
              label="Célula asignada"
              placeholder="Selecciona célula"
              data={celulas.map((c: any) => ({ value: c.id, label: c.nombre }))}
              value={form.celula_id}
              onChange={v => setForm(f => ({ ...f, celula_id: v || '' }))}
              required
            />
          )}
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
            label="Departamento"
            placeholder="Seleccionar departamento..."
            description="Define qué materias puede impartir este docente"
            data={(departamentos as Departamento[])
              .filter((d: Departamento) => !form.facultad_id_filtro || d.facultad_id === form.facultad_id_filtro)
              .map((d: Departamento) => ({ value: d.id, label: d.nombre }))}
            value={form.departamento_id}
            onChange={v => setForm(f => ({ ...f, departamento_id: v || '' }))}
            clearable
            searchable
            disabled={!form.facultad_id_filtro}
          />
          <NumberInput
            label="Máximo de horas semanales"
            value={form.max_horas}
            onChange={v => setForm(f => ({ ...f, max_horas: Number(v) }))}
            min={1}
            max={40}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={closeCreate}>Cancelar</Button>
            <Button onClick={handleCreate} loading={createDocente.isPending}>Crear docente</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
