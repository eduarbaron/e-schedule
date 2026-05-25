import { useEffect, useState } from 'react';
import {
  Stack, Title, Button, Group, Paper, Text, Badge, ActionIcon,
  Modal, TextInput, Select, Table, Tooltip, Alert, Drawer
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Plus, Trash2, MapPin, BookOpen, Pencil, Search } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  useSedes, useCelulas, useCreateSede, useUpdateSede, useDeleteSede,
  useSedesProgramas,
} from '../api/hooks';
import type { Sede, Programa } from '../types';
import { TIPO_SEDE_COLORS, TIPO_SEDE_LABELS } from '../types';
import { useConfirm } from '../components/ConfirmProvider';

const PIN_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:18px;height:18px;border-radius:50%;
    background:#228be6;border:3px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const CENTRO_MAPA: [number, number] = [8.749, -75.874];

type SedeForm = {
  nombre: string;
  tipo: string;
  celula_id: string;
  latitud: string;
  longitud: string;
  direccion: string;
};

type GeocodeResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

function MapRecenter({ position, zoom }: { position: [number, number] | null; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, zoom);
    }
  }, [map, position, zoom]);

  return null;
}

async function searchAddress(query: string): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '6',
    addressdetails: '1',
    countrycodes: 'co',
    'accept-language': 'es',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error('No se pudo buscar la dirección');
  }

  return response.json();
}

