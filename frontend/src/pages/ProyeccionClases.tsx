import { useMemo, useState } from 'react';
import {
  Alert, Badge, Button, Group, Paper, Select, SimpleGrid, Table, Tabs, Text, Title, Stack, ActionIcon, Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { CalendarRange, FileSpreadsheet, PanelsTopLeft, RefreshCw, Trash2 } from 'lucide-react';
import {
  useBulkDeleteProyeccionesClases,
  useClaseTemplates,
  useDeleteProyeccionClase,
  useGenerateProyeccionesClases,
  useProgramaSedes,
  useProgramas,
  useProyeccionesClases,
} from '../api/hooks';
import { usePeriodoTrabajo } from '../context/PeriodoContext';
import { PlantillasClases } from './PlantillasClases';
import type { ClaseTemplate, Programa, Sede } from '../types';

type ProyeccionClase = {
  id: string;
  periodo: string;
  programa_id: string;
  programa_nombre?: string;
  celula_id: string | null;
  celula_nombre?: string | null;
  sede_id: string;
  sede_nombre?: string;
  template_id: string | null;
  template_nombre?: string | null;
  semestre: number;
  grupos: number;
  dias_semana_json: string;
  jornadas_json: string;
  estado: string;
};

function parseCount(json: string | null | undefined) {
  try {
    const parsed = JSON.parse(json ?? '[]');
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export function ProyeccionClases() {
  const { periodoId } = usePeriodoTrabajo();
  const { data: programas = [] } = useProgramas();
  const [programaId, setProgramaId] = useState('');
  const [sedeFiltro, setSedeFiltro] = useState('');
  const [templateFiltro, setTemplateFiltro] = useState('');
  const [semestreFiltro, setSemestreFiltro] = useState('');
  const [templatePorSede, setTemplatePorSede] = useState<Record<string, string>>({});
  const [editingPrograma, setEditingPrograma] = useState(false);

  const { data: sedesPrograma = [] } = useProgramaSedes(programaId);
  const { data: templates = [] } = useClaseTemplates(programaId || undefined);
  const { data: proyecciones = [], isLoading } = useProyeccionesClases({
    ...(periodoId ? { periodo: periodoId } : {}),
    ...(programaId ? { programa_id: programaId } : {}),
    ...(sedeFiltro ? { sede_id: sedeFiltro } : {}),
    ...(templateFiltro ? { template_id: templateFiltro } : {}),
    ...(semestreFiltro ? { semestre: semestreFiltro } : {}),
  });
  const generarProyecciones = useGenerateProyeccionesClases();
  const deleteProyeccion = useDeleteProyeccionClase();
  const bulkDelete = useBulkDeleteProyeccionesClases();

  const programaOptions = (programas as Programa[]).map(programa => ({ value: programa.id, label: programa.nombre }));
  const templateOptions = (templates as ClaseTemplate[]).map(template => ({ value: template.id, label: template.nombre }));
  const proyeccionesFiltradas = proyecciones as ProyeccionClase[];
  const sedesProgramaList = sedesPrograma as Sede[];
  const sedesFiltradasIds = new Set(proyeccionesFiltradas.map(item => item.sede_id));
  const sedesEdicionBase = sedeFiltro ? sedesProgramaList.filter(sede => sede.id === sedeFiltro) : sedesProgramaList;
  const sedesEdicion = (templateFiltro || semestreFiltro)
    ? sedesEdicionBase.filter(sede => sedesFiltradasIds.has(sede.id))
    : sedesEdicionBase;
  const sedesConPlantilla = sedesEdicion.filter(sede => templatePorSede[sede.id]);
  const filtrosActivos = Boolean(sedeFiltro || templateFiltro || semestreFiltro);
  const semestreOptions = Array.from(new Set([
    ...proyeccionesFiltradas.map(item => item.semestre),
    ...(templates as ClaseTemplate[]).flatMap(template => template.semestres?.map(item => item.semestre) ?? []),
  ]))
    .filter(semestre => Number.isFinite(Number(semestre)))
    .sort((a, b) => Number(a) - Number(b))
    .map(semestre => ({ value: String(semestre), label: `${semestre}° semestre` }));

  const resumen = useMemo(() => {
    const sedes = new Set(proyeccionesFiltradas.map(p => p.sede_id));
    const grupos = proyeccionesFiltradas.reduce((total, p) => total + Number(p.grupos ?? 0), 0);
    return { sedes: sedes.size, filas: proyeccionesFiltradas.length, grupos };
  }, [proyeccionesFiltradas]);
  const tieneProyeccionPrograma = proyeccionesFiltradas.length > 0;

  const handleGenerar = async () => {
    if (!periodoId || !programaId) {
      notifications.show({ message: 'Selecciona periodo y programa', color: 'red' });
      return;
    }
    if (sedesConPlantilla.length === 0) {
      notifications.show({ message: 'Asigna plantilla al menos a una sede', color: 'red' });
      return;
    }
    try {
      const res = await generarProyecciones.mutateAsync({
        periodo: periodoId,
        programa_id: programaId,
        reemplazar_existentes: true,
        sede_templates: sedesConPlantilla.map(sede => ({ sede_id: sede.id, template_id: templatePorSede[sede.id] })),
      });
      notifications.show({ message: `Proyección generada: ${res.creadas} fila(s)`, color: 'green' });
      setEditingPrograma(false);
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error ?? 'No fue posible generar la proyección', color: 'red' });
    }
  };

  const handleDeletePrograma = async () => {
    if (!periodoId || !programaId) return;
    const confirmed = window.confirm(
      filtrosActivos
        ? 'Se eliminará la proyección que coincida con los filtros activos para este programa y periodo. ¿Deseas continuar?'
        : 'Se eliminará toda la proyección del programa seleccionado para este periodo. ¿Deseas continuar?'
    );
    if (!confirmed) return;
    try {
      const res = await bulkDelete.mutateAsync({
        periodo: periodoId,
        programa_id: programaId,
        ...(sedeFiltro ? { sede_id: sedeFiltro } : {}),
        ...(templateFiltro ? { template_id: templateFiltro } : {}),
        ...(semestreFiltro ? { semestre: semestreFiltro } : {}),
      });
      setEditingPrograma(false);
      setTemplatePorSede({});
      notifications.show({ message: `Proyecciones eliminadas: ${res.eliminadas ?? 0}`, color: 'green' });
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error ?? 'No fue posible borrar las proyecciones', color: 'red' });
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>Proyección de clases</Title>
          <Text size="sm" c="dimmed">Define la oferta operativa antes de generar clases.</Text>
        </div>
        <Group gap="xs">
          <Badge color="brand" size="sm">{resumen.filas} proyección(es)</Badge>
          <Badge color="teal" variant="light" size="sm">{resumen.sedes} sede(s)</Badge>
          <Badge color="gray" variant="light" size="sm">{resumen.grupos} grupo(s)</Badge>
        </Group>
      </Group>

      <Tabs defaultValue="proyecciones" keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="proyecciones" leftSection={<FileSpreadsheet size={14} />}>Proyecciones</Tabs.Tab>
          <Tabs.Tab value="plantillas" leftSection={<PanelsTopLeft size={14} />}>Plantillas</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="proyecciones" pt="md">
          <Stack gap="md">
            <Paper p="sm" radius="md" withBorder>
              <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm" verticalSpacing="sm">
              <Select
                label="Programa"
                placeholder="Selecciona programa"
                data={programaOptions}
                value={programaId || null}
                onChange={value => {
                  setProgramaId(value || '');
                  setSedeFiltro('');
                  setTemplateFiltro('');
                  setSemestreFiltro('');
                  setTemplatePorSede({});
                  setEditingPrograma(false);
                }}
                searchable
                size="xs"
              />
              <Select
                label="Sede"
                placeholder="Todas las sedes"
                data={sedesProgramaList.map(sede => ({ value: sede.id, label: sede.nombre }))}
                value={sedeFiltro || null}
                onChange={value => setSedeFiltro(value || '')}
                searchable
                clearable
                disabled={!programaId}
                size="xs"
              />
              <Select
                label="Plantilla usada"
                placeholder="Todas las plantillas"
                data={templateOptions}
                value={templateFiltro || null}
                onChange={value => setTemplateFiltro(value || '')}
                searchable
                clearable
                disabled={!programaId}
                size="xs"
              />
              <Select
                label="Semestre"
                placeholder="Todos"
                data={semestreOptions}
                value={semestreFiltro || null}
                onChange={value => setSemestreFiltro(value || '')}
                clearable
                disabled={!programaId}
                size="xs"
              />
              </SimpleGrid>
              <Group justify="flex-end" gap="xs" mt="sm">
                <Button
                  size="xs"
                  leftSection={<RefreshCw size={14} />}
                  onClick={handleGenerar}
                  loading={generarProyecciones.isPending}
                  disabled={!periodoId || !programaId || sedesConPlantilla.length === 0}
                >
                  Generar proyección
                </Button>
                <Button
                  size="xs"
                  color="red"
                  variant="light"
                  leftSection={<Trash2 size={14} />}
                  onClick={handleDeletePrograma}
                  loading={bulkDelete.isPending}
                  disabled={!periodoId || !programaId || proyeccionesFiltradas.length === 0}
                >
                  {filtrosActivos ? 'Borrar selección' : 'Borrar programa'}
                </Button>
              </Group>
              {programaId && editingPrograma && (
                <Text size="xs" c="dimmed" mt="xs">
                  Se proyectaran {sedesConPlantilla.length} de {sedesEdicion.length} sede(s) mostradas.
                </Text>
              )}
            </Paper>

            {programaId && tieneProyeccionPrograma && !editingPrograma && (
              <Paper p="md" radius="md" withBorder>
                <Group justify="space-between">
                  <div>
                    <Text fw={700}>Este programa ya tiene proyección</Text>
                    <Text size="sm" c="dimmed">
                      Revisa la tabla inferior o entra en edición para regenerar sedes desde plantillas.
                    </Text>
                  </div>
                  <Group gap="sm">
                    <Button size="xs" variant="light" leftSection={<RefreshCw size={14} />} onClick={() => setEditingPrograma(true)}>
                      Editar proyección
                    </Button>
                  </Group>
                </Group>
              </Paper>
            )}

            {programaId && editingPrograma && tieneProyeccionPrograma && (
              <Group justify="flex-end">
                <Button size="xs" variant="light" onClick={() => {
                  setEditingPrograma(false);
                  setTemplatePorSede({});
                }}>
                  Cancelar edición
                </Button>
              </Group>
            )}

            {programaId && (!tieneProyeccionPrograma || editingPrograma) && (
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Sede</Table.Th>
                    <Table.Th>Plantilla</Table.Th>
                    <Table.Th>Semestres</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sedesEdicion.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={3}>
                        <Text ta="center" c="dimmed" py="md">No hay sedes para los filtros seleccionados.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : sedesEdicion.map(sede => {
                    const template = (templates as ClaseTemplate[]).find(t => t.id === templatePorSede[sede.id]);
                    return (
                      <Table.Tr key={sede.id}>
                        <Table.Td>{sede.nombre}</Table.Td>
                        <Table.Td>
                          <Select
                            placeholder="Plantilla"
                            data={templateOptions}
                            value={templatePorSede[sede.id] || null}
                            onChange={value => setTemplatePorSede(current => ({ ...current, [sede.id]: value || '' }))}
                            clearable
                            searchable
                            size="xs"
                          />
                        </Table.Td>
                        <Table.Td>
                          {template?.semestres?.length
                            ? template.semestres.map(item => `${item.semestre}°: ${item.grupos}`).join(', ')
                            : <Text size="sm" c="dimmed">Sin plantilla</Text>}
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}

            {!periodoId && (
              <Alert icon={<CalendarRange size={16} />} color="yellow">Selecciona un periodo de trabajo para generar proyecciones.</Alert>
            )}

            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Programa</Table.Th>
                  <Table.Th>Célula</Table.Th>
                  <Table.Th>Sede</Table.Th>
                  <Table.Th>Sem.</Table.Th>
                  <Table.Th>Grupos</Table.Th>
                  <Table.Th>Días</Table.Th>
                  <Table.Th>Jornadas</Table.Th>
                  <Table.Th>Plantilla</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {proyeccionesFiltradas.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={10}>
                      <Text ta="center" c="dimmed" py="md">{isLoading ? 'Cargando...' : 'No hay proyecciones para los filtros seleccionados.'}</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : proyeccionesFiltradas.map(item => (
                  <Table.Tr key={item.id}>
                    <Table.Td>{item.programa_nombre}</Table.Td>
                    <Table.Td>{item.celula_nombre ?? 'Sin célula'}</Table.Td>
                    <Table.Td>{item.sede_nombre}</Table.Td>
                    <Table.Td>{item.semestre}°</Table.Td>
                    <Table.Td>{item.grupos}</Table.Td>
                    <Table.Td>{parseCount(item.dias_semana_json)}</Table.Td>
                    <Table.Td>{parseCount(item.jornadas_json)}</Table.Td>
                    <Table.Td>{item.template_nombre ?? 'Manual'}</Table.Td>
                    <Table.Td><Badge variant="light">{item.estado}</Badge></Table.Td>
                    <Table.Td>
                      <Tooltip label="Eliminar proyección">
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={async () => {
                            await deleteProyeccion.mutateAsync(item.id);
                            notifications.show({ message: 'Proyección eliminada', color: 'green' });
                          }}
                        >
                          <Trash2 size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="plantillas" pt="md">
          <PlantillasClases />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
