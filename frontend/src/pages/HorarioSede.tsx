import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Group,
  Paper,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { CalendarDays, FileText } from 'lucide-react';
import { useAsignaciones, useCelulas, useClases, useProgramaSedes, useProgramas, useSedes } from '../api/hooks';
import type { Asignacion, Celula, ClaseAcademica, Programa, Sede } from '../types';
import { DIA_LABELS } from '../types';
import { usePeriodoTrabajo } from '../context/PeriodoContext';
import { printReport } from '../utils/reportExport';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S'] as const;
const HORA_INICIO = 6;
const HORA_FIN = 22;
const PX_POR_HORA = 58;
const BASE_COL_WIDTH = 156;
const MIN_SUB_COL_WIDTH = 78;
const COLORS = ['#528BC9', '#87BF58', '#f59f00', '#e8590c', '#845ef7', '#15aabf', '#e64980'];

type HorarioItem = {
  id: string;
  tipo: 'clase' | 'asignacion';
  titulo: string;
  subtitulo: string;
  detalle: string;
  programa?: string | null;
  docente?: string | null;
  docenteCelula?: string | null;
  sedeCelula?: string | null;
  modo?: 'automatico' | 'libre' | 'foraneo';
  distanciaKm?: number | null;
  asignacion?: {
    docente: string;
    celula?: string | null;
    celulaOrigen?: string | null;
    celulaDestino?: string | null;
    modo: 'automatico' | 'libre' | 'foraneo';
    distanciaKm: number | null;
  };
  estado?: string;
  semestre?: number | null;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  calendario: 'A' | 'B' | 'semanal';
  grupo: number;
  colorKey: string;
};

function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToPx(minutes: number) {
  return ((minutes - HORA_INICIO * 60) / 60) * PX_POR_HORA;
}

function durationPx(inicio: string, fin: string) {
  return ((timeToMinutes(fin) - timeToMinutes(inicio)) / 60) * PX_POR_HORA;
}

function calendarioLabel(calendario: HorarioItem['calendario']) {
  return calendario === 'A' ? 'Semana A' : calendario === 'B' ? 'Semana B' : 'Semanal / A + B';
}

function modoLabel(modo: 'automatico' | 'libre' | 'foraneo') {
  return modo === 'libre' ? 'Libre manual' : modo === 'foraneo' ? 'Foráneo' : 'Automático';
}

function asignacionKey(item: {
  periodo: string;
  sede_id: string;
  materia_id: string;
  grupo: number;
  calendario: string;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
}) {
  return [
    item.periodo,
    item.sede_id,
    item.materia_id,
    item.grupo,
    item.calendario,
    item.dia_semana,
    item.hora_inicio,
    item.hora_fin,
  ].join('|');
}

function bloquesCompiten(a: HorarioItem, b: HorarioItem) {
  return timeToMinutes(a.hora_inicio) < timeToMinutes(b.hora_fin) &&
    timeToMinutes(a.hora_fin) > timeToMinutes(b.hora_inicio);
}

function resolveColumns(bloques: Array<{ item: HorarioItem; idx: number }>) {
  const result = new Map<number, { col: number; totalCols: number }>();
  const assigned = new Array(bloques.length).fill(false);

  for (let i = 0; i < bloques.length; i++) {
    if (assigned[i]) continue;
    const cluster = [i];
    assigned[i] = true;
    for (let j = i + 1; j < bloques.length; j++) {
      if (assigned[j]) continue;
      if (cluster.some(ci => bloquesCompiten(bloques[ci].item, bloques[j].item))) {
        cluster.push(j);
        assigned[j] = true;
      }
    }

    const cols = new Array(cluster.length).fill(-1);
    for (let ci = 0; ci < cluster.length; ci++) {
      const used = new Set<number>();
      for (let cj = 0; cj < ci; cj++) {
        if (bloquesCompiten(bloques[cluster[ci]].item, bloques[cluster[cj]].item)) {
          used.add(cols[cj]);
        }
      }
      let col = 0;
      while (used.has(col)) col++;
      cols[ci] = col;
    }

    const totalCols = Math.max(...cols) + 1;
    cluster.forEach((bi, ci) => result.set(bloques[bi].idx, { col: cols[ci], totalCols }));
  }

  return result;
}

