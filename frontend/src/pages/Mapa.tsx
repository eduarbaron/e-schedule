import { useState } from 'react';
import { Stack, Title, Paper, Text, Group, Badge, Select, Box } from '@mantine/core';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useSedes, useCelulas, useAsignaciones } from '../api/hooks';
import type { Sede } from '../types';
import { TIPO_SEDE_COLORS, TIPO_SEDE_LABELS } from '../types';
import { usePeriodoTrabajo } from '../context/PeriodoContext';

const makeIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${color};border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

export function Mapa() {
  const { data: sedes = [] } = useSedes();
  const { data: celulas = [] } = useCelulas();
  const { periodoId } = usePeriodoTrabajo();
  const [filtroCelula, setFiltroCelula] = useState<string | null>(null);
  const { data: asignaciones = [] } = useAsignaciones(periodoId ? { periodo: periodoId } : undefined);

  const sedesFiltradas: Sede[] = filtroCelula
    ? sedes.filter((s: Sede) => s.celula_id === filtroCelula || s.tipo === 'central')
    : sedes;

  const asignacionesPorSede = (sedeId: string) =>
    asignaciones.filter((a: any) => a.sede_id === sedeId);

  const centroMapa: [number, number] = [5.53, -73.37];

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Mapa de sedes</Title>
        <Group>
          <Select
            size="sm"
            placeholder="Filtrar por célula"
            data={[
              { value: '', label: 'Todas las células' },
              ...celulas.map((c: any) => ({ value: c.id, label: c.nombre })),
            ]}
            value={filtroCelula ?? ''}
            onChange={v => setFiltroCelula(v || null)}
            w={200}
            clearable
          />
        </Group>
      </Group>

      {/* Leyenda */}
      <Group gap="md">
        {Object.entries(TIPO_SEDE_LABELS).map(([tipo, label]) => (
          <Group key={tipo} gap="xs">
            <Box
              style={{
                width: 12, height: 12, borderRadius: '50%',
                background: TIPO_SEDE_COLORS[tipo], border: '2px solid white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            />
            <Text size="xs">{label}</Text>
          </Group>
        ))}
      </Group>

      <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
        <MapContainer
          center={centroMapa}
          zoom={9}
          style={{ height: 520, width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {sedesFiltradas.map((sede: Sede) => {
            const color = TIPO_SEDE_COLORS[sede.tipo] || '#888';
            const asigs = asignacionesPorSede(sede.id);
            return (
              <Marker
                key={sede.id}
                position={[sede.latitud, sede.longitud]}
                icon={makeIcon(color)}
              >
                <Popup>
                  <Stack gap="xs" style={{ minWidth: 180 }}>
                    <Text fw={600} size="sm">{sede.nombre}</Text>
                    <Badge
                      size="xs"
                      style={{ background: color + '22', color }}
                    >
                      {TIPO_SEDE_LABELS[sede.tipo]}
                    </Badge>
                    {(sede as any).celula_nombre && (
                      <Text size="xs" c="dimmed">Célula: {(sede as any).celula_nombre}</Text>
                    )}
                    {sede.direccion && (
                      <Text size="xs" c="dimmed">{sede.direccion}</Text>
                    )}
                    <Text size="xs" c="dimmed">
                      {sede.latitud.toFixed(4)}, {sede.longitud.toFixed(4)}
                    </Text>
                    {asigs.length > 0 && (
                      <>
                        <Text size="xs" fw={600}>Asignaciones ({periodoId}):</Text>
                        {asigs.slice(0, 3).map((a: any) => (
                          <Text key={a.id} size="xs">
                            • {a.docente_nombre} — {a.dia_semana} {a.hora_inicio}
                          </Text>
                        ))}
                        {asigs.length > 3 && (
                          <Text size="xs" c="dimmed">+{asigs.length - 3} más...</Text>
                        )}
                      </>
                    )}
                  </Stack>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </Paper>

      {/* Tabla resumen */}
      <Paper withBorder radius="md" p="md">
        <Text fw={600} mb="sm">Resumen por célula</Text>
        <Group gap="md" wrap="wrap">
          {celulas.map((c: any) => {
            const sedesCelula = sedes.filter((s: Sede) => s.celula_id === c.id);
            const asigsCelula = asignaciones.filter((a: any) =>
              sedesCelula.some((s: Sede) => s.id === a.sede_id)
            );
            return (
              <Paper key={c.id} p="sm" radius="md" withBorder style={{ minWidth: 180 }}>
                <Text fw={600} size="sm">{c.nombre}</Text>
                <Text size="xs" c="dimmed">{c.municipio}</Text>
                <Group gap="xs" mt="xs">
                  <Badge size="xs" color="blue">{sedesCelula.length} sedes</Badge>
                  <Badge size="xs" color="violet">{asigsCelula.length} asigs</Badge>
                </Group>
              </Paper>
            );
          })}
        </Group>
      </Paper>
    </Stack>
  );
}
