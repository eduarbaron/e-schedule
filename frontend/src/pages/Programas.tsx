import { useEffect, useState } from 'react';
import {
  Stack, Title, Button, Group, Paper, Text, Badge, ActionIcon,
  Modal, TextInput, Textarea, Switch, Tooltip, NumberInput, Select,
  Accordion, ThemeIcon, Tabs, Table, MultiSelect
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Plus, Trash2, Star, BookOpen, GraduationCap, Clock, Pencil, MapPin } from 'lucide-react';
import {
  useProgramas, useCreatePrograma, useUpdatePrograma, useTogglePrioridadPrograma, useDeletePrograma,
  useMaterias, useCreateMateria, useUpdateMateria, useDeleteMateria,
  useDepartamentos, useSedes, useProgramaSedes, useSetProgramaSedes,
} from '../api/hooks';
import type { Programa, Materia, Departamento, Sede } from '../types';
import { useConfirm } from '../components/ConfirmProvider';

const SEMESTRE_COLORS = ['blue', 'teal', 'violet', 'orange', 'pink', 'cyan', 'green'];

function SedesOfertaPrograma({ programa }: { programa: Programa }) {
  const { data: sedes = [] } = useSedes();
  const { data: sedesPrograma = [], isLoading } = useProgramaSedes(programa.id);
  const setProgramaSedes = useSetProgramaSedes();
  const [selectedSedes, setSelectedSedes] = useState<string[]>([]);
  const [draftSedes, setDraftSedes] = useState<string[]>([]);
  const [celulaFiltro, setCelulaFiltro] = useState<string | null>(null);
  const [editingSedes, setEditingSedes] = useState(false);

  useEffect(() => {
    const ids = (sedesPrograma as Sede[]).map(s => s.id);
    setSelectedSedes(ids);
    setDraftSedes(ids);
    setEditingSedes(ids.length === 0);
  }, [sedesPrograma]);

  const celulasDisponibles = Array.from(
    new Map(
      (sedes as Sede[]).map(s => [
        s.celula_id ?? '__sin_celula__',
        s.celula_nombre ?? 'Sin célula',
      ])
    ).entries()
  ).map(([value, label]) => ({ value, label }));

  const sedesFiltradas = (sedes as Sede[]).filter(s =>
    !celulaFiltro || (s.celula_id ?? '__sin_celula__') === celulaFiltro || draftSedes.includes(s.id)
  );

  const handleSave = async () => {
    try {
      await setProgramaSedes.mutateAsync({ programaId: programa.id, sede_ids: draftSedes });
      setSelectedSedes(draftSedes);
      setDraftSedes([]);
      setCelulaFiltro(null);
      setEditingSedes(false);
      notifications.show({ message: 'Sedes de oferta actualizadas', color: 'green' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al actualizar sedes', color: 'red' });
    }
  };

  return (
    <Stack gap="sm">
      {editingSedes ? (
        <>
          <Group align="flex-end" grow>
            <Select
              label="Filtrar por célula"
              placeholder="Todas las células"
              data={celulasDisponibles}
              value={celulaFiltro}
              onChange={setCelulaFiltro}
              clearable
              searchable
            />
            <MultiSelect
              label="Sedes donde se oferta"
              placeholder="Selecciona sedes..."
              data={sedesFiltradas.map(s => ({ value: s.id, label: `${s.nombre}${s.celula_nombre ? ` · ${s.celula_nombre}` : ''}` }))}
              value={draftSedes}
              onChange={setDraftSedes}
              searchable
              clearable
            />
          </Group>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              {isLoading ? 'Cargando sedes...' : `${draftSedes.length} sede(s) en edición`}
            </Text>
            <Group gap="xs">
              {selectedSedes.length > 0 && (
                <Button
                  size="xs"
                  variant="light"
                  color="gray"
                  onClick={() => {
                    setDraftSedes([]);
                    setCelulaFiltro(null);
                    setEditingSedes(false);
                  }}
                >
                  Cancelar
                </Button>
              )}
              <Button size="xs" leftSection={<MapPin size={13} />} onClick={handleSave} loading={setProgramaSedes.isPending}>
                Guardar sedes
              </Button>
            </Group>
          </Group>
        </>
      ) : (
        <Group justify="space-between">
          <Text size="xs" c="dimmed">{selectedSedes.length} sede(s) guardada(s)</Text>
          <Button
            size="xs"
            variant="light"
            leftSection={<Pencil size={13} />}
            onClick={() => {
              setDraftSedes(selectedSedes);
              setEditingSedes(true);
            }}
          >
            Editar sedes
          </Button>
        </Group>
      )}
      {selectedSedes.length === 0 ? (
        <Paper p="md" radius="md" withBorder ta="center">
          <Text size="sm" c="dimmed">Este programa aún no tiene sedes de oferta configuradas</Text>
        </Paper>
      ) : (
        <Group gap="xs" wrap="wrap">
          {(sedes as Sede[])
            .filter(s => selectedSedes.includes(s.id))
            .map(s => (
              <Badge key={s.id} color="success" variant="light" leftSection={<MapPin size={11} />}>
                {s.nombre}
              </Badge>
            ))}
        </Group>
      )}
    </Stack>
  );
}

function MateriasPrograma({ programa, materias }: { programa: Programa; materias: Materia[] }) {
  const confirm = useConfirm();
  const { data: departamentos = [] } = useDepartamentos();
  const createMateria = useCreateMateria();
  const updateMateria = useUpdateMateria();
  const deleteMateria = useDeleteMateria();
  const [opened, { open, close }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [editingMateria, setEditingMateria] = useState<Materia | null>(null);
  const [form, setForm] = useState({
    nombre: '', horas_semana: 2, semestre: 1, departamento_id: '',
  });
  const [editForm, setEditForm] = useState({
    nombre: '', horas_semana: 2, semestre: 1, departamento_id: '',
  });

  const materiasProg = materias.filter(m => m.programa_id === programa.id);
  const semestres = [...new Set(materiasProg.map(m => m.semestre ?? 0))].sort((a, b) => a - b);

  const handleCreate = async () => {
    if (!form.nombre) {
      notifications.show({ message: 'El nombre es requerido', color: 'red' });
      return;
    }
    try {
      await createMateria.mutateAsync({
        nombre: form.nombre,
        horas_semana: form.horas_semana,
        semestre: form.semestre,
        programa_id: programa.id,
        departamento_id: form.departamento_id || null,
      });
      notifications.show({ message: 'Materia creada', color: 'green' });
      close();
      setForm({ nombre: '', horas_semana: 2, semestre: 1, departamento_id: '' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al crear materia', color: 'red' });
    }
  };

  const handleOpenEdit = (m: Materia) => {
    setEditingMateria(m);
    setEditForm({
      nombre: m.nombre,
      horas_semana: m.horas_semana,
      semestre: m.semestre ?? 1,
      departamento_id: m.departamento_id ?? '',
    });
    openEdit();
  };

  const handleUpdate = async () => {
    if (!editingMateria || !editForm.nombre) {
      notifications.show({ message: 'El nombre es requerido', color: 'red' });
      return;
    }
    try {
      await updateMateria.mutateAsync({
        id: editingMateria.id,
        nombre: editForm.nombre,
        horas_semana: editForm.horas_semana,
        semestre: editForm.semestre,
        programa_id: programa.id,
        departamento_id: editForm.departamento_id || null,
      });
      notifications.show({ message: 'Materia actualizada', color: 'green' });
      closeEdit();
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al actualizar', color: 'red' });
    }
  };

  const handleDelete = async (m: Materia) => {
    if (!(await confirm({
      title: 'Eliminar materia',
      message: `¿Eliminar "${m.nombre}"?`,
      confirmLabel: 'Eliminar',
    }))) return;
    try {
      await deleteMateria.mutateAsync(m.id);
      notifications.show({ message: 'Materia eliminada', color: 'orange' });
    } catch {
      notifications.show({ message: 'Error al eliminar', color: 'red' });
    }
  };

  return (
    <Stack gap="sm">
      <Group justify="flex-end">
        <Button size="xs" variant="light" leftSection={<Plus size={13} />} onClick={open}>
          Añadir materia
        </Button>
      </Group>

      {semestres.length === 0 ? (
        <Paper p="md" withBorder ta="center" radius="md">
          <Text size="sm" c="dimmed">Sin materias aún — usa "Añadir materia" para comenzar</Text>
        </Paper>
      ) : (
        <Accordion variant="contained" radius="md" multiple>
          {semestres.map((sem, idx) => {
            const mats = materiasProg.filter(m => (m.semestre ?? 0) === sem);
            const color = SEMESTRE_COLORS[idx % SEMESTRE_COLORS.length];
            const totalHoras = mats.reduce((acc, m) => acc + m.horas_semana, 0);
            return (
              <Accordion.Item key={sem} value={String(sem)}>
                <Accordion.Control>
                  <Group justify="space-between" pr="md">
                    <Group gap="sm">
                      <ThemeIcon color={color} variant="light" size="sm">
                        <GraduationCap size={13} />
                      </ThemeIcon>
                      <Text fw={600} size="sm">
                        {sem === 0 ? 'Sin semestre' : `${sem}° Semestre`}
                      </Text>
                    </Group>
                    <Group gap="xs">
                      <Badge size="xs" variant="light" color={color}>{mats.length} materias</Badge>
                      <Badge size="xs" variant="light" color="gray" leftSection={<Clock size={10} />}>
                        {totalHoras}h/sem
                      </Badge>
                    </Group>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Materia</Table.Th>
                        <Table.Th>Departamento</Table.Th>
                        <Table.Th>Horas/sem</Table.Th>
                        <Table.Th></Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {mats.map(m => (
                        <Table.Tr key={m.id}>
                          <Table.Td>
                            <Group gap="xs">
                              <BookOpen size={13} color="#7950f2" />
                              <Text size="sm" fw={500}>{m.nombre}</Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed">{m.departamento_nombre ?? '—'}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge size="xs" variant="light" color="teal">{m.horas_semana}h</Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap={4}>
                              <Tooltip label="Editar materia">
                                <ActionIcon size="sm" variant="light" color="blue" onClick={() => handleOpenEdit(m)}>
                                  <Pencil size={13} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Eliminar materia">
                                <ActionIcon size="sm" variant="light" color="red" onClick={() => handleDelete(m)}>
                                  <Trash2 size={13} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>
      )}

      <Modal opened={editOpened} onClose={closeEdit} title={`Editar: ${editingMateria?.nombre}`}>
        <Stack gap="sm">
          <TextInput
            label="Nombre de la materia"
            value={editForm.nombre}
            onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))}
            required
          />
          <Group grow>
            <NumberInput
              label="Semestre"
              min={1} max={12}
              value={editForm.semestre}
              onChange={v => setEditForm(f => ({ ...f, semestre: Number(v) }))}
            />
            <NumberInput
              label="Horas / semana"
              min={1} max={20}
              value={editForm.horas_semana}
              onChange={v => setEditForm(f => ({ ...f, horas_semana: Number(v) }))}
            />
          </Group>
          <Select
            label="Departamento"
            placeholder="Selecciona departamento"
            searchable
            clearable
            data={(departamentos as Departamento[]).map(d => ({ value: d.id, label: d.nombre }))}
            value={editForm.departamento_id || null}
            onChange={v => setEditForm(f => ({ ...f, departamento_id: v || '' }))}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={closeEdit}>Cancelar</Button>
            <Button onClick={handleUpdate} loading={updateMateria.isPending} color="blue">Guardar cambios</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={opened} onClose={close} title={`Nueva materia — ${programa.nombre}`}>
        <Stack gap="sm">
          <TextInput
            label="Nombre de la materia"
            placeholder="Ej: Programación Web I"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            required
          />
          <Group grow>
            <NumberInput
              label="Semestre"
              min={1} max={12}
              value={form.semestre}
              onChange={v => setForm(f => ({ ...f, semestre: Number(v) }))}
            />
            <NumberInput
              label="Horas / semana"
              min={1} max={20}
              value={form.horas_semana}
              onChange={v => setForm(f => ({ ...f, horas_semana: Number(v) }))}
            />
          </Group>
          <Select
            label="Departamento"
            placeholder="Selecciona departamento"
            searchable
            clearable
            data={(departamentos as Departamento[]).map(d => ({ value: d.id, label: d.nombre }))}
            value={form.departamento_id || null}
            onChange={v => setForm(f => ({ ...f, departamento_id: v || '' }))}
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

export function Programas() {
  const confirm = useConfirm();
  const { data: programas = [], isLoading } = useProgramas();
  const { data: materias = [] } = useMaterias();
  const { data: sedes = [] } = useSedes();
  const createPrograma = useCreatePrograma();
  const updatePrograma = useUpdatePrograma();
  const togglePrioridad = useTogglePrioridadPrograma();
  const deletePrograma = useDeletePrograma();
  const [opened, { open, close }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [editingPrograma, setEditingPrograma] = useState<Programa | null>(null);
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    es_prioritario: false,
    orden_prioridad: 99,
    tipo_ciclo: 'quincenal' as 'semanal' | 'quincenal',
    numero_semestres: 10,
    sede_ids: [] as string[],
  });
  const [editForm, setEditForm] = useState({
    nombre: '',
    descripcion: '',
    es_prioritario: false,
    orden_prioridad: 99,
    tipo_ciclo: 'quincenal' as 'semanal' | 'quincenal',
    numero_semestres: 10,
    sede_ids: [] as string[],
  });
  const { data: editSedesPrograma = [] } = useProgramaSedes(editingPrograma?.id ?? '');

  useEffect(() => {
    if (editingPrograma) {
      setEditForm(f => ({ ...f, sede_ids: (editSedesPrograma as Sede[]).map(s => s.id) }));
    }
  }, [editSedesPrograma, editingPrograma]);

  const programaPrioritario = (programas as Programa[]).find((p: Programa) => p.es_prioritario === 1);

  const handleCreate = async () => {
    if (!form.nombre) {
      notifications.show({ message: 'El nombre es requerido', color: 'red' });
      return;
    }
    try {
      await createPrograma.mutateAsync(form);
      notifications.show({ message: 'Programa creado exitosamente', color: 'green' });
      close();
      setForm({ nombre: '', descripcion: '', es_prioritario: false, orden_prioridad: 99, tipo_ciclo: 'quincenal', numero_semestres: 10, sede_ids: [] });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al crear programa', color: 'red' });
    }
  };

  const handleOpenEdit = (p: Programa) => {
    setEditingPrograma(p);
    setEditForm({
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      es_prioritario: p.es_prioritario === 1,
      orden_prioridad: p.orden_prioridad,
      tipo_ciclo: p.tipo_ciclo,
      numero_semestres: p.numero_semestres ?? 10,
      sede_ids: [],
    });
    openEdit();
  };

  const handleUpdatePrograma = async () => {
    if (!editingPrograma || !editForm.nombre) {
      notifications.show({ message: 'El nombre es requerido', color: 'red' });
      return;
    }
    try {
      await updatePrograma.mutateAsync({ id: editingPrograma.id, ...editForm });
      notifications.show({ message: 'Programa actualizado', color: 'green' });
      closeEdit();
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al actualizar programa', color: 'red' });
    }
  };

  const handleTogglePrioridad = async (p: Programa) => {
    const nuevaEsPrioritario = p.es_prioritario !== 1;
    if (nuevaEsPrioritario && programaPrioritario && programaPrioritario.id !== p.id) {
      if (!(await confirm({
        title: 'Cambiar programa prioritario',
        message: `"${programaPrioritario.nombre}" ya es el programa prioritario. ¿Cambiar a "${p.nombre}"?`,
        confirmLabel: 'Cambiar',
        color: 'yellow',
      }))) return;
      await togglePrioridad.mutateAsync({ id: programaPrioritario.id, es_prioritario: false });
    }
    try {
      await togglePrioridad.mutateAsync({ id: p.id, es_prioritario: nuevaEsPrioritario });
      notifications.show({
        message: nuevaEsPrioritario ? `"${p.nombre}" es ahora prioritario` : `"${p.nombre}" ya no es prioritario`,
        color: nuevaEsPrioritario ? 'yellow' : 'gray',
      });
    } catch {
      notifications.show({ message: 'Error al cambiar prioridad', color: 'red' });
    }
  };

  const handleDelete = async (p: Programa) => {
    if (!(await confirm({
      title: 'Eliminar programa',
      message: `¿Eliminar el programa "${p.nombre}"? Las materias asociadas quedarán sin programa.`,
      confirmLabel: 'Eliminar',
    }))) return;
    try {
      await deletePrograma.mutateAsync(p.id);
      notifications.show({ message: 'Programa eliminado', color: 'orange' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al eliminar', color: 'red' });
    }
  };

  const sorted = [...(programas as Programa[])].sort((a, b) => a.orden_prioridad - b.orden_prioridad);

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Programas académicos</Title>
        <Button leftSection={<Plus size={16} />} onClick={open}>Nuevo programa</Button>
      </Group>

      {isLoading ? (
        <Text c="dimmed">Cargando programas...</Text>
      ) : sorted.length === 0 ? (
        <Paper p="xl" radius="md" withBorder ta="center">
          <Text c="dimmed">No hay programas creados aún</Text>
        </Paper>
      ) : (
        <Accordion variant="separated" radius="md">
          {sorted.map((p: Programa) => {
            const mats = (materias as Materia[]).filter(m => m.programa_id === p.id);
            const totalHoras = mats.reduce((acc, m) => acc + m.horas_semana, 0);
            const numSemestres = new Set(mats.map(m => m.semestre)).size;
            return (
              <Accordion.Item key={p.id} value={p.id}>
                <Accordion.Control>
                  <Group justify="space-between" pr="md">
                    <Group gap="sm">
                      <ThemeIcon
                        color={p.es_prioritario === 1 ? 'yellow' : 'blue'}
                        variant="light" size="md"
                      >
                        {p.es_prioritario === 1
                          ? <Star size={15} fill="currentColor" />
                          : <GraduationCap size={15} />
                        }
                      </ThemeIcon>
                      <div>
                        <Group gap="xs">
                          <Text fw={600}>{p.nombre}</Text>
                          <Badge size="xs" variant="light" color={p.tipo_ciclo === 'semanal' ? 'teal' : 'violet'}>
                            {p.tipo_ciclo === 'semanal' ? 'Semanal' : 'Quincenal'}
                          </Badge>
                          <Badge size="xs" variant="light" color="cyan">
                            {p.numero_semestres ?? 10} semestres
                          </Badge>
                          <Badge size="xs" variant="light" color="gray">#{p.orden_prioridad}</Badge>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {p.departamento_nombre ?? 'Sin departamento'}
                          {p.facultad_nombre ? ` · ${p.facultad_nombre}` : ''}
                        </Text>
                      </div>
                    </Group>
                    <Group gap="xs">
                      <Badge size="sm" variant="light" color="blue">{mats.length} materias</Badge>
                      <Badge size="sm" variant="light" color="teal">{numSemestres} semestres</Badge>
                      <Badge size="sm" variant="light" color="gray">{totalHoras}h/sem</Badge>
                    </Group>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Tabs defaultValue="plan">
                    <Tabs.List mb="sm">
                      <Tabs.Tab value="plan" leftSection={<BookOpen size={14} />}>Plan de estudios</Tabs.Tab>
                      <Tabs.Tab value="sedes" leftSection={<MapPin size={14} />}>Sedes ofertadas</Tabs.Tab>
                      <Tabs.Tab value="config" leftSection={<Star size={14} />}>Configuración</Tabs.Tab>
                    </Tabs.List>
                    <Tabs.Panel value="plan">
                      <MateriasPrograma programa={p} materias={materias as Materia[]} />
                    </Tabs.Panel>
                    <Tabs.Panel value="sedes">
                      <SedesOfertaPrograma programa={p} />
                    </Tabs.Panel>
                    <Tabs.Panel value="config">
                      <Stack gap="sm" pt="xs">
                        <div>
                          <Text size="sm" fw={500} mb={4}>Departamento responsable</Text>
                          <Text size="sm" c={p.departamento_nombre ? undefined : 'dimmed'}>
                            {p.departamento_nombre ?? 'Sin departamento asignado'}
                            {p.facultad_nombre ? ` · ${p.facultad_nombre}` : ''}
                          </Text>
                        </div>
                        <Tooltip label={p.es_prioritario === 1 ? 'Quitar prioridad' : 'Marcar como prioritario'}>
                          <Switch
                            checked={p.es_prioritario === 1}
                            onChange={() => handleTogglePrioridad(p)}
                            color="yellow"
                            label={p.es_prioritario === 1 ? 'Programa prioritario' : 'Sin prioridad especial'}
                            description="El programa prioritario se asigna primero en la asignación masiva"
                          />
                        </Tooltip>
                        <Group justify="flex-end" mt="xs">
                          <Tooltip label="Editar programa">
                            <ActionIcon variant="light" color="blue" onClick={() => handleOpenEdit(p)}>
                              <Pencil size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Eliminar programa">
                            <ActionIcon variant="light" color="red" onClick={() => handleDelete(p)}>
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

      <Modal opened={opened} onClose={close} title="Nuevo programa académico">
        <Stack gap="sm">
          <TextInput
            label="Nombre del programa"
            placeholder="Ej: Tecnología en Sistemas"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            required
          />
          <Textarea
            label="Descripción (opcional)"
            placeholder="Breve descripción del programa..."
            value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            rows={2}
          />
          <Group grow>
            <NumberInput
              label="Orden de prioridad"
              description="Menor = más prioritario"
              value={form.orden_prioridad}
              onChange={v => setForm(f => ({ ...f, orden_prioridad: Number(v) }))}
              min={1} max={999}
            />
            <Select
              label="Tipo de ciclo"
              data={[
                { value: 'quincenal', label: 'Quincenal (Cal A/B)' },
                { value: 'semanal', label: 'Semanal' },
              ]}
              value={form.tipo_ciclo}
              onChange={v => setForm(f => ({ ...f, tipo_ciclo: (v || 'quincenal') as 'semanal' | 'quincenal' }))}
            />
            <NumberInput
              label="Numero de semestres"
              min={1}
              max={10}
              value={form.numero_semestres}
              onChange={v => setForm(f => ({ ...f, numero_semestres: Number(v) || 1 }))}
            />
          </Group>
          <MultiSelect
            label="Sedes donde se oferta"
            placeholder="Selecciona sedes..."
            data={(sedes as Sede[]).map(s => ({ value: s.id, label: s.nombre }))}
            value={form.sede_ids}
            onChange={v => setForm(f => ({ ...f, sede_ids: v }))}
            searchable
            clearable
          />
          <Switch
            label="Marcar como prioritario"
            checked={form.es_prioritario}
            onChange={e => {
              const es_prioritario = e.currentTarget.checked;
              setForm(f => ({ ...f, es_prioritario }));
            }}
            color="yellow"
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={close}>Cancelar</Button>
            <Button onClick={handleCreate} loading={createPrograma.isPending}>Crear programa</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={editOpened} onClose={closeEdit} title={`Editar programa${editingPrograma ? ` — ${editingPrograma.nombre}` : ''}`}>
        <Stack gap="sm">
          <TextInput
            label="Nombre del programa"
            value={editForm.nombre}
            onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))}
            required
          />
          <Textarea
            label="Descripción (opcional)"
            value={editForm.descripcion}
            onChange={e => setEditForm(f => ({ ...f, descripcion: e.target.value }))}
            rows={2}
          />
          <Group grow>
            <NumberInput
              label="Orden de prioridad"
              description="Menor = más prioritario"
              value={editForm.orden_prioridad}
              onChange={v => setEditForm(f => ({ ...f, orden_prioridad: Number(v) }))}
              min={1}
              max={999}
            />
            <Select
              label="Tipo de ciclo"
              data={[
                { value: 'quincenal', label: 'Quincenal (Semana A/B)' },
                { value: 'semanal', label: 'Semanal' },
              ]}
              value={editForm.tipo_ciclo}
              onChange={v => setEditForm(f => ({ ...f, tipo_ciclo: (v || 'quincenal') as 'semanal' | 'quincenal' }))}
            />
            <NumberInput
              label="Numero de semestres"
              min={1}
              max={10}
              value={editForm.numero_semestres}
              onChange={v => setEditForm(f => ({ ...f, numero_semestres: Number(v) || 1 }))}
            />
          </Group>
          <MultiSelect
            label="Sedes donde se oferta"
            placeholder="Selecciona sedes..."
            data={(sedes as Sede[]).map(s => ({ value: s.id, label: s.nombre }))}
            value={editForm.sede_ids}
            onChange={v => setEditForm(f => ({ ...f, sede_ids: v }))}
            searchable
            clearable
          />
          <Switch
            label="Marcar como prioritario"
            checked={editForm.es_prioritario}
            onChange={e => setEditForm(f => ({ ...f, es_prioritario: e.currentTarget.checked }))}
            color="yellow"
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={closeEdit}>Cancelar</Button>
            <Button onClick={handleUpdatePrograma} loading={updatePrograma.isPending} color="blue">
              Guardar cambios
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
