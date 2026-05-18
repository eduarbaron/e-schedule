import { useState } from 'react';
import {
  Stack, Title, Button, Group, Paper, Text, Badge, ActionIcon,
  Modal, Select, Table, Divider, Skeleton, ThemeIcon
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { ArrowLeft, Plus, Trash2, Clock, MapPin } from 'lucide-react';
import { useDocente, useDocenteDisponibilidad, useDocenteAsignaciones, useAddDisponibilidad, useDeleteDisponibilidad, useDeleteAsignacion } from '../api/hooks';
import type { Disponibilidad, Asignacion } from '../types';
import { DIA_LABELS } from '../types';
import { useConfirm } from './ConfirmProvider';
import { usePeriodoTrabajo } from '../context/PeriodoContext';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S'];
const HORAS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

interface Props {
  docenteId: string;
  onBack: () => void;
}

export function DocenteDetalle({ docenteId, onBack }: Props) {
  const confirm = useConfirm();
  const { periodoId, periodoSeleccionado } = usePeriodoTrabajo();
  const { data: docente, isLoading } = useDocente(docenteId);
  const { data: disponibilidad = [] } = useDocenteDisponibilidad(docenteId);
  const { data: asignaciones = [] } = useDocenteAsignaciones(docenteId, periodoId);
  const addDisp = useAddDisponibilidad();
  const deleteDisp = useDeleteDisponibilidad();
  const deleteAsig = useDeleteAsignacion();

  const [dispOpened, { open: openDisp, close: closeDisp }] = useDisclosure(false);
  const [dispForm, setDispForm] = useState({ dia_semana: 'L', hora_inicio: '07:00', hora_fin: '12:00' });

  const handleAddDisp = async () => {
    try {
      await addDisp.mutateAsync({ docenteId, ...dispForm });
      notifications.show({ message: 'Disponibilidad agregada', color: 'green' });
      closeDisp();
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error', color: 'red' });
    }
  };

  const handleDeleteAsig = async (id: string) => {
    if (!(await confirm({
      title: 'Eliminar asignación',
      message: '¿Eliminar esta asignación?',
      confirmLabel: 'Eliminar',
    }))) return;
    try {
      await deleteAsig.mutateAsync(id);
      notifications.show({ message: 'Asignación eliminada', color: 'orange' });
    } catch {
      notifications.show({ message: 'Error al eliminar', color: 'red' });
    }
  };

  if (isLoading) return <Skeleton h={400} />;
  if (!docente) return <Text>Docente no encontrado</Text>;

  const pct = Math.min(100, Math.round((docente.horas_asignadas / docente.max_horas) * 100));
  const modoLabel = (modo: Asignacion['modo']) =>
    modo === 'libre' ? 'Libre manual' : modo === 'foraneo' ? 'Foráneo' : 'Automático';
  const modoColor = (modo: Asignacion['modo']) =>
    modo === 'libre' ? 'orange' : modo === 'foraneo' ? 'yellow' : 'green';

  return (
    <Stack gap="lg">
      <Group>
        <Button variant="subtle" leftSection={<ArrowLeft size={16} />} onClick={onBack}>
          Volver
        </Button>
        <Title order={2}>{docente.nombre}</Title>
        {docente.modo_libre === 1 && (
          <Badge color="orange" variant="filled" size="lg">Modo libre</Badge>
        )}
      </Group>

      <Group gap="lg">
        <Paper p="lg" radius="md" withBorder style={{ flex: 1 }}>
          <Stack gap="xs">
            <Text size="xs" c="dimmed" fw={600}>Información</Text>
            <Group gap="xs">
              <Text size="sm" c="dimmed">Email:</Text>
              <Text size="sm">{docente.email}</Text>
            </Group>
            <Group gap="xs">
              <Text size="sm" c="dimmed">Tipo:</Text>
              <Badge color={docente.tipo_vinculacion === 'central' ? 'blue' : 'green'} variant="light">
                {docente.tipo_vinculacion === 'central' ? 'Sede Central' : 'Célula Regional'}
              </Badge>
            </Group>
            {docente.celula_nombre && (
              <Group gap="xs">
                <Text size="sm" c="dimmed">Célula:</Text>
                <Text size="sm">{docente.celula_nombre}</Text>
              </Group>
            )}
            <Group gap="xs">
              <Text size="sm" c="dimmed">Horas asignadas:</Text>
              <Text size="sm" fw={600}>{docente.horas_asignadas} / {docente.max_horas}h ({pct}%)</Text>
            </Group>
          </Stack>
        </Paper>
      </Group>

      <Divider />

      <Group justify="space-between">
        <Group gap="xs">
          <ThemeIcon size="md" color="blue" variant="light">
            <Clock size={16} />
          </ThemeIcon>
          <Text fw={600} size="lg">Disponibilidad</Text>
        </Group>
        <Button size="xs" leftSection={<Plus size={14} />} onClick={openDisp}>Agregar bloque</Button>
      </Group>

      {disponibilidad.length === 0 ? (
        <Text c="dimmed" size="sm">Sin disponibilidad registrada</Text>
      ) : (
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Día</Table.Th>
                <Table.Th>Hora inicio</Table.Th>
                <Table.Th>Hora fin</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {disponibilidad.map((d: Disponibilidad) => (
                <Table.Tr key={d.id}>
                  <Table.Td><Badge variant="light">{DIA_LABELS[d.dia_semana]}</Badge></Table.Td>
                  <Table.Td>{d.hora_inicio}</Table.Td>
                  <Table.Td>{d.hora_fin}</Table.Td>
                  <Table.Td>
                    <ActionIcon size="sm" variant="light" color="red"
                      onClick={() => deleteDisp.mutateAsync({ docenteId, dispId: d.id })}>
                      <Trash2 size={14} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      <Divider />

      <Group gap="xs">
        <ThemeIcon size="md" color="violet" variant="light">
          <MapPin size={16} />
        </ThemeIcon>
        <Text fw={600} size="lg">Asignaciones ({periodoSeleccionado?.nombre ?? (periodoId || 'periodo de trabajo')})</Text>
      </Group>

      {asignaciones.length === 0 ? (
        <Text c="dimmed" size="sm">Sin asignaciones en este período</Text>
      ) : (
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Día</Table.Th>
                <Table.Th>Horario</Table.Th>
                <Table.Th>Materia</Table.Th>
                <Table.Th>Sede</Table.Th>
                <Table.Th>Modo</Table.Th>
                <Table.Th>Distancia</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {asignaciones.map((a: Asignacion) => (
                <Table.Tr key={a.id} style={a.modo === 'libre' || a.modo === 'foraneo' ? { background: '#fff9f0' } : {}}>
                  <Table.Td><Badge variant="light">{DIA_LABELS[a.dia_semana]}</Badge></Table.Td>
                  <Table.Td><Text size="sm">{a.hora_inicio} – {a.hora_fin}</Text></Table.Td>
                  <Table.Td><Text size="sm" fw={500}>{a.materia_nombre}</Text></Table.Td>
                  <Table.Td><Text size="sm">{a.sede_nombre}</Text></Table.Td>
                  <Table.Td>
                    <Badge color={modoColor(a.modo)} variant="light" size="sm">
                      {modoLabel(a.modo)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {a.distancia_km != null ? `${a.distancia_km.toFixed(1)} km` : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon size="sm" variant="light" color="red" onClick={() => handleDeleteAsig(a.id)}>
                      <Trash2 size={14} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      <Modal opened={dispOpened} onClose={closeDisp} title="Agregar bloque de disponibilidad">
        <Stack gap="sm">
          <Select
            label="Día de la semana"
            data={DIAS.map(d => ({ value: d, label: DIA_LABELS[d] }))}
            value={dispForm.dia_semana}
            onChange={v => setDispForm(f => ({ ...f, dia_semana: v || 'L' }))}
          />
          <Select
            label="Hora inicio"
            data={HORAS}
            value={dispForm.hora_inicio}
            onChange={v => setDispForm(f => ({ ...f, hora_inicio: v || '07:00' }))}
          />
          <Select
            label="Hora fin"
            data={HORAS}
            value={dispForm.hora_fin}
            onChange={v => setDispForm(f => ({ ...f, hora_fin: v || '12:00' }))}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={closeDisp}>Cancelar</Button>
            <Button onClick={handleAddDisp} loading={addDisp.isPending}>Agregar</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
