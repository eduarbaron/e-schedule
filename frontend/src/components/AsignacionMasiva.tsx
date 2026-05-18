import { useMemo, useState } from 'react';
import {
  Modal, Stack, Button, Group, Text, Badge, Table, Checkbox,
  Alert, Progress, Select, Paper, ThemeIcon, Tooltip, ActionIcon, Tabs
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  Zap, AlertTriangle, CheckCircle, XCircle, Info, Star, List, Calendar, RotateCcw
} from 'lucide-react';
import { useAutoBulkDraft, useConfirmBulk, useRevertirPrograma, useProgramas } from '../api/hooks';
import type { DraftItem, Programa } from '../types';
import { DIA_LABELS } from '../types';
import { HorarioBorrador } from './HorarioBorrador';
import { useConfirm } from './ConfirmProvider';
import { usePeriodoTrabajo } from '../context/PeriodoContext';

type ProgramaConfirmado = { programa_id: string; programa_nombre: string; count: number };
type DraftFilters = {
  docenteId: string | null;
  sedeId: string | null;
  materiaId: string | null;
  semana: 'todas' | 'A' | 'B' | 'semanal';
  estado: 'todos' | 'locales' | 'foraneos' | 'advertencias';
};
const BRAND_BLUE = '#528BC9';
const SUCCESS_GREEN = '#87BF58';
const SUCCESS_GREEN_LIGHT = '#f0f7e8';
const calendarioLabel = (calendario: DraftItem['calendario']) =>
  calendario === 'A' ? 'Semana A' : calendario === 'B' ? 'Semana B' : 'Semanal / A + B';

interface Props {
  opened: boolean;
  onClose: () => void;
}

