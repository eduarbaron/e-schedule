import { useState } from 'react';
import {
  Stack, Title, Button, Group, Paper, Text, Badge, ActionIcon,
  Modal, TextInput, Select, Tooltip, Accordion, ThemeIcon, Tabs, Table, Alert
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Plus, Trash2, MapPin, BookOpen, Pencil, Building2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  useCelulas, useCreateCelula, useSedes, useCreateSede, useUpdateSede, useDeleteSede,
  useSedesProgramas,
} from '../api/hooks';
import type { Celula, Sede, Programa } from '../types';
import { TIPO_SEDE_COLORS, TIPO_SEDE_LABELS } from '../types';
import api from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '../components/ConfirmProvider';

const PIN_ICON = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#228be6;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

const CENTRO_MAPA: [number, number] = [8.749, -75.874];

function ProgramasSede({ sede }: { sede: Sede }) {
  const { data: programasSede = [], isLoading } = useSedesProgramas(sede.id);

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Esta lista es informativa. La oferta de sedes se edita desde Programas.
      </Text>
      {isLoading ? <Text size="sm" c="dimmed">Cargando...</Text>
        : (programasSede as Programa[]).length === 0 ? (
          <Text size="sm" c="dimmed" ta="center">Sin programas asignados</Text>
        ) : (
          <Stack gap="xs">
            {(programasSede as Programa[]).map((p: Programa) => (
              <Group key={p.id} justify="space-between" px="xs">
                <Group gap="xs">
                  <BookOpen size={13} color="#7950f2" />
                  <Text size="sm">{p.nombre}</Text>
                </Group>
              </Group>
            ))}
          </Stack>
        )}
    </Stack>
  );
}