function ProgramasSede({ sede }: { sede: Sede }) {
  const { data: programasSede = [], isLoading } = useSedesProgramas(sede.id);

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Esta lista es informativa. La oferta de sedes se edita desde Programas.
      </Text>

      {isLoading ? (
        <Text size="sm" c="dimmed">Cargando...</Text>
      ) : (programasSede as Programa[]).length === 0 ? (
        <Paper p="md" radius="md" withBorder ta="center">
          <Text size="sm" c="dimmed">Esta sede no tiene programas asignados aún</Text>
        </Paper>
      ) : (
        <Stack gap="xs">
          {(programasSede as Programa[]).map((p: Programa) => (
            <Paper key={p.id} p="sm" radius="md" withBorder>
              <Group justify="space-between">
                <Group gap="xs">
                  <BookOpen size={14} color="#7950f2" />
                  <div>
                    <Text size="sm" fw={500}>{p.nombre}</Text>
                    <Badge
                      size="xs"
                      color={p.tipo_ciclo === 'semanal' ? 'teal' : 'violet'}
                      variant="light"
                    >
                      {p.tipo_ciclo === 'semanal' ? 'Semanal' : 'Quincenal'}
                    </Badge>
                  </div>
                </Group>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export function Sedes() {
  const confirm = useConfirm();
  const { data: sedes = [], isLoading } = useSedes();
  const { data: celulas = [] } = useCelulas();
  const createSede = useCreateSede();
  const updateSede = useUpdateSede();
  const deleteSede = useDeleteSede();

  const [opened, { open, close }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [sedeSeleccionada, setSedeSeleccionada] = useState<Sede | null>(null);
  const [sedeEditando, setSedeEditando] = useState<Sede | null>(null);
  const [form, setForm] = useState<SedeForm>({
    nombre: '', tipo: 'municipal', celula_id: '', latitud: '', longitud: '', direccion: '',
  });
  const [pinPos, setPinPos] = useState<[number, number] | null>(null);
  const [addressResults, setAddressResults] = useState<GeocodeResult[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [editForm, setEditForm] = useState<SedeForm>({
    nombre: '', tipo: 'municipal', celula_id: '', latitud: '', longitud: '', direccion: '',
  });
  const [editPinPos, setEditPinPos] = useState<[number, number] | null>(null);
  const [editAddressResults, setEditAddressResults] = useState<GeocodeResult[]>([]);
  const [editAddressLoading, setEditAddressLoading] = useState(false);

  const handleMapClick = (lat: number, lng: number) => {
    setPinPos([lat, lng]);
    setForm(f => ({
      ...f,
      latitud: lat.toFixed(6),
      longitud: lng.toFixed(6),
    }));
  };

  const handleOpen = () => {
    setForm({ nombre: '', tipo: 'municipal', celula_id: '', latitud: '', longitud: '', direccion: '' });
    setPinPos(null);
    setAddressResults([]);
    open();
  };

  const applyAddressResult = (result: GeocodeResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setPinPos([lat, lng]);
    setForm(f => ({
      ...f,
      direccion: result.display_name,
      latitud: lat.toFixed(6),
      longitud: lng.toFixed(6),
    }));
  };

  const handleAddressSearch = async () => {
    const query = form.direccion.trim();
    if (query.length < 3) {
      notifications.show({ message: 'Escribe al menos 3 caracteres para buscar una dirección', color: 'yellow' });
      return;
    }

    setAddressLoading(true);
    try {
      const results = await searchAddress(query);
      setAddressResults(results);
      if (results.length === 0) {
        notifications.show({ message: 'No encontramos direcciones para esa búsqueda', color: 'yellow' });
        return;
      }
      applyAddressResult(results[0]);
    } catch {
      notifications.show({ message: 'No se pudo buscar la dirección', color: 'red' });
    } finally {
      setAddressLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.nombre || !form.latitud || !form.longitud) {
      notifications.show({ message: 'Nombre y ubicación en el mapa son requeridos', color: 'red' });
      return;
    }
    try {
      await createSede.mutateAsync({
        nombre: form.nombre,
        tipo: form.tipo,
        celula_id: form.celula_id || null,
        latitud: parseFloat(form.latitud),
        longitud: parseFloat(form.longitud),
        direccion: form.direccion || null,
      });
      notifications.show({ message: 'Sede creada exitosamente', color: 'green' });
      close();
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al crear sede', color: 'red' });
    }
  };

  const handleOpenEdit = (sede: Sede) => {
    setSedeEditando(sede);
    setEditForm({
      nombre: sede.nombre,
      tipo: sede.tipo,
      celula_id: (sede as any).celula_id ?? '',
      latitud: String(sede.latitud),
      longitud: String(sede.longitud),
      direccion: sede.direccion ?? '',
    });
    setEditPinPos([sede.latitud, sede.longitud]);
    setEditAddressResults([]);
    openEdit();
  };

  const applyEditAddressResult = (result: GeocodeResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setEditPinPos([lat, lng]);
    setEditForm(f => ({
      ...f,
      direccion: result.display_name,
      latitud: lat.toFixed(6),
      longitud: lng.toFixed(6),
    }));
  };

  const handleEditAddressSearch = async () => {
    const query = editForm.direccion.trim();
    if (query.length < 3) {
      notifications.show({ message: 'Escribe al menos 3 caracteres para buscar una dirección', color: 'yellow' });
      return;
    }

    setEditAddressLoading(true);
    try {
      const results = await searchAddress(query);
      setEditAddressResults(results);
      if (results.length === 0) {
        notifications.show({ message: 'No encontramos direcciones para esa búsqueda', color: 'yellow' });
        return;
      }
      applyEditAddressResult(results[0]);
    } catch {
      notifications.show({ message: 'No se pudo buscar la dirección', color: 'red' });
    } finally {
      setEditAddressLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!sedeEditando || !editForm.nombre || !editForm.latitud || !editForm.longitud) {
      notifications.show({ message: 'Nombre y ubicación son requeridos', color: 'red' });
      return;
    }
    try {
      await updateSede.mutateAsync({
        id: sedeEditando.id,
        nombre: editForm.nombre,
        tipo: editForm.tipo,
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

  const handleDelete = async (id: string, nombre: string) => {
    if (!(await confirm({
      title: 'Eliminar sede',
      message: `¿Eliminar la sede "${nombre}"?`,
      confirmLabel: 'Eliminar',
    }))) return;
    try {
      await deleteSede.mutateAsync(id);
      notifications.show({ message: 'Sede eliminada', color: 'orange' });
    } catch {
      notifications.show({ message: 'Error al eliminar', color: 'red' });
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Sedes</Title>
        <Button leftSection={<Plus size={16} />} onClick={handleOpen}>Nueva sede</Button>
      </Group>

      {isLoading ? (
        <Text c="dimmed">Cargando sedes...</Text>
      ) : (
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Célula</Table.Th>
                <Table.Th>Coordenadas</Table.Th>
                <Table.Th>Dirección</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sedes.map((s: Sede) => (
                <Table.Tr key={s.id}>
                  <Table.Td><Text fw={500}>{s.nombre}</Text></Table.Td>
                  <Table.Td>
                    <Badge variant="light"
                      style={{ background: TIPO_SEDE_COLORS[s.tipo] + '22', color: TIPO_SEDE_COLORS[s.tipo] }}>
                      {TIPO_SEDE_LABELS[s.tipo]}
                    </Badge>
                  </Table.Td>
                  <Table.Td><Text size="sm">{(s as any).celula_nombre ?? '—'}</Text></Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">{s.latitud.toFixed(4)}, {s.longitud.toFixed(4)}</Text>
                  </Table.Td>
                  <Table.Td><Text size="sm" c="dimmed">{s.direccion ?? '—'}</Text></Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="Programas ofertados">
                        <ActionIcon variant="light" color="violet" onClick={() => { setSedeSeleccionada(s); openDrawer(); }}>
                          <BookOpen size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Editar sede">
                        <ActionIcon variant="light" color="blue" onClick={() => handleOpenEdit(s)}>
                          <Pencil size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Eliminar sede">
                        <ActionIcon variant="light" color="red" onClick={() => handleDelete(s.id, s.nombre)}>
                          <Trash2 size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        title={sedeSeleccionada ? (
          <Stack gap={2}>
            <Text fw={700}>Programas ofertados</Text>
            <Text size="sm" c="dimmed">{sedeSeleccionada.nombre}</Text>
          </Stack>
        ) : 'Programas'}
        position="right"
        size="md"
      >
        {sedeSeleccionada && <ProgramasSede sede={sedeSeleccionada} />}
      </Drawer>

      {/* ── Modal Editar Sede ── */}
      <Modal opened={editOpened} onClose={closeEdit} title={`Editar: ${sedeEditando?.nombre}`} size="lg">
        <Stack gap="sm">
          <TextInput label="Nombre" value={editForm.nombre}
            onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))} required />
          <Group grow>
            <Select label="Tipo de sede"
              data={[
                { value: 'central', label: 'Central' },
                { value: 'celula', label: 'Célula (nodo administrativo)' },
                { value: 'municipal', label: 'Municipal' },
                { value: 'rural', label: 'Rural' },
              ]}
              value={editForm.tipo}
              onChange={v => setEditForm(f => ({ ...f, tipo: v || 'municipal' }))} />
            <Select label="Célula" placeholder="Sin célula"
              data={[{ value: '', label: 'Sin célula' }, ...celulas.map((c: any) => ({ value: c.id, label: c.nombre }))]}
              value={editForm.celula_id}
              onChange={v => setEditForm(f => ({ ...f, celula_id: v || '' }))} />
          </Group>

          <Text size="sm" fw={500}>Ubicación — haz clic en el mapa para moverla</Text>
          <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
            <MapContainer
              center={editPinPos ?? CENTRO_MAPA}
              zoom={13}
              style={{ height: 300, width: '100%', cursor: 'crosshair' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapRecenter position={editPinPos} zoom={15} />
              <MapClickHandler onMapClick={(lat, lng) => {
                setEditPinPos([lat, lng]);
                setEditForm(f => ({ ...f, latitud: lat.toFixed(6), longitud: lng.toFixed(6) }));
              }} />
              {editPinPos && <Marker position={editPinPos} icon={PIN_ICON} />}
            </MapContainer>
          </Paper>

          <Group grow>
            <TextInput label="Latitud" value={editForm.latitud}
              onChange={e => {
                setEditForm(f => ({ ...f, latitud: e.target.value }));
                const lat = parseFloat(e.target.value), lng = parseFloat(editForm.longitud);
                if (!isNaN(lat) && !isNaN(lng)) setEditPinPos([lat, lng]);
              }} />
            <TextInput label="Longitud" value={editForm.longitud}
              onChange={e => {
                setEditForm(f => ({ ...f, longitud: e.target.value }));
                const lat = parseFloat(editForm.latitud), lng = parseFloat(e.target.value);
                if (!isNaN(lat) && !isNaN(lng)) setEditPinPos([lat, lng]);
              }} />
          </Group>

          <Group align="flex-end">
            <TextInput
              label="Buscar dirección"
              placeholder="Ej: Calle 1 # 1-1, Tunja"
              value={editForm.direccion}
              onChange={e => {
                setEditForm(f => ({ ...f, direccion: e.target.value }));
                setEditAddressResults([]);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleEditAddressSearch();
                }
              }}
              style={{ flex: 1 }}
            />
            <Button
              leftSection={<Search size={16} />}
              onClick={handleEditAddressSearch}
              loading={editAddressLoading}
              variant="light"
            >
              Buscar
            </Button>
          </Group>

          {editAddressResults.length > 1 && (
            <Select
              label="Resultados de la búsqueda"
              placeholder="Selecciona una coincidencia"
              data={editAddressResults.map(result => ({
                value: String(result.place_id),
                label: result.display_name,
              }))}
              onChange={value => {
                const result = editAddressResults.find(item => String(item.place_id) === value);
                if (result) applyEditAddressResult(result);
              }}
              searchable
            />
          )}

          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={closeEdit}>Cancelar</Button>
            <Button onClick={handleUpdate} loading={updateSede.isPending} color="brand">
              Guardar cambios
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={opened} onClose={close} title="Nueva sede" size="lg">
        <Stack gap="sm">
          <TextInput label="Nombre" placeholder="Ej: Sede Rural Motavita" value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
          <Group grow>
            <Select label="Tipo de sede"
              data={[
                { value: 'central', label: 'Central' },
                { value: 'celula', label: 'Célula (nodo administrativo)' },
                { value: 'municipal', label: 'Municipal' },
                { value: 'rural', label: 'Rural' },
              ]}
              value={form.tipo}
              onChange={v => setForm(f => ({ ...f, tipo: v || 'municipal' }))} />
            <Select label="Célula" placeholder="Selecciona célula"
              data={[{ value: '', label: 'Sin célula (sede central)' }, ...celulas.map((c: any) => ({ value: c.id, label: c.nombre }))]}
              value={form.celula_id}
              onChange={v => setForm(f => ({ ...f, celula_id: v || '' }))} />
          </Group>

          <Text size="sm" fw={500}>Ubicación <Text span c="red">*</Text></Text>
          <Alert color="blue" variant="light" icon={<MapPin size={16} />} p="xs">
            Haz clic en el mapa para colocar la sede
          </Alert>
          <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
            <MapContainer
              center={CENTRO_MAPA}
              zoom={9}
              style={{ height: 280, width: '100%', cursor: 'crosshair' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapRecenter position={pinPos} zoom={15} />
              <MapClickHandler onMapClick={handleMapClick} />
              {pinPos && <Marker position={pinPos} icon={PIN_ICON} />}
            </MapContainer>
          </Paper>

          <Group grow>
            <TextInput
              label="Latitud"
              placeholder="Haz clic en el mapa"
              value={form.latitud}
              onChange={e => {
                setForm(f => ({ ...f, latitud: e.target.value }));
                const lat = parseFloat(e.target.value);
                const lng = parseFloat(form.longitud);
                if (!isNaN(lat) && !isNaN(lng)) setPinPos([lat, lng]);
              }}
            />
            <TextInput
              label="Longitud"
              placeholder="Haz clic en el mapa"
              value={form.longitud}
              onChange={e => {
                setForm(f => ({ ...f, longitud: e.target.value }));
                const lat = parseFloat(form.latitud);
                const lng = parseFloat(e.target.value);
                if (!isNaN(lat) && !isNaN(lng)) setPinPos([lat, lng]);
              }}
            />
          </Group>

          <Group align="flex-end">
            <TextInput
              label="Buscar dirección"
              placeholder="Ej: Calle 1 # 1-1, Tunja"
              value={form.direccion}
              onChange={e => {
                setForm(f => ({ ...f, direccion: e.target.value }));
                setAddressResults([]);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddressSearch();
                }
              }}
              style={{ flex: 1 }}
            />
            <Button
              leftSection={<Search size={16} />}
              onClick={handleAddressSearch}
              loading={addressLoading}
              variant="light"
            >
              Buscar
            </Button>
          </Group>

          {addressResults.length > 1 && (
            <Select
              label="Resultados de la búsqueda"
              placeholder="Selecciona una coincidencia"
              data={addressResults.map(result => ({
                value: String(result.place_id),
                label: result.display_name,
              }))}
              onChange={value => {
                const result = addressResults.find(item => String(item.place_id) === value);
                if (result) applyAddressResult(result);
              }}
              searchable
            />
          )}

          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={close}>Cancelar</Button>
            <Button
              onClick={handleCreate}
              loading={createSede.isPending}
              disabled={!pinPos && (!form.latitud || !form.longitud)}
            >
              Crear sede
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