export function AsignacionMasiva({ opened, onClose }: Props) {
  const confirm = useConfirm();
  const { periodoId: periodoFinal, periodoSeleccionado } = usePeriodoTrabajo();
  const { data: programas = [] } = useProgramas();

  const [programaId, setProgramaId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [tab, setTab] = useState<string>('lista');
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [fase, setFase] = useState<'config' | 'preview' | 'confirmando' | 'done'>('config');
  const [confirmados, setConfirmados] = useState<ProgramaConfirmado[]>([]);
  const [filtros, setFiltros] = useState<DraftFilters>({
    docenteId: null,
    sedeId: null,
    materiaId: null,
    semana: 'todas',
    estado: 'todos',
  });

  const autoBulk = useAutoBulkDraft();
  const confirmBulk = useConfirmBulk();
  const revertir = useRevertirPrograma();

  const programasOrdenados = [...(programas as Programa[])].sort(
    (a, b) => (b.es_prioritario - a.es_prioritario) || (a.orden_prioridad - b.orden_prioridad)
  );

  const handleGenerarDraft = async () => {
    if (!periodoFinal || !programaId) {
      notifications.show({ message: 'Selecciona período y programa', color: 'orange' });
      return;
    }
    try {
      const result = await autoBulk.mutateAsync({ periodo: periodoFinal, programa_id: programaId });
      if (result.draft.length === 0) {
        notifications.show({
          message: 'No se encontraron asignaciones posibles para este programa. Verifica disponibilidad y configuración.',
          color: 'orange',
        });
        return;
      }
      setDraft(result.draft);
      setSeleccionados(new Set(result.draft.map((_: DraftItem, i: number) => i)));
      setFiltros({ docenteId: null, sedeId: null, materiaId: null, semana: 'todas', estado: 'todos' });
      setTab('lista');
      setFase('preview');
    } catch (e: any) {
      notifications.show({ message: e.response?.data?.error || 'Error al generar borrador', color: 'red' });
    }
  };

  const handleToggleItem = (idx: number) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleToggleAll = () => {
    const visibles = visibleDraft.map(({ idx }) => idx);
    const todosVisiblesSeleccionados = visibles.length > 0 && visibles.every(idx => seleccionados.has(idx));
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (todosVisiblesSeleccionados) {
        visibles.forEach(idx => next.delete(idx));
      } else {
        visibles.forEach(idx => next.add(idx));
      }
      return next;
    });
  };

  const handleConfirmar = async () => {
    const aConfirmar = draft
      .filter((_, i) => seleccionados.has(i))
      .map(item => ({
        docente_id: item.docente_id,
        sede_id: item.sede_id,
        materia_id: item.materia_id,
        dia_semana: item.dia_semana,
        hora_inicio: item.hora_inicio,
        hora_fin: item.hora_fin,
        grupo: item.grupo,
        calendario: item.calendario,
        modo: item.es_foraneo ? 'foraneo' : 'automatico',
        periodo: periodoFinal,
      }));

    if (aConfirmar.length === 0) {
      notifications.show({ message: 'No hay asignaciones seleccionadas', color: 'orange' });
      return;
    }

    setFase('confirmando');
    try {
      await confirmBulk.mutateAsync(aConfirmar);
      const prog = (programas as Programa[]).find(p => p.id === programaId);
      setConfirmados(prev => [
        ...prev.filter(c => c.programa_id !== programaId),
        { programa_id: programaId!, programa_nombre: prog?.nombre ?? programaId!, count: aConfirmar.length },
      ]);
      setFase('done');
      notifications.show({
        message: `${aConfirmar.length} asignaciones confirmadas para ${prog?.nombre}`,
        color: 'green',
        autoClose: 5000,
      });
    } catch (e: any) {
      setFase('preview');
      const data = e.response?.data;
      const detalle = data?.errores?.length ? ` ${data.errores.join(' | ')}` : '';
      const posicion = typeof data?.index === 'number' ? ` Fila ${data.index + 1}.` : '';
      notifications.show({
        message: `Error al confirmar:${posicion} ${data?.error || e.message}.${detalle}`,
        color: 'red',
        autoClose: 9000,
      });
    }
  };

  const handleRevertir = async (pid: string, pnombre: string) => {
    if (!(await confirm({
      title: 'Revertir asignaciones',
      message: `¿Revertir todas las asignaciones automáticas de "${pnombre}" en el período ${periodoFinal}?`,
      confirmLabel: 'Revertir',
      color: 'orange',
    }))) return;
    try {
      const res = await revertir.mutateAsync({ programa_id: pid, periodo: periodoFinal });
      setConfirmados(prev => prev.filter(c => c.programa_id !== pid));
      notifications.show({ message: `↩ ${res.eliminadas} asignaciones revertidas`, color: 'orange' });
    } catch {
      notifications.show({ message: 'Error al revertir', color: 'red' });
    }
  };

  const handleSiguientePrograma = () => {
    setDraft([]);
    setSeleccionados(new Set());
    setFiltros({ docenteId: null, sedeId: null, materiaId: null, semana: 'todas', estado: 'todos' });
    setTab('lista');
    setProgramaId(null);
    setFase('config');
  };

  const handleCerrar = () => {
    setFase('config');
    setDraft([]);
    setSeleccionados(new Set());
    setFiltros({ docenteId: null, sedeId: null, materiaId: null, semana: 'todas', estado: 'todos' });
    setTab('lista');
    setProgramaId(null);
    onClose();
  };

  const conAdvertencias = draft.filter(d => d.advertencias.length > 0).length;
  const seleccionadosCount = seleccionados.size;
  const programaActual = (programas as Programa[]).find(p => p.id === programaId);
  const docenteOptions = useMemo(() => {
    const uniq = new Map<string, string>();
    draft.forEach(item => uniq.set(item.docente_id, item.docente_nombre));
    return Array.from(uniq.entries()).map(([value, label]) => ({ value, label }));
  }, [draft]);
  const sedeOptions = useMemo(() => {
    const uniq = new Map<string, string>();
    draft.forEach(item => uniq.set(item.sede_id, item.sede_nombre));
    return Array.from(uniq.entries()).map(([value, label]) => ({ value, label }));
  }, [draft]);
  const materiaOptions = useMemo(() => {
    const uniq = new Map<string, string>();
    draft.forEach(item => uniq.set(item.materia_id, item.materia_nombre));
    return Array.from(uniq.entries()).map(([value, label]) => ({ value, label }));
  }, [draft]);
  const visibleDraft = useMemo(() => {
    return draft
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) =>
        (!filtros.docenteId || item.docente_id === filtros.docenteId) &&
        (!filtros.sedeId || item.sede_id === filtros.sedeId) &&
        (!filtros.materiaId || item.materia_id === filtros.materiaId) &&
        (filtros.semana === 'todas' || item.calendario === filtros.semana) &&
        (filtros.estado === 'todos' ||
          (filtros.estado === 'locales' && !item.es_foraneo) ||
          (filtros.estado === 'foraneos' && item.es_foraneo) ||
          (filtros.estado === 'advertencias' && item.advertencias.length > 0))
      );
  }, [draft, filtros]);
  const visiblesSeleccionados = visibleDraft.filter(({ idx }) => seleccionados.has(idx)).length;
  const todosVisiblesSeleccionados = visibleDraft.length > 0 && visiblesSeleccionados === visibleDraft.length;

  return (
    <Modal
      opened={opened}
      onClose={handleCerrar}
      title={
        <Group gap="sm">
          <ThemeIcon size="md" color="brand" variant="light"><Zap size={16} /></ThemeIcon>
          <Text fw={700} size="lg">Asignación masiva por programa</Text>
        </Group>
      }
      size="90%"
      styles={{ body: { padding: 0 } }}
    >
      <Stack gap={0}>

        {/* ── FASE: Configuración ── */}
        {fase === 'config' && (
          <Stack gap="lg" p="lg">
            <Alert icon={<Info size={16} />} color="blue" title="Flujo por programa">
              Selecciona un programa y genera el borrador de asignaciones para ese programa.
              Revisa, ajusta y confirma. Luego avanza al siguiente programa.
              Si algo salió mal, puedes <strong>revertir</strong> un programa completo.
            </Alert>

            {/* Programas ya confirmados */}
            {confirmados.length > 0 && (
              <Paper p="md" radius="md" withBorder>
                <Text size="sm" fw={600} mb="xs">Programas asignados en este período</Text>
                <Stack gap="xs">
                  {confirmados.map(c => (
                    <Group key={c.programa_id} justify="space-between">
                      <Group gap="xs">
                        <CheckCircle size={14} color="#40c057" />
                        <Text size="sm">{c.programa_nombre}</Text>
                        <Badge size="xs" color="green" variant="light">{c.count} asignaciones</Badge>
                      </Group>
                      <Tooltip label="Revertir asignaciones de este programa">
                        <ActionIcon
                          size="sm" variant="light" color="orange"
                          loading={revertir.isPending}
                          onClick={() => handleRevertir(c.programa_id, c.programa_nombre)}
                        >
                          <RotateCcw size={13} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  ))}
                </Stack>
              </Paper>
            )}

            <Group align="flex-end" grow>
              <Paper p="sm" radius="md" withBorder bg="gray.0">
                <Text size="xs" c="dimmed">Periodo de trabajo</Text>
                <Text size="sm" fw={700}>{periodoSeleccionado?.nombre ?? (periodoFinal || 'Sin periodo activo')}</Text>
              </Paper>
              <Select
                label="Programa a asignar"
                placeholder="Seleccionar programa..."
                data={programasOrdenados.map(p => ({
                  value: p.id,
                  label: `${p.nombre}${p.es_prioritario ? ' (Prioritario)' : ''}`,
                  disabled: confirmados.some(c => c.programa_id === p.id),
                }))}
                value={programaId}
                onChange={v => setProgramaId(v)}
                searchable
              />
            </Group>

            <Group justify="flex-end">
              <Button variant="light" onClick={handleCerrar}>Cerrar</Button>
              <Button
                leftSection={<Zap size={16} />}
                color="brand"
                onClick={handleGenerarDraft}
                loading={autoBulk.isPending}
                disabled={!periodoFinal || !programaId}
                size="md"
              >
                Generar borrador
              </Button>
            </Group>
          </Stack>
        )}

        {/* ── FASE: Preview / Review ── */}
        {fase === 'preview' && (
          <Stack gap={0}>
            <Paper p="md" radius={0} style={{ borderBottom: '1px solid #dbe6f2', position: 'sticky', top: 0, zIndex: 10, background: 'white' }}>
              <Group justify="space-between" wrap="nowrap">
                <Group gap="md">
                  <Stack gap={2}>
                    <Group gap="xs">
                      {programaActual?.es_prioritario === 1 && <Star size={14} fill="#fab005" color="#fab005" />}
                      <Text fw={700} size="lg">{programaActual?.nombre}</Text>
                    </Group>
                    <Text size="sm" c="dimmed">{draft.length} asignaciones generadas · Período: {periodoFinal}</Text>
                  </Stack>
                  <Badge color="brand" size="lg">{seleccionadosCount} seleccionadas</Badge>
                  <Badge color="gray" size="lg" variant="light">{visibleDraft.length} visibles</Badge>
                  {conAdvertencias > 0 && (
                    <Badge color="orange" size="lg" leftSection={<AlertTriangle size={12} />}>
                      {conAdvertencias} con advertencias
                    </Badge>
                  )}
                </Group>
                <Group>
                  <Button variant="light" color="gray" size="sm"
                    onClick={() => { setFase('config'); setDraft([]); }}>
                    ← Cambiar programa
                  </Button>
                  <Button color="red" variant="light" size="sm"
                    disabled={seleccionadosCount === 0}
                    onClick={() => setSeleccionados(new Set())}>
                    Deseleccionar todo
                  </Button>
                  <Button color="green" size="sm"
                    leftSection={<CheckCircle size={16} />}
                    onClick={handleConfirmar}
                    disabled={seleccionadosCount === 0}>
                    Confirmar {seleccionadosCount} asignaciones
                  </Button>
                </Group>
              </Group>
              <Progress value={(seleccionadosCount / draft.length) * 100} color="success" size="sm" mt="sm" />
            </Paper>

            <Paper p="sm" radius={0} style={{ borderBottom: '1px solid #e9ecef', background: '#f8f9fa' }}>
              <Group gap="xs" align="flex-end">
                <Select
                  label="Docente"
                  placeholder="Todos"
                  data={docenteOptions}
                  value={filtros.docenteId}
                  onChange={v => setFiltros(f => ({ ...f, docenteId: v }))}
                  searchable
                  clearable
                  size="xs"
                  w={210}
                />
                <Select
                  label="Sede"
                  placeholder="Todas"
                  data={sedeOptions}
                  value={filtros.sedeId}
                  onChange={v => setFiltros(f => ({ ...f, sedeId: v }))}
                  searchable
                  clearable
                  size="xs"
                  w={220}
                />
                <Select
                  label="Materia"
                  placeholder="Todas"
                  data={materiaOptions}
                  value={filtros.materiaId}
                  onChange={v => setFiltros(f => ({ ...f, materiaId: v }))}
                  searchable
                  clearable
                  size="xs"
                  w={220}
                />
                <Select
                  label="Semana"
                  data={[
                    { value: 'todas', label: 'Todas' },
                    { value: 'A', label: 'Semana A' },
                    { value: 'B', label: 'Semana B' },
                    { value: 'semanal', label: 'Semanal / A + B' },
                  ]}
                  value={filtros.semana}
                  onChange={v => setFiltros(f => ({ ...f, semana: (v as DraftFilters['semana']) || 'todas' }))}
                  size="xs"
                  w={150}
                />
                <Select
                  label="Estado"
                  data={[
                    { value: 'todos', label: 'Todos' },
                    { value: 'locales', label: 'Locales' },
                    { value: 'foraneos', label: 'Foraneos' },
                    { value: 'advertencias', label: 'Con advertencias' },
                  ]}
                  value={filtros.estado}
                  onChange={v => setFiltros(f => ({ ...f, estado: (v as DraftFilters['estado']) || 'todos' }))}
                  size="xs"
                  w={160}
                />
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  onClick={() => setFiltros({ docenteId: null, sedeId: null, materiaId: null, semana: 'todas', estado: 'todos' })}
                >
                  Limpiar filtros
                </Button>
              </Group>
            </Paper>

            <Tabs value={tab} onChange={v => setTab(v ?? 'lista')}>
              <Tabs.List px="md" style={{ borderBottom: '1px solid #e9ecef' }}>
                <Tabs.Tab value="lista" leftSection={<List size={14} />}>Lista</Tabs.Tab>
                <Tabs.Tab value="horario" leftSection={<Calendar size={14} />}>Vista horario</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="lista">
                <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                  <Table striped stickyHeader>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>
                          <Checkbox
                            checked={todosVisiblesSeleccionados}
                            indeterminate={visiblesSeleccionados > 0 && visiblesSeleccionados < visibleDraft.length}
                            onChange={handleToggleAll}
                          />
                        </Table.Th>
                        <Table.Th>Docente</Table.Th>
                        <Table.Th>Materia</Table.Th>
                        <Table.Th>Sem.</Table.Th>
                        <Table.Th>Grupo</Table.Th>
                        <Table.Th>Semana</Table.Th>
                        <Table.Th>Sede</Table.Th>
                        <Table.Th>Día</Table.Th>
                        <Table.Th>Horario</Table.Th>
                        <Table.Th>Distancia</Table.Th>
                        <Table.Th>Score</Table.Th>
                        <Table.Th>Estado</Table.Th>
                        <Table.Th></Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {visibleDraft.map(({ item, idx }) => {
                        const selected = seleccionados.has(idx);
                        const tieneAdv = item.advertencias.length > 0;
                        return (
                            <Table.Tr
                            key={idx}
                            style={{
                              background: !selected ? '#f8f9fa' : tieneAdv ? SUCCESS_GREEN_LIGHT : undefined,
                              opacity: selected ? 1 : 0.45,
                            }}
                          >
                            <Table.Td><Checkbox checked={selected} onChange={() => handleToggleItem(idx)} /></Table.Td>
                            <Table.Td><Text size="sm" fw={500}>{item.docente_nombre}</Text></Table.Td>
                            <Table.Td><Text size="sm">{item.materia_nombre}</Text></Table.Td>
                            <Table.Td>
                              {item.semestre ? (
                                <Badge variant="light" size="sm" color="indigo">S{item.semestre}</Badge>
                              ) : (
                                <Text size="sm" c="dimmed">-</Text>
                              )}
                            </Table.Td>
                            <Table.Td><Badge variant="outline" size="sm" color="gray">G{item.grupo}</Badge></Table.Td>
                            <Table.Td>
                              <Badge variant="filled" size="xs"
                                color={item.calendario === 'semanal' ? 'teal' : 'blue'}>
                                {calendarioLabel(item.calendario)}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={0}>
                                <Text size="sm">{item.sede_nombre}</Text>
                                {item.es_foraneo && (
                                  <Tooltip
                                    label={`Viene de ${item.celula_docente_nombre ?? item.celula_docente_id ?? 'sin célula'} y cubre ${item.celula_sede_nombre ?? item.celula_sede_id ?? 'sede sin célula'}`}
                                    multiline
                                    w={260}
                                  >
                                    <Badge size="xs" color="red" variant="light" style={{ cursor: 'help' }}>
                                      Foráneo
                                    </Badge>
                                  </Tooltip>
                                )}
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Badge variant="light" size="sm">{DIA_LABELS[item.dia_semana] ?? item.dia_semana}</Badge>
                            </Table.Td>
                            <Table.Td><Text size="sm">{item.hora_inicio} – {item.hora_fin}</Text></Table.Td>
                            <Table.Td>
                              <Text size="sm" c={item.distancia_km > 50 ? 'orange' : 'dimmed'}>
                                {item.distancia_km.toFixed(1)} km
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={item.score > -5 ? 'green' : item.score > -15 ? 'yellow' : 'red'}
                                variant="light" size="sm">
                                {item.score.toFixed(1)}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              {tieneAdv ? (
                                <Tooltip label={item.advertencias.join(' | ')} multiline w={260}>
                                  <Badge color="orange" variant="light" size="sm" style={{ cursor: 'help' }}
                                    leftSection={<AlertTriangle size={11} />}>
                                    Advertencia
                                  </Badge>
                                </Tooltip>
                              ) : (
                                <Badge color="green" variant="light" size="sm" leftSection={<CheckCircle size={11} />}>
                                  Ok
                                </Badge>
                              )}
                            </Table.Td>
                            <Table.Td>
                              <Tooltip label={selected ? 'Excluir' : 'Incluir'}>
                                <ActionIcon size="sm" variant="subtle" color={selected ? 'red' : 'gray'}
                                  onClick={() => handleToggleItem(idx)}>
                                  {selected ? <XCircle size={16} /> : <CheckCircle size={16} />}
                                </ActionIcon>
                              </Tooltip>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </div>
              </Tabs.Panel>

              <Tabs.Panel value="horario">
                <HorarioBorrador draft={draft} seleccionados={seleccionados} filtros={filtros} />
              </Tabs.Panel>
            </Tabs>
          </Stack>
        )}

        {/* ── FASE: Confirmando ── */}
        {fase === 'confirmando' && (
          <Stack align="center" gap="lg" p="xl">
            <Zap size={48} color={BRAND_BLUE} />
            <Text fw={600} size="lg">Persistiendo {seleccionadosCount} asignaciones...</Text>
            <Progress value={100} animated color="success" w={300} />
          </Stack>
        )}

        {/* ── FASE: Done ── */}
        {fase === 'done' && (
          <Stack align="center" gap="lg" p="xl">
            <CheckCircle size={56} color={SUCCESS_GREEN} />
            <Text fw={700} size="xl">¡Programa asignado!</Text>
            <Text c="dimmed">
              {seleccionadosCount} asignaciones de <strong>{programaActual?.nombre}</strong> guardadas en el período {periodoFinal}.
            </Text>
            <Group>
              <Button variant="light" color="orange" leftSection={<RotateCcw size={16} />}
                loading={revertir.isPending}
                onClick={() => handleRevertir(programaId!, programaActual?.nombre ?? '')}>
                Revertir este programa
              </Button>
              <Button color="brand" leftSection={<Zap size={16} />} onClick={handleSiguientePrograma}>
                Asignar siguiente programa
              </Button>
              <Button variant="light" onClick={handleCerrar}>Cerrar</Button>
            </Group>
          </Stack>
        )}

      </Stack>
    </Modal>
  );
}