function SedesTable({
  sedes, onEdit, onDelete,
}: {
  sedes: Sede[];
  onEdit: (s: Sede) => void;
  onDelete: (s: Sede) => void;
}) {
  const [sedePrograma, setSedePrograma] = useState<Sede | null>(null);
  const [progOpened, { open: openProg, close: closeProg }] = useDisclosure(false);

  if (sedes.length === 0) {
    return <Text size="sm" c="dimmed" ta="center" py="xs">Sin sedes — usa "Añadir sede" para comenzar</Text>;
  }

  return (
    <>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nombre</Table.Th>
            <Table.Th>Tipo</Table.Th>
            <Table.Th>Coordenadas</Table.Th>
            <Table.Th>Dirección</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sedes.map(s => (
            <Table.Tr key={s.id}>
              <Table.Td><Text size="sm" fw={500}>{s.nombre}</Text></Table.Td>
              <Table.Td>
                <Badge size="xs" variant="light"
                  style={{ background: TIPO_SEDE_COLORS[s.tipo] + '22', color: TIPO_SEDE_COLORS[s.tipo] }}>
                  {TIPO_SEDE_LABELS[s.tipo]}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="xs" c="dimmed">{s.latitud.toFixed(4)}, {s.longitud.toFixed(4)}</Text>
              </Table.Td>
              <Table.Td><Text size="xs" c="dimmed">{s.direccion ?? '—'}</Text></Table.Td>
              <Table.Td>
                <Group gap={4}>
                  <Tooltip label="Programas ofertados">
                    <ActionIcon size="sm" variant="light" color="violet"
                      onClick={() => { setSedePrograma(s); openProg(); }}>
                      <BookOpen size={13} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Editar sede">
                    <ActionIcon size="sm" variant="light" color="brand" onClick={() => onEdit(s)}>
                      <Pencil size={13} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Eliminar sede">
                    <ActionIcon size="sm" variant="light" color="red" onClick={() => onDelete(s)}>
                      <Trash2 size={13} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={progOpened} onClose={closeProg}
        title={sedePrograma ? `Programas — ${sedePrograma.nombre}` : 'Programas'} size="md">
        {sedePrograma && <ProgramasSede sede={sedePrograma} />}
      </Modal>
    </>
  );
}

export function Celulas() {
  const confirm = useConfirm();
  const { data: celulas = [], isLoading } = useCelulas();
  const { data: sedes = [] } = useSedes();
  const createCelula = useCreateCelula();
  const createSede = useCreateSede();
  const updateSede = useUpdateSede();
  const deleteSede = useDeleteSede();
  const qc = useQueryClient();

  const [celulaOpened, { open: openCelula, close: closeCelula }] = useDisclosure(false);
  const [sedeOpened, { open: openSede, close: closeSede }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);

  const [celulaForm, setCelulaForm] = useState({ nombre: '', municipio: '' });
  const [targetCelulaId, setTargetCelulaId] = useState<string | null>(null);

  const [sedeForm, setSedeForm] = useState({
    nombre: '', tipo: 'municipal', celula_id: '', latitud: '', longitud: '', direccion: '',
  });
  const [pinPos, setPinPos] = useState<[number, number] | null>(null);

  const [editingSede, setEditingSede] = useState<Sede | null>(null);
  const [editForm, setEditForm] = useState({
    nombre: '', tipo: 'municipal', celula_id: '', latitud: '', longitud: '', direccion: '',
  });
  const [editPinPos, setEditPinPos] = useState<[number, number] | null>(null);

  const handleCreateCelula = async () => {
    if (!celulaForm.nombre || !celulaForm.municipio) {
      notifications.show({ message: 'Nombre y municipio son requeridos', color: 'red' });
      return;
    }
    try {
      await createCelula.mutateAsync(celulaForm);
      notifications.show({ message: 'Célula creada', color: 'green' });
      closeCelula();
      setCelulaForm({ nombre: '', municipio: '' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al crear célula', color: 'red' });
    }
  };

  const handleDeleteCelula = async (c: Celula) => {
    if (!(await confirm({
      title: 'Eliminar célula',
      message: `¿Eliminar la célula "${c.nombre}"? Sus sedes quedarán sin célula.`,
      confirmLabel: 'Eliminar',
    }))) return;
    try {
      await api.delete(`/celulas/${c.id}`);
      qc.invalidateQueries({ queryKey: ['celulas'] });
      notifications.show({ message: 'Célula eliminada', color: 'orange' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al eliminar', color: 'red' });
    }
  };

  const handleOpenAddSede = (celulaId: string | null) => {
    setTargetCelulaId(celulaId);
    setSedeForm({ nombre: '', tipo: celulaId ? 'celula' : 'central', celula_id: celulaId ?? '', latitud: '', longitud: '', direccion: '' });
    setPinPos(null);
    openSede();
  };

  const handleCreateSede = async () => {
    if (!sedeForm.nombre || !sedeForm.latitud || !sedeForm.longitud) {
      notifications.show({ message: 'Nombre y ubicación en el mapa son requeridos', color: 'red' });
      return;
    }
    try {
      await createSede.mutateAsync({
        nombre: sedeForm.nombre,
        tipo: sedeForm.tipo,
        celula_id: sedeForm.celula_id || null,
        latitud: parseFloat(sedeForm.latitud),
        longitud: parseFloat(sedeForm.longitud),
        direccion: sedeForm.direccion || null,
      });
      notifications.show({ message: 'Sede creada', color: 'green' });
      closeSede();
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al crear sede', color: 'red' });
    }
  };

  const handleOpenEdit = (s: Sede) => {
    setEditingSede(s);
    setEditForm({
      nombre: s.nombre, tipo: s.tipo,
      celula_id: (s as any).celula_id ?? '',
      latitud: String(s.latitud), longitud: String(s.longitud),
      direccion: s.direccion ?? '',
    });
    setEditPinPos([s.latitud, s.longitud]);
    openEdit();
  };

  const handleUpdateSede = async () => {
    if (!editingSede || !editForm.nombre || !editForm.latitud || !editForm.longitud) {
      notifications.show({ message: 'Nombre y ubicación son requeridos', color: 'red' });
      return;
    }
    try {
      await updateSede.mutateAsync({
        id: editingSede.id,
        nombre: editForm.nombre, tipo: editForm.tipo,
        celula_id: editForm.celula_id || null,
        latitud: parseFloat(editForm.latitud),
        longitud: parseFloat(editForm.longitud),
        direccion: editForm.direccion || null,
      });
      notifications.show({ message: 'Sede actualizada', color: 'green' });
      closeEdit();
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al actualizar', color: 'red' });
    }
  };

  const handleDeleteSede = async (s: Sede) => {
    if (!(await confirm({
      title: 'Eliminar sede',
      message: `¿Eliminar la sede "${s.nombre}"?`,
      confirmLabel: 'Eliminar',
    }))) return;
    try {
      await deleteSede.mutateAsync(s.id);
      notifications.show({ message: 'Sede eliminada', color: 'orange' });
    } catch {
      notifications.show({ message: 'Error al eliminar', color: 'red' });
    }
  };

  const sedesDeCelula = (celulaId: string) =>
    (sedes as Sede[]).filter(s => (s as any).celula_id === celulaId);
  const sedesSinCelula = (sedes as Sede[]).filter(s => !(s as any).celula_id);

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Células regionales y sedes</Title>
        <Group>
          <Button variant="light" leftSection={<Plus size={16} />} onClick={() => handleOpenAddSede(null)}>
            Nueva sede central
          </Button>
          <Button leftSection={<Plus size={16} />} onClick={openCelula}>
            Nueva célula
          </Button>
        </Group>
      </Group>

      <Text c="dimmed" size="sm">
        Las células son nodos administrativos regionales. Cada célula agrupa sus sedes. Los docentes de célula solo pueden asignarse a sedes dentro de su célula (salvo Modo Libre).
      </Text>

      {isLoading ? (
        <Text c="dimmed">Cargando...</Text>
      ) : (
        <Accordion variant="separated" radius="md">
          {/* ── Sedes sin célula (central) ── */}
          {sedesSinCelula.length > 0 && (
            <Accordion.Item value="__sin_celula__">
              <Accordion.Control>
                <Group justify="space-between" pr="md">
                  <Group gap="sm">
                    <ThemeIcon color="brand" variant="light" size="md">
                      <Building2 size={15} />
                    </ThemeIcon>
                    <div>
                      <Text fw={600}>Sede central</Text>
                      <Text size="xs" c="dimmed">Sin célula regional asignada</Text>
                    </div>
                  </Group>
                  <Badge size="sm" variant="light" color="brand">{sedesSinCelula.length} sede{sedesSinCelula.length !== 1 ? 's' : ''}</Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <SedesTable sedes={sedesSinCelula} onEdit={handleOpenEdit} onDelete={handleDeleteSede} />
              </Accordion.Panel>
            </Accordion.Item>
          )}

          {/* ── Células con sus sedes ── */}
          {(celulas as Celula[]).map((c: Celula) => {
            const sedesC = sedesDeCelula(c.id);
            return (
              <Accordion.Item key={c.id} value={c.id}>
                <Accordion.Control>
                  <Group justify="space-between" pr="md">
                    <Group gap="sm">
                      <ThemeIcon color="teal" variant="light" size="md">
                        <MapPin size={15} />
                      </ThemeIcon>
                      <div>
                        <Text fw={600}>{c.nombre}</Text>
                        <Text size="xs" c="dimmed">{c.municipio}</Text>
                      </div>
                    </Group>
                    <Badge size="sm" variant="light" color="teal">{sedesC.length} sede{sedesC.length !== 1 ? 's' : ''}</Badge>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Tabs defaultValue="sedes">
                    <Tabs.List mb="sm">
                      <Tabs.Tab value="sedes" leftSection={<Building2 size={14} />}>Sedes</Tabs.Tab>
                      <Tabs.Tab value="config" leftSection={<Pencil size={14} />}>Célula</Tabs.Tab>
                    </Tabs.List>
                    <Tabs.Panel value="sedes">
                      <Stack gap="sm">
                        <Group justify="flex-end">
                          <Button size="xs" variant="light" leftSection={<Plus size={13} />}
                            onClick={() => handleOpenAddSede(c.id)}>
                            Añadir sede
                          </Button>
                        </Group>
                        <SedesTable sedes={sedesC} onEdit={handleOpenEdit} onDelete={handleDeleteSede} />
                      </Stack>
                    </Tabs.Panel>
                    <Tabs.Panel value="config">
                      <Stack gap="sm" pt="xs">
                        <Group gap="xl">
                          <div>
                            <Text size="xs" c="dimmed">Municipio central</Text>
                            <Text size="sm" fw={500}>{c.municipio}</Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">ID</Text>
                            <Text size="xs" ff="monospace" c="dimmed">{c.id}</Text>
                          </div>
                        </Group>
                        <Group justify="flex-end">
                          <Tooltip label="Eliminar célula">
                            <ActionIcon variant="light" color="red" onClick={() => handleDeleteCelula(c)}>
                              <Trash2 size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Stack>
                    </Tabs.Panel>
                  </Tabs>
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>
      )}

      {/* ── Modal Nueva célula ── */}
      <Modal opened={celulaOpened} onClose={closeCelula} title="Nueva célula regional">
        <Stack gap="sm">
          <TextInput label="Nombre" placeholder="Ej: Célula Norte"
            value={celulaForm.nombre}
            onChange={e => setCelulaForm(f => ({ ...f, nombre: e.target.value }))} required />
          <TextInput label="Municipio central" placeholder="Ej: Tunja"
            value={celulaForm.municipio}
            onChange={e => setCelulaForm(f => ({ ...f, municipio: e.target.value }))} required />
          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={closeCelula}>Cancelar</Button>
            <Button onClick={handleCreateCelula} loading={createCelula.isPending}>Crear célula</Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Modal Nueva Sede ── */}
      <Modal opened={sedeOpened} onClose={closeSede}
        title={targetCelulaId
          ? `Nueva sede — ${(celulas as Celula[]).find(c => c.id === targetCelulaId)?.nombre ?? ''}`
          : 'Nueva sede central'}
        size="lg">
        <Stack gap="sm">
          <TextInput label="Nombre" placeholder="Ej: Sede Rural Motavita"
            value={sedeForm.nombre}
            onChange={e => setSedeForm(f => ({ ...f, nombre: e.target.value }))} required />
          <Group grow>
            <Select label="Tipo de sede"
              data={[
                { value: 'central', label: 'Central' },
                { value: 'celula', label: 'Célula' },
                { value: 'municipal', label: 'Municipal' },
                { value: 'rural', label: 'Rural' },
              ]}
              value={sedeForm.tipo}
              onChange={v => setSedeForm(f => ({ ...f, tipo: v || 'municipal' }))} />
            <Select label="Célula" placeholder="Sin célula"
              data={[{ value: '', label: 'Sin célula' }, ...(celulas as Celula[]).map(c => ({ value: c.id, label: c.nombre }))]}
              value={sedeForm.celula_id}
              onChange={v => setSedeForm(f => ({ ...f, celula_id: v || '' }))} />
          </Group>
          <Alert color="blue" variant="light" icon={<MapPin size={16} />} p="xs">
            Haz clic en el mapa para colocar la sede
          </Alert>
          <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
            <MapContainer center={CENTRO_MAPA} zoom={9} style={{ height: 260, width: '100%', cursor: 'crosshair' }}>
              <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapClickHandler onMapClick={(lat, lng) => {
                setPinPos([lat, lng]);
                setSedeForm(f => ({ ...f, latitud: lat.toFixed(6), longitud: lng.toFixed(6) }));
              }} />
              {pinPos && <Marker position={pinPos} icon={PIN_ICON} />}
            </MapContainer>
          </Paper>
          <Group grow>
            <TextInput label="Latitud" placeholder="Clic en el mapa" value={sedeForm.latitud}
              onChange={e => { setSedeForm(f => ({ ...f, latitud: e.target.value })); const lat = parseFloat(e.target.value), lng = parseFloat(sedeForm.longitud); if (!isNaN(lat) && !isNaN(lng)) setPinPos([lat, lng]); }} />
            <TextInput label="Longitud" placeholder="Clic en el mapa" value={sedeForm.longitud}
              onChange={e => { setSedeForm(f => ({ ...f, longitud: e.target.value })); const lat = parseFloat(sedeForm.latitud), lng = parseFloat(e.target.value); if (!isNaN(lat) && !isNaN(lng)) setPinPos([lat, lng]); }} />
          </Group>
          <TextInput label="Dirección (opcional)" value={sedeForm.direccion}
            onChange={e => setSedeForm(f => ({ ...f, direccion: e.target.value }))} />
          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={closeSede}>Cancelar</Button>
            <Button onClick={handleCreateSede} loading={createSede.isPending}
              disabled={!pinPos && (!sedeForm.latitud || !sedeForm.longitud)}>
              Crear sede
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Modal Editar Sede ── */}
      <Modal opened={editOpened} onClose={closeEdit} title={`Editar: ${editingSede?.nombre}`} size="lg">
        <Stack gap="sm">
          <TextInput label="Nombre" value={editForm.nombre}
            onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))} required />
          <Group grow>
            <Select label="Tipo de sede"
              data={[
                { value: 'central', label: 'Central' },
                { value: 'celula', label: 'Célula' },
                { value: 'municipal', label: 'Municipal' },
                { value: 'rural', label: 'Rural' },
              ]}
              value={editForm.tipo}
              onChange={v => setEditForm(f => ({ ...f, tipo: v || 'municipal' }))} />
            <Select label="Célula" placeholder="Sin célula"
              data={[{ value: '', label: 'Sin célula' }, ...(celulas as Celula[]).map(c => ({ value: c.id, label: c.nombre }))]}
              value={editForm.celula_id}
              onChange={v => setEditForm(f => ({ ...f, celula_id: v || '' }))} />
          </Group>
          <Text size="sm" fw={500}>Ubicación — haz clic en el mapa para moverla</Text>
          <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
            <MapContainer center={editPinPos ?? CENTRO_MAPA} zoom={13} style={{ height: 260, width: '100%', cursor: 'crosshair' }}>
              <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapClickHandler onMapClick={(lat, lng) => {
                setEditPinPos([lat, lng]);
                setEditForm(f => ({ ...f, latitud: lat.toFixed(6), longitud: lng.toFixed(6) }));
              }} />
              {editPinPos && <Marker position={editPinPos} icon={PIN_ICON} />}
            </MapContainer>
          </Paper>
          <Group grow>
            <TextInput label="Latitud" value={editForm.latitud}
              onChange={e => { setEditForm(f => ({ ...f, latitud: e.target.value })); const lat = parseFloat(e.target.value), lng = parseFloat(editForm.longitud); if (!isNaN(lat) && !isNaN(lng)) setEditPinPos([lat, lng]); }} />
            <TextInput label="Longitud" value={editForm.longitud}
              onChange={e => { setEditForm(f => ({ ...f, longitud: e.target.value })); const lat = parseFloat(editForm.latitud), lng = parseFloat(e.target.value); if (!isNaN(lat) && !isNaN(lng)) setEditPinPos([lat, lng]); }} />
          </Group>
          <TextInput label="Dirección (opcional)" value={editForm.direccion}
            onChange={e => setEditForm(f => ({ ...f, direccion: e.target.value }))} />
          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={closeEdit}>Cancelar</Button>
            <Button onClick={handleUpdateSede} loading={updateSede.isPending} color="brand">Guardar cambios</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