export function HorarioSede() {
  const { periodoId: periodoFinal, periodoSeleccionado } = usePeriodoTrabajo();
  const { data: sedes = [] } = useSedes();
  const { data: celulas = [] } = useCelulas();
  const { data: programas = [] } = useProgramas();
  const [zonaId, setZonaId] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [programaId, setProgramaId] = useState('');
  const { data: sedesPrograma = [] } = useProgramaSedes(programaId);
  const [semestre, setSemestre] = useState('');
  const [semana, setSemana] = useState<'todas' | 'A' | 'B'>('todas');
  const [vista, setVista] = useState<'clases' | 'asignaciones' | 'ambas'>('ambas');

  const { data: clases = [], isLoading: loadingClases } = useClases({
    ...(periodoFinal ? { periodo: periodoFinal } : {}),
    ...(programaId ? { programa_id: programaId } : {}),
    ...(sedeId ? { sede_id: sedeId } : {}),
    ...(semestre ? { semestre } : {}),
  });
  const { data: asignaciones = [], isLoading: loadingAsignaciones } = useAsignaciones({
    ...(periodoFinal ? { periodo: periodoFinal } : {}),
    ...(programaId ? { programa_id: programaId } : {}),
    ...(sedeId ? { sede_id: sedeId } : {}),
  });

  const colorPorKey = useMemo(() => {
    const keys = new Set<string>();
    (clases as ClaseAcademica[]).forEach(c => keys.add(c.programa_id));
    (asignaciones as Asignacion[]).forEach(a => keys.add(a.materia_id));
    const map = new Map<string, string>();
    Array.from(keys).forEach((key, idx) => map.set(key, COLORS[idx % COLORS.length]));
    return map;
  }, [clases, asignaciones]);

  const sedesBase = useMemo(() => {
    return programaId && (sedesPrograma as Sede[]).length > 0
      ? (sedesPrograma as Sede[])
      : (sedes as Sede[]);
  }, [programaId, sedesPrograma, sedes]);

  const zonasDisponibles = useMemo(() => {
    const zonaIds = new Set(sedesBase.map(sede => sede.celula_id).filter(Boolean));
    return (celulas as Celula[]).filter(celula => !programaId || zonaIds.has(celula.id));
  }, [celulas, sedesBase, programaId]);

  const sedesFiltradas = useMemo(() => {
    return sedesBase.filter(sede => !zonaId || sede.celula_id === zonaId);
  }, [sedesBase, zonaId]);

  const sedeIdsFiltradas = useMemo(() => new Set(sedesFiltradas.map(sede => sede.id)), [sedesFiltradas]);

  const clasesFiltradas = useMemo(() => {
    return (clases as ClaseAcademica[]).filter(clase =>
      (!zonaId || sedeIdsFiltradas.has(clase.sede_id)) &&
      (!programaId || clase.programa_id === programaId) &&
      (!semestre || String(clase.semestre ?? '') === semestre)
    );
  }, [clases, zonaId, sedeIdsFiltradas, programaId, semestre]);

  const asignacionesFiltradas = useMemo(() => {
    return (asignaciones as Asignacion[]).filter(asignacion =>
      (!zonaId || sedeIdsFiltradas.has(asignacion.sede_id)) &&
      (!programaId || asignacion.programa_id === programaId) &&
      (!semestre || String(asignacion.semestre ?? '') === semestre)
    );
  }, [asignaciones, zonaId, sedeIdsFiltradas, programaId, semestre]);

  const semestreOptions = useMemo(() => {
    const valores = new Set<number>();
    clasesFiltradas.forEach(clase => {
      if (clase.semestre) valores.add(clase.semestre);
    });
    asignacionesFiltradas.forEach(asignacion => {
      if (asignacion.semestre) valores.add(asignacion.semestre);
    });
    return Array.from(valores)
      .sort((a, b) => a - b)
      .map(value => ({ value: String(value), label: `Semestre ${value}` }));
  }, [clasesFiltradas, asignacionesFiltradas]);

  const items = useMemo(() => {
    const fromClases: HorarioItem[] = vista === 'asignaciones' ? [] : clasesFiltradas.map(clase => ({
      id: `clase-${clase.id}`,
      tipo: 'clase',
      titulo: clase.materia_nombre ?? 'Clase',
      subtitulo: `G${clase.grupo} · ${calendarioLabel(clase.calendario)}`,
      detalle: `${clase.sede_nombre ?? 'Sin sede'} - ${clase.programa_nombre ?? 'Sin programa'}`,
      programa: clase.programa_nombre,
      dia_semana: clase.dia_semana,
      hora_inicio: clase.hora_inicio,
      hora_fin: clase.hora_fin,
      calendario: clase.calendario,
      grupo: clase.grupo,
      colorKey: clase.programa_id,
      semestre: clase.semestre,
    }));

    const fromAsignaciones: HorarioItem[] = vista === 'clases' ? [] : asignacionesFiltradas.map(asignacion => ({
      id: `asig-${asignacion.id}`,
      tipo: 'asignacion',
      titulo: asignacion.materia_nombre ?? 'Asignacion',
      subtitulo: asignacion.docente_nombre ?? 'Docente sin nombre',
      detalle: `G${asignacion.grupo} · ${calendarioLabel(asignacion.calendario)}`,
      docente: asignacion.docente_nombre,
      programa: asignacion.programa_nombre,
      docenteCelula: asignacion.docente_celula_nombre ?? asignacion.docente_celula_id ?? null,
      sedeCelula: asignacion.sede_celula_nombre ?? asignacion.celula_nombre ?? asignacion.sede_celula_id ?? null,
      modo: asignacion.modo,
      distanciaKm: asignacion.distancia_km,
      dia_semana: asignacion.dia_semana,
      hora_inicio: asignacion.hora_inicio,
      hora_fin: asignacion.hora_fin,
      calendario: asignacion.calendario,
      grupo: asignacion.grupo,
      colorKey: asignacion.programa_id ?? asignacion.materia_id,
      semestre: asignacion.semestre,
    }));

    return [...fromClases, ...fromAsignaciones]
      .filter(item => semana === 'todas' || item.calendario === 'semanal' || item.calendario === semana);
  }, [clasesFiltradas, asignacionesFiltradas, vista, semana]);

  const itemsVisuales = useMemo(() => {
    const asignacionesPorClase = new Map(
      asignacionesFiltradas.map(asignacion => [asignacionKey(asignacion), asignacion])
    );
    const clasesPorId = new Map(clasesFiltradas.map(clase => [`clase-${clase.id}`, clase]));

    return items
      .filter(item => vista !== 'ambas' || item.tipo === 'clase')
      .map(item => {
        if (item.tipo === 'asignacion') {
          return {
            ...item,
            asignacion: {
              docente: item.docente ?? item.subtitulo,
              celula: item.docenteCelula,
              celulaOrigen: item.docenteCelula,
              celulaDestino: item.sedeCelula,
              modo: item.modo ?? 'automatico',
              distanciaKm: item.distanciaKm ?? null,
            },
          };
        }

        const clase = clasesPorId.get(item.id);
        const asignacion = clase ? asignacionesPorClase.get(asignacionKey(clase)) : undefined;
        return {
          ...item,
          estado: clase?.estado,
          semestre: clase?.semestre,
          asignacion: asignacion ? {
            docente: asignacion.docente_nombre ?? 'Docente sin nombre',
            celula: asignacion.docente_celula_nombre ?? asignacion.docente_celula_id ?? null,
            celulaOrigen: asignacion.docente_celula_nombre ?? asignacion.docente_celula_id ?? null,
            celulaDestino: asignacion.sede_celula_nombre ?? asignacion.celula_nombre ?? asignacion.sede_celula_id ?? null,
            modo: asignacion.modo,
            distanciaKm: asignacion.distancia_km,
          } : undefined,
        };
      });
  }, [items, clasesFiltradas, asignacionesFiltradas, vista]);

  const itemsConIdx = useMemo(() => itemsVisuales.map((item, idx) => ({ item, idx })), [itemsVisuales]);

  const layoutPorDia = useMemo(() => {
    const map = new Map<string, Map<number, { col: number; totalCols: number }>>();
    DIAS.forEach(dia => {
      map.set(dia, resolveColumns(itemsConIdx.filter(({ item }) => item.dia_semana === dia)));
    });
    return map;
  }, [itemsConIdx]);

  const widthPorDia = useMemo(() => {
    const map = new Map<string, number>();
    DIAS.forEach(dia => {
      const layout = layoutPorDia.get(dia)!;
      const maxCols = layout.size ? Math.max(...Array.from(layout.values()).map(v => v.totalCols)) : 1;
      map.set(dia, Math.max(BASE_COL_WIDTH, maxCols * MIN_SUB_COL_WIDTH));
    });
    return map;
  }, [layoutPorDia]);

  const horas = Array.from({ length: HORA_FIN - HORA_INICIO + 1 }, (_, idx) => HORA_INICIO + idx);
  const isLoading = loadingClases || loadingAsignaciones;
  const sedeSeleccionada = (sedes as Sede[]).find(s => s.id === sedeId);
  const zonaSeleccionada = (celulas as Celula[]).find(c => c.id === zonaId);
  const programaSeleccionado = (programas as Programa[]).find(p => p.id === programaId);
  const semanaLabel = semana === 'todas' ? 'Todas' : `Semana ${semana}`;
  const vistaLabel = vista === 'ambas' ? 'Clases y asignaciones' : vista === 'clases' ? 'Clases' : 'Asignaciones';

  const buildScheduleHtml = () => {
    const PX = 42;
    const totalHeight = (HORA_FIN - HORA_INICIO) * PX;
    const horas = Array.from({ length: HORA_FIN - HORA_INICIO + 1 }, (_, i) => HORA_INICIO + i);

    const timeCol = `
      <div class="schedule-time-col">
        <div class="time-spacer"></div>
        <div class="time-body" style="height:${totalHeight}px">
          ${horas.map(h => `<div class="schedule-time-label" style="top:${(h - HORA_INICIO) * PX}px">${String(h).padStart(2, '0')}:00</div>`).join('')}
        </div>
      </div>`;

    const dayCols = DIAS.map(dia => {
      const bloquesDia = itemsConIdx.filter(({ item }) => item.dia_semana === dia);
      const layout = layoutPorDia.get(dia)!;
      const isSat = dia === 'S';

      const hourLines = horas.map(h => `<div class="schedule-hour-line" style="top:${(h - HORA_INICIO) * PX}px"></div>`).join('');

      const blocks = bloquesDia.map(({ item, idx }) => {
        const top = ((timeToMinutes(item.hora_inicio) - HORA_INICIO * 60) / 60) * PX;
        const height = Math.max(((timeToMinutes(item.hora_fin) - timeToMinutes(item.hora_inicio)) / 60) * PX, 22);
        const { col, totalCols } = layout.get(idx) ?? { col: 0, totalCols: 1 };
        const colWidthPct = 100 / totalCols;
        const leftPct = col * colWidthPct;
        const color = colorPorKey.get(item.colorKey) ?? '#528BC9';
        const bg = item.tipo === 'clase' ? color + '24' : '#e6fcf5';
        const borderColor = color;

        const docenteHtml = item.asignacion
          ? `<div class="sched-block-docente">${item.asignacion.docente}</div>`
          : item.tipo === 'clase'
            ? `<div class="sched-block-noasig">Sin asignacion</div>`
            : '';

        return `<div class="sched-block" style="top:${top + 1}px;left:calc(${leftPct}% + 2px);width:calc(${colWidthPct}% - 4px);height:${height - 2}px;background:${bg};border-left:3px solid ${borderColor};">
          <div class="sched-block-title" style="color:${borderColor};font-size:8px;">${item.titulo}</div>
          <div class="sched-block-sub" style="color:${borderColor};">${item.subtitulo}</div>
          ${docenteHtml}
        </div>`;
      }).join('');

      return `
        <div class="schedule-day-col">
          <div class="schedule-day-header${isSat ? ' sat' : ''}">${DIA_LABELS[dia]}</div>
          <div class="schedule-day-body${isSat ? ' sat' : ''}" style="height:${totalHeight}px">
            ${hourLines}
            ${blocks}
          </div>
        </div>`;
    }).join('');

    return `<div class="schedule-wrap">${timeCol}${dayCols}</div>`;
  };

  const handleExportPdf = () => {
    const ok = printReport({
      title: 'Reporte de horario',
      subtitle: `Periodo de trabajo: ${periodoSeleccionado?.nombre ?? (periodoFinal || 'Sin periodo activo')}`,
      filename: `horario-${periodoFinal || 'periodo'}`,
      meta: [
        { label: 'Zona', value: zonaSeleccionada?.nombre },
        { label: 'Sede', value: sedeSeleccionada?.nombre },
        { label: 'Programa', value: programaSeleccionado?.nombre },
        { label: 'Semestre', value: semestre ? `Semestre ${semestre}` : undefined },
        { label: 'Semana', value: semanaLabel },
        { label: 'Vista', value: vistaLabel },
        { label: 'Bloques', value: itemsVisuales.length },
      ],
      columns: [
        { label: 'Dia', value: item => DIA_LABELS[item.dia_semana] ?? item.dia_semana },
        { label: 'Horario', value: item => `${item.hora_inicio} - ${item.hora_fin}` },
        { label: 'Tipo', value: item => item.tipo === 'clase' ? 'Clase' : 'Asignacion' },
        { label: 'Materia', value: item => item.titulo },
        { label: 'Detalle', value: item => item.detalle },
        { label: 'Grupo', value: item => `G${item.grupo}` },
        { label: 'Semana', value: item => calendarioLabel(item.calendario) },
        { label: 'Sem.', value: item => item.semestre ? `S${item.semestre}` : '' },
        { label: 'Docente', value: item => item.asignacion?.docente ?? (item.tipo === 'asignacion' ? item.subtitulo : 'Sin asignacion') },
        { label: 'Zona docente', value: item => item.asignacion?.celula ?? '' },
        { label: 'Modo', value: item => item.asignacion ? modoLabel(item.asignacion.modo) : '' },
        {
          label: 'Movimiento',
          value: item => item.asignacion?.modo === 'foraneo'
            ? `${item.asignacion.celulaOrigen ?? 'Sin celula'} hacia ${item.asignacion.celulaDestino ?? 'Sin celula'}`
            : '',
        },
      ],
      rows: [...itemsVisuales].sort((a, b) =>
        DIAS.indexOf(a.dia_semana as any) - DIAS.indexOf(b.dia_semana as any) ||
        timeToMinutes(a.hora_inicio) - timeToMinutes(b.hora_inicio)
      ),
      scheduleHtml: itemsVisuales.length > 0 ? buildScheduleHtml() : undefined,
    });
    if (!ok) {
      notifications.show({ message: 'El navegador bloqueo la ventana del reporte', color: 'orange' });
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Horario por sede</Title>
          <Text size="sm" c="dimmed">Consulta clases parametrizadas y asignaciones confirmadas por sede</Text>
        </div>
        <Group gap="xs">
          <Badge color="brand" variant="light" leftSection={<CalendarDays size={13} />}>
            {itemsVisuales.length} bloque(s)
          </Badge>
          <Button leftSection={<FileText size={16} />} variant="light" color="gray" onClick={handleExportPdf}>
            PDF
          </Button>
        </Group>
      </Group>

      <Paper p="md" radius="md" withBorder>
        <Group grow align="flex-end">
          <Select
            label="Programa"
            placeholder="Todos"
            data={(programas as Programa[]).map(p => ({ value: p.id, label: p.nombre }))}
            value={programaId || null}
            onChange={v => {
              setProgramaId(v || '');
              setZonaId('');
              setSedeId('');
              setSemestre('');
            }}
            searchable
            clearable
          />
          <Select
            label="Zona"
            placeholder="Todas"
            data={zonasDisponibles.map(c => ({ value: c.id, label: c.nombre }))}
            value={zonaId || null}
            onChange={v => {
              const nextZona = v || '';
              setZonaId(nextZona);
              if (sedeId && nextZona) {
                const sedeActual = (sedes as Sede[]).find(s => s.id === sedeId);
                if (sedeActual?.celula_id !== nextZona) setSedeId('');
              }
            }}
            searchable
            clearable
          />
          <Select
            label="Sede"
            placeholder="Selecciona sede"
            data={sedesFiltradas.map(s => ({ value: s.id, label: s.nombre }))}
            value={sedeId || null}
            onChange={v => setSedeId(v || '')}
            searchable
            clearable
          />
          <Select
            label="Semestre"
            placeholder="Todos"
            data={semestreOptions}
            value={semestre || null}
            onChange={v => setSemestre(v || '')}
            clearable
          />
          <SegmentedControl
            value={semana}
            onChange={v => setSemana(v as 'todas' | 'A' | 'B')}
            data={[
              { value: 'todas', label: 'Todas' },
              { value: 'A', label: 'Semana A' },
              { value: 'B', label: 'Semana B' },
            ]}
          />
          <SegmentedControl
            value={vista}
            onChange={v => setVista(v as 'clases' | 'asignaciones' | 'ambas')}
            data={[
              { value: 'ambas', label: 'Ambas' },
              { value: 'clases', label: 'Clases' },
              { value: 'asignaciones', label: 'Asignaciones' },
            ]}
          />
        </Group>
      </Paper>

      {sedeSeleccionada && (
        <Paper p="sm" radius="md" bg="gray.0" withBorder>
          <Group justify="space-between">
            <Stack gap={0}>
              <Text size="sm" fw={700}>{sedeSeleccionada.nombre}</Text>
              <Text size="xs" c="dimmed">{sedeSeleccionada.celula_nombre ?? 'Sin celula asociada'}</Text>
            </Stack>
            <Group gap="xs">
              <Badge color="brand" variant="light">{clasesFiltradas.length} clases</Badge>
              <Badge color="success" variant="light">{asignacionesFiltradas.length} asignaciones</Badge>
            </Group>
          </Group>
        </Paper>
      )}

      {!sedeSeleccionada && zonaSeleccionada && (
        <Paper p="sm" radius="md" bg="gray.0" withBorder>
          <Group justify="space-between">
            <Stack gap={0}>
              <Text size="sm" fw={700}>{zonaSeleccionada.nombre}</Text>
              <Text size="xs" c="dimmed">Mostrando sedes de la zona seleccionada</Text>
            </Stack>
            <Group gap="xs">
              <Badge color="brand" variant="light">{clasesFiltradas.length} clases</Badge>
              <Badge color="success" variant="light">{asignacionesFiltradas.length} asignaciones</Badge>
            </Group>
          </Group>
        </Paper>
      )}

      <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
        <ScrollArea>
          <div style={{ display: 'flex', width: '100%', minWidth: 860 }}>
            <div style={{ width: 56, flexShrink: 0 }}>
              <div style={{ height: 38 }} />
              <div style={{ position: 'relative', height: (HORA_FIN - HORA_INICIO) * PX_POR_HORA }}>
                {horas.map(hora => (
                  <div
                    key={hora}
                    style={{
                      position: 'absolute',
                      top: (hora - HORA_INICIO) * PX_POR_HORA - 8,
                      right: 8,
                      fontSize: 11,
                      color: '#868e96',
                    }}
                  >
                    {String(hora).padStart(2, '0')}:00
                  </div>
                ))}
              </div>
            </div>

            {DIAS.map(dia => {
              const bloquesDia = itemsConIdx.filter(({ item }) => item.dia_semana === dia);
              const layout = layoutPorDia.get(dia)!;
              const diaWidth = widthPorDia.get(dia)!;

              return (
                <div key={dia} style={{ minWidth: diaWidth, flex: `${diaWidth} 1 0` }}>
                  <div
                    style={{
                      height: 38,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      fontWeight: 700,
                      fontSize: 13,
                      borderBottom: '2px solid #e9ecef',
                      background: dia === 'S' ? '#f0f7e8' : '#f8f9fa',
                      color: dia === 'S' ? '#5f8f33' : '#495057',
                    }}
                  >
                    {DIA_LABELS[dia]}
                    {bloquesDia.length > 0 && <Badge size="xs" color={dia === 'S' ? 'success' : 'gray'} variant="light">{bloquesDia.length}</Badge>}
                  </div>
                  <div
                    style={{
                      position: 'relative',
                      height: (HORA_FIN - HORA_INICIO) * PX_POR_HORA,
                      borderRight: '1px solid #e9ecef',
                      background: dia === 'S' ? '#fbfef8' : 'white',
                    }}
                  >
                    {horas.map(hora => (
                      <div
                        key={hora}
                        style={{
                          position: 'absolute',
                          top: (hora - HORA_INICIO) * PX_POR_HORA,
                          left: 0,
                          right: 0,
                          borderTop: hora === HORA_INICIO ? 'none' : '1px solid #f1f3f5',
                        }}
                      />
                    ))}

                    {bloquesDia.map(({ item, idx }) => {
                      const top = minutesToPx(timeToMinutes(item.hora_inicio));
                      const height = Math.max(durationPx(item.hora_inicio, item.hora_fin), 34);
                      const { col, totalCols } = layout.get(idx) ?? { col: 0, totalCols: 1 };
                      const colWidth = 100 / totalCols;
                      const left = col * colWidth;
                      const color = colorPorKey.get(item.colorKey) ?? '#528BC9';

                      return (
                        <Tooltip
                          key={item.id}
                          multiline
                          w={240}
                          label={
                            <Stack gap={2}>
                              <Text size="xs" fw={700}>{item.titulo}</Text>
                              <Text size="xs">{item.subtitulo}</Text>
                              <Text size="xs" c="dimmed">{item.detalle}</Text>
                              {item.semestre && <Text size="xs" c="dimmed">Semestre: {item.semestre}</Text>}
                              {item.estado && <Text size="xs" c="dimmed">Estado: {item.estado}</Text>}
                              <Text size="xs">{item.hora_inicio} - {item.hora_fin}</Text>
                              <Text size="xs" c="dimmed">{calendarioLabel(item.calendario)}</Text>
                              {item.asignacion ? (
                                <>
                                  <Text size="xs" fw={700} mt={4}>Asignacion</Text>
                                  <Text size="xs">Docente: {item.asignacion.docente}</Text>
                                  <Text size="xs" c="dimmed">Celula: {item.asignacion.celula ?? 'Sin celula'}</Text>
                                  <Text size="xs" c="dimmed">Modo: {modoLabel(item.asignacion.modo)}</Text>
                                  {item.asignacion.modo === 'foraneo' && (
                                    <Text size="xs" c="orange">
                                      Movimiento: {item.asignacion.celulaOrigen ?? 'Sin celula'} hacia {item.asignacion.celulaDestino ?? 'Sin celula'}
                                    </Text>
                                  )}
                                  {item.asignacion.distanciaKm != null && (
                                    <Text size="xs" c="dimmed">Distancia: {Number(item.asignacion.distanciaKm).toFixed(1)} km</Text>
                                  )}
                                </>
                              ) : (
                                <Text size="xs" c="orange" mt={4}>Sin asignacion</Text>
                              )}
                            </Stack>
                          }
                        >
                          <div
                            style={{
                              position: 'absolute',
                              top: top + 1,
                              left: `calc(${left}% + 3px)`,
                              width: `calc(${colWidth}% - 6px)`,
                              height: height - 2,
                              background: item.tipo === 'clase' ? color + '24' : '#e6fcf5',
                              borderLeft: `4px solid ${color}`,
                              borderRadius: 4,
                              padding: '3px 5px',
                              boxSizing: 'border-box',
                              overflow: 'hidden',
                            }}
                          >
                            <Group gap={4} wrap="nowrap">
                              <Badge size="xs" color={item.tipo === 'clase' ? 'brand' : 'success'} variant="filled">
                                {item.tipo === 'clase' ? 'Clase' : 'Asig.'}
                              </Badge>
                              <Text size="xs" fw={700} style={{ color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.titulo}
                              </Text>
                            </Group>
                            {height > 48 && (
                              <Text size="xs" style={{ color, fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.subtitulo}
                              </Text>
                            )}
                            {item.asignacion ? (
                              <div
                                style={{
                                  marginTop: 4,
                                  padding: '3px 5px',
                                  borderRadius: 4,
                                  background: '#d3f9d8',
                                  border: '1px solid #8ce99a',
                                }}
                              >
                                <Text size="xs" fw={700} style={{ color: '#2b8a3e', fontSize: 10, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {item.asignacion.docente}
                                </Text>
                                {height > 82 && (
                                  <Text size="xs" style={{ color: '#2b8a3e', fontSize: 9, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.asignacion.celula ?? 'Sin celula'}
                                  </Text>
                                )}
                              </div>
                            ) : item.tipo === 'clase' ? (
                              <div
                                style={{
                                  marginTop: 4,
                                  padding: '3px 5px',
                                  borderRadius: 4,
                                  background: '#fff3bf',
                                  border: '1px solid #ffd43b',
                                }}
                              >
                                <Text size="xs" fw={700} style={{ color: '#8d6b00', fontSize: 10, lineHeight: 1.15 }}>
                                  Sin asignacion
                                </Text>
                              </div>
                            ) : (
                              height > 66 && (
                                <Text size="xs" style={{ color, fontSize: 10, opacity: 0.75 }}>
                                  {item.hora_inicio} - {item.hora_fin}
                                </Text>
                              )
                            )}
                          </div>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Paper>

      {!sedeId && !zonaId && (
        <Paper p="lg" radius="md" withBorder ta="center">
          <Text c="dimmed" size="sm">Selecciona una zona o una sede para ver su horario.</Text>
        </Paper>
      )}
      {(sedeId || zonaId) && !isLoading && itemsVisuales.length === 0 && (
        <Paper p="lg" radius="md" withBorder ta="center">
          <Text c="dimmed" size="sm">No hay bloques para los filtros seleccionados.</Text>
        </Paper>
      )}
    </Stack>
  );
}
