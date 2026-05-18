import { useMemo } from 'react';
import { Stack, Group, Text, Badge, Paper, Box, Tooltip, ScrollArea } from '@mantine/core';
import { Star } from 'lucide-react';
import type { DraftItem } from '../types';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S'];
const DIA_LABELS: Record<string, string> = {
  L: 'Lunes', M: 'Martes', X: 'Miércoles', J: 'Jueves', V: 'Viernes', S: 'Sábado',
};

const HORA_INICIO = 6;
const HORA_FIN = 22;
const TOTAL_HORAS = HORA_FIN - HORA_INICIO;
const PX_POR_HORA = 60;
const BASE_COL_WIDTH = 140;  // fixed width per day, never shrinks
const MIN_SUB_COL_WIDTH = 70; // minimum width per sub-column when overlapping

const COLORES_PROGRAMA = [
  '#228be6', '#40c057', '#fab005', '#fd7e14', '#ae3ec9', '#e64980', '#0ca678', '#1971c2',
];

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToPx(minutes: number) {
  return ((minutes - HORA_INICIO * 60) / 60) * PX_POR_HORA;
}

function durationPx(inicio: string, fin: string) {
  return ((timeToMinutes(fin) - timeToMinutes(inicio)) / 60) * PX_POR_HORA;
}

function overlaps(a: DraftItem, b: DraftItem) {
  return timeToMinutes(a.hora_inicio) < timeToMinutes(b.hora_fin) &&
    timeToMinutes(a.hora_fin) > timeToMinutes(b.hora_inicio);
}

function bloquesCompiten(a: DraftItem, b: DraftItem) {
  return overlaps(a, b);
}

function calendarioLabel(calendario: DraftItem['calendario']) {
  return calendario === 'A' ? 'Semana A' : calendario === 'B' ? 'Semana B' : 'Semanal / A + B';
}

/**
 * Assigns each block a sub-column index so overlapping blocks render side-by-side.
 * Returns: Map<idx, { col: number; totalCols: number }>
 */
function resolveColumns(bloques: Array<{ item: DraftItem; idx: number }>) {
  const result = new Map<number, { col: number; totalCols: number }>();
  // Group blocks into overlap clusters
  const assigned: boolean[] = new Array(bloques.length).fill(false);

  for (let i = 0; i < bloques.length; i++) {
    if (assigned[i]) continue;

    // Find all blocks that overlap (directly or transitively) with i
    const cluster: number[] = [i];
    assigned[i] = true;
    for (let j = i + 1; j < bloques.length; j++) {
      if (assigned[j]) continue;
      const overlapsAny = cluster.some(ci => bloquesCompiten(bloques[ci].item, bloques[j].item));
      if (overlapsAny) {
        cluster.push(j);
        assigned[j] = true;
      }
    }

    // Greedy column assignment within the cluster
    const colOf: number[] = new Array(cluster.length).fill(-1);
    for (let ci = 0; ci < cluster.length; ci++) {
      const usedCols = new Set<number>();
      for (let cj = 0; cj < ci; cj++) {
        if (bloquesCompiten(bloques[cluster[ci]].item, bloques[cluster[cj]].item)) {
          usedCols.add(colOf[cj]);
        }
      }
      let col = 0;
      while (usedCols.has(col)) col++;
      colOf[ci] = col;
    }

    const totalCols = Math.max(...colOf) + 1;
    cluster.forEach((bi, ci) => {
      result.set(bloques[bi].idx, { col: colOf[ci], totalCols });
    });
  }

  return result;
}

interface Props {
  draft: DraftItem[];
  seleccionados: Set<number>;
  filtros?: {
    docenteId: string | null;
    sedeId: string | null;
    materiaId: string | null;
    semana: 'todas' | 'A' | 'B' | 'semanal';
    estado: 'todos' | 'locales' | 'foraneos' | 'advertencias';
  };
}

