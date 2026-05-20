import { Grid, Paper, Text, Group, RingProgress, Badge, Stack, Title, Skeleton, ThemeIcon, Progress, Divider } from '@mantine/core';
import { Users, Building2, MapPin, CalendarDays, AlertTriangle, CheckCircle, Gauge, Clock3 } from 'lucide-react';
import { useDocentes, useSedes, useCelulas, useAsignaciones, useClases } from '../api/hooks';
import { usePeriodoTrabajo } from '../context/PeriodoContext';
import type { ClaseAcademica, Docente } from '../types';

function StatCard({ label, value, icon: Icon, color, loading }: any) {
  return (
    <Paper p="lg" radius="md" withBorder>
      <Group justify="space-between">
        <div>
          <Text size="xs" c="dimmed" fw={600}>{label}</Text>
          {loading ? <Skeleton h={32} w={60} mt={4} /> : <Text size="2rem" fw={700}>{value}</Text>}
        </div>
        <ThemeIcon size="xl" radius="md" color={color} variant="light">
          <Icon size={22} />
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function horasBloque(inicio: string, fin: string) {
  return Math.max(0, (toMinutes(fin) - toMinutes(inicio)) / 60);
}

function formatHoras(value: number) {
  return Number.isInteger(value) ? `${value}h` : `${value.toFixed(1)}h`;
}

export function Dashboard() {
  const { data: docentes = [], isLoading: dLoading } = useDocentes();
  const { data: sedes = [], isLoading: sLoading } = useSedes();
  const { data: celulas = [], isLoading: cLoading } = useCelulas();
  const { periodoId, periodoSeleccionado } = usePeriodoTrabajo();
  const { data: asignaciones = [], isLoading: aLoading } = useAsignaciones(periodoId ? { periodo: periodoId } : undefined);
  const clasesParams = periodoId ? { periodo: periodoId } : undefined;
  const { data: clases = [], isLoading: clasesLoading } = useClases(clasesParams);

  const docentesConModoLibre = docentes.filter((d: Docente) => d.modo_libre === 1);
  const docentesCompletos = docentes.filter((d: Docente) => d.horas_asignadas >= d.max_horas);
  const docentesPorCompletar = docentes.filter(
    (d: Docente) => d.horas_asignadas > 0 && d.horas_asignadas < d.max_horas
  );
  const docentesSinAsignar = docentes.filter((d: Docente) => d.horas_asignadas === 0);

  const totalHorasAsignadas = docentes.reduce((acc: number, d: Docente) => acc + d.horas_asignadas, 0);
  const totalHorasMax = docentes.reduce((acc: number, d: Docente) => acc + d.max_horas, 0);
  const porcentajeOcupacion = totalHorasMax > 0 ? Math.round((totalHorasAsignadas / totalHorasMax) * 100) : 0;
  const clasesActivas = clases.filter((clase: ClaseAcademica) => clase.estado !== 'cancelada');
  const asignacionesKeys = new Set((asignaciones as any[]).map(a =>
    `${a.periodo}|${a.sede_id}|${a.materia_id}|${a.grupo ?? 1}|${a.calendario}`
  ));
  const clasesAsignadas = clasesActivas.filter((clase: ClaseAcademica) =>
    asignacionesKeys.has(`${clase.periodo}|${clase.sede_id}|${clase.materia_id}|${clase.grupo ?? 1}|${clase.calendario}`)
  );
  const totalHorasDemanda = clasesActivas.reduce(
    (acc: number, clase: ClaseAcademica) => acc + horasBloque(clase.hora_inicio, clase.hora_fin),
    0
  );
  const horasSinCubrir = Math.max(0, totalHorasDemanda - totalHorasAsignadas);
  const capacidadDisponible = Math.max(0, totalHorasMax - totalHorasAsignadas);
  const balanceCapacidad = totalHorasMax - totalHorasDemanda;
  const coberturaDemanda = totalHorasDemanda > 0 ? Math.min(100, Math.round((totalHorasAsignadas / totalHorasDemanda) * 100)) : 0;
  const presionCapacidad = totalHorasMax > 0 ? Math.round((totalHorasDemanda / totalHorasMax) * 100) : 0;
  const coberturaClases = clasesActivas.length > 0 ? Math.round((clasesAsignadas.length / clasesActivas.length) * 100) : 0;
  const docentesEquivalentes = totalHorasDemanda > 0 ? Math.ceil(totalHorasDemanda / 19) : 0;
  const loadingCapacidad = dLoading || clasesLoading;

  const asignacionesLibre = asignaciones.filter((a: any) => a.modo === 'libre');
  const asignacionesForaneas = asignaciones.filter((a: any) => a.modo === 'foraneo');
  const procesoAsignacionIniciado = asignaciones.length > 0;
  const alertarDocentesSinAsignar = procesoAsignacionIniciado && docentesSinAsignar.length > 0;

  return (
    <Stack gap="lg">
      <Title order={2}>Dashboard general</Title>

      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatCard label="Docentes" value={docentes.length} icon={Users} color="blue" loading={dLoading} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatCard label="Sedes" value={sedes.length} icon={Building2} color="green" loading={sLoading} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatCard label="Células" value={celulas.length} icon={MapPin} color="orange" loading={cLoading} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatCard label="Asignaciones" value={asignaciones.length} icon={CalendarDays} color="violet" loading={aLoading} />
        </Grid.Col>
      </Grid>

      <Paper p="lg" radius="md" withBorder>
        <Group justify="space-between" align="flex-start" mb="md">
          <div>
            <Group gap="xs">
              <ThemeIcon color="teal" variant="light" radius="md">
                <Gauge size={18} />
              </ThemeIcon>
              <Text fw={700}>Capacidad docente vs demanda de clases</Text>
            </Group>
            <Text size="sm" c="dimmed" mt={4}>
              {periodoSeleccionado?.nombre ? `Periodo de trabajo: ${periodoSeleccionado.nombre}` : 'Lectura general del periodo de trabajo'}
            </Text>
          </div>
          <Badge
            color={balanceCapacidad >= 0 ? 'green' : 'red'}
            variant="light"
            size="lg"
          >
            {balanceCapacidad >= 0 ? `Superavit ${formatHoras(balanceCapacidad)}` : `Deficit ${formatHoras(Math.abs(balanceCapacidad))}`}
          </Badge>
        </Group>

        {loadingCapacidad ? (
          <Stack gap="sm">
            <Skeleton h={22} />
            <Skeleton h={70} />
          </Stack>
        ) : (
          <Stack gap="md">
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Text size="xs" c="dimmed" fw={600}>Capacidad total</Text>
                <Text size="1.7rem" fw={800}>{formatHoras(totalHorasMax)}</Text>
                <Text size="xs" c="dimmed">{docentes.length} docentes registrados</Text>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Text size="xs" c="dimmed" fw={600}>Demanda de clases</Text>
                <Text size="1.7rem" fw={800}>{formatHoras(totalHorasDemanda)}</Text>
                <Text size="xs" c="dimmed">{clasesActivas.length} clases activas</Text>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Text size="xs" c="dimmed" fw={600}>Horas por cubrir</Text>
                <Text size="1.7rem" fw={800} c={horasSinCubrir > 0 ? 'orange.7' : 'green.7'}>
                  {formatHoras(horasSinCubrir)}
                </Text>
                <Text size="xs" c="dimmed">{formatHoras(capacidadDisponible)} disponibles</Text>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Text size="xs" c="dimmed" fw={600}>Docentes equivalentes</Text>
                <Text size="1.7rem" fw={800}>{docentesEquivalentes}</Text>
                <Text size="xs" c="dimmed">a 19h maximas</Text>
              </Grid.Col>
            </Grid>

            <Divider />

            <Grid align="center">
              <Grid.Col span={{ base: 12, md: 7 }}>
                <Group justify="space-between" mb={6}>
                  <Text size="sm" fw={600}>Presion sobre la capacidad</Text>
                  <Text size="sm" c="dimmed">{presionCapacidad}%</Text>
                </Group>
                <Progress
                  value={Math.min(100, presionCapacidad)}
                  color={presionCapacidad > 100 ? 'red' : presionCapacidad >= 85 ? 'orange' : 'teal'}
                  size="lg"
                  radius="xl"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 5 }}>
                <Group gap="xs" justify="flex-end">
                  <ThemeIcon color="blue" variant="light" radius="xl" size="sm">
                    <Clock3 size={14} />
                  </ThemeIcon>
                  <Text size="sm" c="dimmed">
                    {coberturaDemanda}% de la demanda ya esta reflejada en horas asignadas
                  </Text>
                </Group>
                <Text size="sm" c="dimmed" ta={{ base: 'left', md: 'right' }} mt={4}>
                  {clasesAsignadas.length}/{clasesActivas.length} clases marcadas como asignadas ({coberturaClases}%)
                </Text>
              </Grid.Col>
            </Grid>
          </Stack>
        )}
      </Paper>

      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper p="lg" radius="md" withBorder h="100%">
            <Text fw={600} mb="md">Ocupación docente global</Text>
            <Group justify="center">
              <RingProgress
                size={160}
                thickness={16}
                roundCaps
                sections={[{ value: porcentajeOcupacion, color: porcentajeOcupacion >= 80 ? 'green' : porcentajeOcupacion >= 50 ? 'yellow' : 'red' }]}
                label={
                  <Text ta="center" fw={700} size="xl">{porcentajeOcupacion}%</Text>
                }
              />
            </Group>
            <Text ta="center" c="dimmed" size="sm" mt="xs">
              {totalHorasAsignadas}h asignadas de {totalHorasMax}h totales
            </Text>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper p="lg" radius="md" withBorder h="100%">
            <Text fw={600} mb="md">Estado de docentes</Text>
            <Stack gap="sm">
              <Group justify="space-between">
                <Group gap="xs">
                  <CheckCircle size={16} color="green" />
                  <Text size="sm">Carga completa (19h)</Text>
                </Group>
                <Badge color="green">{docentesCompletos.length}</Badge>
              </Group>
              <Group justify="space-between">
                <Group gap="xs">
                  <CalendarDays size={16} color="blue" />
                  <Text size="sm">En proceso</Text>
                </Group>
                <Badge color="blue">{docentesPorCompletar.length}</Badge>
              </Group>
              <Group justify="space-between">
                <Group gap="xs">
                  <AlertTriangle size={16} color="orange" />
                  <Text size="sm">Sin asignaciones</Text>
                </Group>
                <Badge color="orange">{docentesSinAsignar.length}</Badge>
              </Group>
              <Group justify="space-between">
                <Group gap="xs">
                  <AlertTriangle size={16} color="red" />
                  <Text size="sm">Modo libre activo</Text>
                </Group>
                <Badge color="red">{docentesConModoLibre.length}</Badge>
              </Group>
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper p="lg" radius="md" withBorder h="100%">
            <Text fw={600} mb="md">Alertas del sistema</Text>
            <Stack gap="sm">
              {docentesConModoLibre.length > 0 && (
                <Paper p="sm" radius="sm" bg="red.0" withBorder style={{ borderColor: '#ff6b6b' }}>
                  <Group gap="xs">
                    <AlertTriangle size={16} color="red" />
                    <Text size="sm" c="red.7" fw={500}>
                      {docentesConModoLibre.length} docente(s) en modo libre
                    </Text>
                  </Group>
                </Paper>
              )}
              {asignacionesLibre.length > 0 && (
                <Paper p="sm" radius="sm" bg="orange.0" withBorder style={{ borderColor: '#ffa94d' }}>
                  <Group gap="xs">
                    <AlertTriangle size={16} color="orange" />
                    <Text size="sm" c="orange.7" fw={500}>
                      {asignacionesLibre.length} asignación(es) en modo libre
                    </Text>
                  </Group>
                </Paper>
              )}
              {asignacionesForaneas.length > 0 && (
                <Paper p="sm" radius="sm" bg="yellow.0" withBorder style={{ borderColor: '#ffd43b' }}>
                  <Group gap="xs">
                    <AlertTriangle size={16} color="#e6b800" />
                    <Text size="sm" c="yellow.8" fw={500}>
                      {asignacionesForaneas.length} asignación(es) foránea(s)
                    </Text>
                  </Group>
                </Paper>
              )}
              {!procesoAsignacionIniciado && (
                <Group gap="xs">
                  <CheckCircle size={16} color="green" />
                  <Text size="sm" c="green.7">Periodo listo para generar asignaciones</Text>
                </Group>
              )}
              {alertarDocentesSinAsignar && (
                <Paper p="sm" radius="sm" bg="yellow.0" withBorder style={{ borderColor: '#ffd43b' }}>
                  <Group gap="xs">
                    <AlertTriangle size={16} color="#e6b800" />
                    <Text size="sm" c="yellow.8" fw={500}>
                      {docentesSinAsignar.length} docente(s) sin asignaciones
                    </Text>
                  </Group>
                </Paper>
              )}
              {procesoAsignacionIniciado && docentesConModoLibre.length === 0 && asignacionesLibre.length === 0 && asignacionesForaneas.length === 0 && !alertarDocentesSinAsignar && (
                <Group gap="xs">
                  <CheckCircle size={16} color="green" />
                  <Text size="sm" c="green.7">Sin alertas activas</Text>
                </Group>
              )}
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
