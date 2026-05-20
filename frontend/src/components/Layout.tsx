import { AppShell, Burger, Group, NavLink, Text, ScrollArea, Box, Divider, Select } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  LayoutDashboard, MapPin, Users, CalendarDays, Map, GraduationCap, Calendar, Library, ClipboardList, CalendarRange, PanelsTopLeft, BookOpen
} from 'lucide-react';
import { usePeriodoTrabajo } from '../context/PeriodoContext';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

const navGroups = [
  {
    label: 'General',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'docentes', label: 'Docentes', icon: Users },
    ],
  },
  {
    label: 'Infraestructura',
    items: [
      { id: 'celulas', label: 'Células y sedes', icon: MapPin },
      { id: 'mapa', label: 'Mapa de sedes', icon: Map },
    ],
  },
  {
    label: 'Académico',
    items: [
      { id: 'facultades', label: 'Facultades', icon: Library },
      { id: 'programas', label: 'Programas', icon: GraduationCap },
      { id: 'materias', label: 'Materias', icon: BookOpen },
      { id: 'periodos', label: 'Períodos', icon: Calendar },
      { id: 'clases', label: 'Clases', icon: ClipboardList },
      { id: 'plantillas-clases', label: 'Plantillas de clases', icon: PanelsTopLeft },
      { id: 'horario-sede', label: 'Horario por sede', icon: CalendarRange },
    ],
  },
  {
    label: 'Operación',
    items: [
      { id: 'asignaciones', label: 'Asignaciones', icon: CalendarDays },
    ],
  },
  {
    label: 'Ayuda',
    items: [
      { id: 'documentacion', label: 'Documentación', icon: BookOpen },
    ],
  },
];

export function Layout({ children, activePage, onNavigate }: LayoutProps) {
  const [opened, { toggle }] = useDisclosure();
  const { periodoId, periodos, isLoading, setPeriodoId } = usePeriodoTrabajo();

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 248, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      {/* ── Header ── */}
      <AppShell.Header style={{
        background: 'linear-gradient(135deg, #264362 0%, #1e3552 100%)',
        borderBottom: '3px solid #87BF58',
        boxShadow: '0 2px 12px rgba(38,67,98,0.35)',
      }}>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" color="white" />
            {/* Logo */}
            <Group gap={10}>
              <Box style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #87BF58, #6da040)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(135,191,88,0.4)',
              }}>
                <CalendarDays size={20} color="white" strokeWidth={2.2} />
              </Box>
              <div>
                <Text fw={800} size="md" c="white" lh={1.1}>e-Schedule</Text>
                <Text size="10px" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>
                  Asignación docente
                </Text>
              </div>
            </Group>
          </Group>
          <Select
            size="xs"
            label="Periodo de trabajo"
            data={periodos.map(p => ({
              value: p.id,
              label: `${p.nombre}${p.activo ? ' (activo)' : ''}`,
            }))}
            value={periodoId || null}
            onChange={value => setPeriodoId(value || '')}
            placeholder="Periodo activo"
            loading={isLoading}
            searchable
            w={260}
            styles={{
              label: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700 },
              input: {
                background: 'rgba(255,255,255,0.1)',
                borderColor: 'rgba(255,255,255,0.22)',
                color: 'white',
              },
            }}
          />
        </Group>
      </AppShell.Header>

      {/* ── Navbar ── */}
      <AppShell.Navbar style={{
        background: 'linear-gradient(180deg, #264362 0%, #1e3552 100%)',
        borderRight: 'none',
        boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
      }}>
        <ScrollArea h="100%" p="xs">
          <Box pt="xs" pb="xl">
            {navGroups.map((group, gi) => (
              <Box key={group.label} mb="xs">
                {gi > 0 && (
                  <Divider
                    my="xs"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                  />
                )}
                <Text
                  size="10px" fw={700} px="sm" pb={4}
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  {group.label}
                </Text>
                {group.items.map((item) => {
                  const isActive = activePage === item.id;
                  return (
                    <NavLink
                      key={item.id}
                      label={item.label}
                      leftSection={
                        <Box style={{
                          width: 28, height: 28, borderRadius: 7,
                          background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.15s',
                        }}>
                          <item.icon size={15} color={isActive ? '#ffffff' : 'rgba(255,255,255,0.65)'} />
                        </Box>
                      }
                      active={isActive}
                      onClick={() => {
                        if (item.id === 'documentacion') {
                          window.location.href = '/docs';
                          return;
                        }
                        onNavigate(item.id);
                      }}
                      style={{
                        borderRadius: 10,
                        marginBottom: 2,
                        paddingTop: 8,
                        paddingBottom: 8,
                        color: isActive ? '#ffffff' : 'rgba(255,255,255,0.72)',
                        background: isActive
                          ? 'linear-gradient(90deg, #528BC9, #3f73aa)'
                          : 'transparent',
                        fontWeight: isActive ? 600 : 400,
                        fontSize: 13.5,
                        boxShadow: isActive ? '0 2px 8px rgba(82,139,201,0.35)' : 'none',
                        transition: 'all 0.15s ease',
                        borderLeft: isActive ? '3px solid #87BF58' : '3px solid transparent',
                      }}
                    />
                  );
                })}
              </Box>
            ))}
          </Box>
        </ScrollArea>

        {/* Footer versión */}
        <Box p="sm" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Text size="10px" ta="center" style={{ color: 'rgba(255,255,255,0.25)' }}>
            e-Schedule v0.1 · UNICORDOBA
          </Text>
        </Box>
      </AppShell.Navbar>

      {/* ── Main ── */}
      <AppShell.Main style={{ background: '#F5F5F5' }}>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