export function HorarioBorrador({ draft, seleccionados, filtros }: Props) {
  const programas = useMemo(() => {
    const uniq = new Map<string | null, string | null>();
    draft.forEach(d => uniq.set(d.programa_id, d.programa_nombre));
    return Array.from(uniq.entries());
  }, [draft]);

  const colorPorPrograma = useMemo(() => {
    const map = new Map<string | null, string>();
    programas.forEach(([id], i) => {
      map.set(id, COLORES_PROGRAMA[i % COLORES_PROGRAMA.length]);
    });
    return map;
  }, [programas]);

  const itemsFiltrados = useMemo(() => {
    return draft
      .map((item, idx) => ({ item, idx }))
      .filter(({ idx, item }) =>
        seleccionados.has(idx) &&
        (!filtros?.docenteId || item.docente_id === filtros.docenteId) &&
        (!filtros?.sedeId || item.sede_id === filtros.sedeId) &&
        (!filtros?.materiaId || item.materia_id === filtros.materiaId) &&
        (!filtros || filtros.semana === 'todas' || item.calendario === filtros.semana) &&
        (!filtros || filtros.estado === 'todos' ||
          (filtros.estado === 'locales' && !item.es_foraneo) ||
          (filtros.estado === 'foraneos' && item.es_foraneo) ||
          (filtros.estado === 'advertencias' && item.advertencias.length > 0))
      );
  }, [draft, seleccionados, filtros]);

  // Pre-compute column layout per day (only for filtered items — used for positioning)
  const columnLayoutPorDia = useMemo(() => {
    const map = new Map<string, Map<number, { col: number; totalCols: number }>>();
    DIAS.forEach(dia => {
      const bloquesDia = itemsFiltrados.filter(({ item }) => item.dia_semana === dia);
      map.set(dia, resolveColumns(bloquesDia));
    });
    return map;
  }, [itemsFiltrados]);

  // Compute widths from the visible blocks so global filters reshape the schedule view.
  const widthPorDia = useMemo(() => {
    const map = new Map<string, number>();
    DIAS.forEach(dia => {
      const bloquesDia = itemsFiltrados.filter(({ item }) => item.dia_semana === dia);
      const layout = resolveColumns(bloquesDia);
      const maxCols = layout.size === 0 ? 1 : Math.max(...Array.from(layout.values()).map(v => v.totalCols));
      const needed = maxCols * MIN_SUB_COL_WIDTH;
      map.set(dia, Math.max(BASE_COL_WIDTH, needed));
    });
    return map;
  }, [itemsFiltrados]);

  const horas = Array.from({ length: TOTAL_HORAS + 1 }, (_, i) => HORA_INICIO + i);

  const modoTodos = !filtros?.docenteId;

  return (
    <Stack gap="md" p="md">
      <Group justify="space-between">
        <Group gap="xs">
          <Text fw={600} size="sm">Vista de horario semanal</Text>
          <Badge variant="light" color="violet" size="sm">{itemsFiltrados.length} bloques</Badge>
          {modoTodos && (
            <Badge variant="light" color="gray" size="sm">
              Todos los docentes — bloques solapados se muestran en paralelo
            </Badge>
          )}
        </Group>
      </Group>

      {/* Leyenda de programas */}
      <Group gap="sm" wrap="wrap">
        {programas.map(([id, nombre]) => (
          <Group key={id ?? 'sin-prog'} gap={4}>
            <Box
              style={{
                width: 12, height: 12, borderRadius: 3,
                background: colorPorPrograma.get(id) ?? '#aaa',
              }}
            />
            <Text size="xs">{nombre ?? 'Sin programa'}</Text>
          </Group>
        ))}
      </Group>

      {/* Grid de horario */}
      <ScrollArea>
        <div style={{ display: 'flex', minWidth: 700 }}>
          {/* Columna de horas */}
          <div style={{ width: 52, flexShrink: 0 }}>
            <div style={{ height: 36 }} />
            <div style={{ position: 'relative', height: TOTAL_HORAS * PX_POR_HORA }}>
              {horas.map(h => (
                <div
                  key={h}
                  style={{
                    position: 'absolute',
                    top: (h - HORA_INICIO) * PX_POR_HORA - 9,
                    right: 8,
                    fontSize: 11,
                    color: '#868e96',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {/* Columnas por día */}
          {DIAS.map(dia => {
            const bloquesDia = itemsFiltrados.filter(({ item }) => item.dia_semana === dia);
            const layout = columnLayoutPorDia.get(dia)!;
            const diaWidth = widthPorDia.get(dia)!;

            return (
              <div key={dia} style={{ minWidth: diaWidth, flex: `${diaWidth} 1 0` }}>
                {/* Header día */}
                <div
                  style={{
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: 13,
                    borderBottom: '2px solid #e9ecef',
                    background: dia === 'S' ? '#f8f0ff' : '#f8f9fa',
                    color: dia === 'S' ? '#7950f2' : undefined,
                  }}
                >
                  {DIA_LABELS[dia]}
                  {bloquesDia.length > 0 && (
                    <Badge size="xs" variant="light" color={dia === 'S' ? 'violet' : 'gray'} ml={4}>
                      {bloquesDia.length}
                    </Badge>
                  )}
                </div>

                {/* Área de bloques */}
                <div
                  style={{
                    position: 'relative',
                    height: TOTAL_HORAS * PX_POR_HORA,
                    borderRight: '1px solid #e9ecef',
                    background: dia === 'S' ? '#fdfaff' : 'white',
                  }}
                >
                  {/* Líneas guía por hora */}
                  {horas.map(h => (
                    <div
                      key={h}
                      style={{
                        position: 'absolute',
                        top: (h - HORA_INICIO) * PX_POR_HORA,
                        left: 0, right: 0,
                        borderTop: h === HORA_INICIO ? 'none' : '1px solid #f1f3f5',
                      }}
                    />
                  ))}

                  {/* Bloques de asignación con layout anti-solapamiento */}
                  {bloquesDia.map(({ item, idx }) => {
                    const top = minutesToPx(timeToMinutes(item.hora_inicio));
                    const height = Math.max(durationPx(item.hora_inicio, item.hora_fin), 28);
                    const color = colorPorPrograma.get(item.programa_id) ?? '#adb5bd';
                    const esPrioritario = item.es_prioritario;

                    const { col, totalCols } = layout.get(idx) ?? { col: 0, totalCols: 1 };
                    const colWidthPct = 100 / totalCols;
                    const leftPct = col * colWidthPct;

                    return (
                      <Tooltip
                        key={idx}
                        multiline
                        w={230}
                        label={
                          <Stack gap={2}>
                            <Text size="xs" fw={700}>{item.docente_nombre}</Text>
                            <Text size="xs">{item.materia_nombre}</Text>
                            <Text size="xs" c="dimmed">{item.sede_nombre}</Text>
                            <Text size="xs">{item.hora_inicio} – {item.hora_fin}</Text>
                            <Text size="xs" c="dimmed">{calendarioLabel(item.calendario)}</Text>
                            {item.programa_nombre && (
                              <Text size="xs" c="dimmed">Programa: {item.programa_nombre}</Text>
                            )}
                            {item.distancia_km > 0 && (
                              <Text size="xs" c="dimmed">{item.distancia_km.toFixed(1)} km</Text>
                            )}
                            {item.advertencias.length > 0 && (
                              <Text size="xs" c="orange">{item.advertencias.join(', ')}</Text>
                            )}
                          </Stack>
                        }
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: top + 1,
                            left: `calc(${leftPct}% + 2px)`,
                            width: `calc(${colWidthPct}% - 4px)`,
                            height: height - 2,
                            background: color + (totalCols > 1 ? '33' : '22'),
                            borderLeft: `3px solid ${color}`,
                            borderRadius: '0 4px 4px 0',
                            padding: '2px 4px',
                            overflow: 'hidden',
                            cursor: 'default',
                            boxSizing: 'border-box',
                            outline: item.advertencias.length > 0 ? `1px dashed ${color}` : undefined,
                          }}
                        >
                          <Group gap={2} wrap="nowrap" style={{ overflow: 'hidden' }}>
                            {esPrioritario && (
                              <Star size={9} fill={color} color={color} style={{ flexShrink: 0 }} />
                            )}
                            <Text
                              size="xs"
                              fw={600}
                              style={{
                                color,
                                lineHeight: 1.2,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                fontSize: 10,
                              }}
                            >
                              {item.docente_nombre.split(' ')[0]}
                            </Text>
                          </Group>
                          {height > 42 && (
                            <Text
                              size="xs"
                              style={{
                                color,
                                fontSize: 9,
                                lineHeight: 1.2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                opacity: 0.85,
                              }}
                            >
                              {item.materia_nombre}
                            </Text>
                          )}
                          {height > 58 && (
                            <Text size="xs" style={{ color, fontSize: 9, opacity: 0.7, lineHeight: 1.2 }}>
                              {item.hora_inicio}–{item.hora_fin}
                            </Text>
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

      {itemsFiltrados.length === 0 && (
        <Paper p="lg" radius="md" withBorder ta="center">
          <Text c="dimmed" size="sm">
            {filtros?.docenteId
              ? 'Este docente no tiene bloques seleccionados en el borrador.'
              : 'No hay bloques seleccionados. Activa algunos en la pestaña de lista.'}
          </Text>
        </Paper>
      )}
    </Stack>
  );
}
