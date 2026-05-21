import {
  Stack, Title, Text, Tabs, Accordion, Timeline, Table, Badge,
  Alert, Button, Group, ThemeIcon, Paper, List, Divider, Code,
  Grid, Card, ScrollArea,
} from '@mantine/core';
import {
  BookOpen, Layers, Users, MapPin, GraduationCap, CalendarDays,
  Zap, BarChart3, Info, AlertTriangle, CheckCircle, Clock,
  Building2, ClipboardList, Settings, Map, FileText,
} from 'lucide-react';

// ─── helpers ───────────────────────────────────────────────────────────────

/** Tabla con borde visible compatible con Mantine v9 */
function BTable({ children, mt }: { children: React.ReactNode; mt?: string }) {
  return (
    <ScrollArea mt={mt}>
      <Paper withBorder radius="sm" style={{ overflow: 'hidden' }}>
        <Table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          {children}
        </Table>
      </Paper>
    </ScrollArea>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: React.FC<any>; children: React.ReactNode }) {
  return (
    <Group gap="sm" mb="sm">
      <ThemeIcon size="lg" radius="md" variant="light" color="blue">
        <Icon size={18} />
      </ThemeIcon>
      <Text fw={700} size="lg">{children}</Text>
    </Group>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <Alert icon={<Info size={16} />} color="blue" variant="light" radius="md" mb="sm">
      {children}
    </Alert>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <Alert icon={<AlertTriangle size={16} />} color="orange" variant="light" radius="md" mb="sm">
      {children}
    </Alert>
  );
}

function Success({ children }: { children: React.ReactNode }) {
  return (
    <Alert icon={<CheckCircle size={16} />} color="green" variant="light" radius="md" mb="sm">
      {children}
    </Alert>
  );
}

function DocScreenshot({ name, title, caption }: { name: string; title: string; caption: string }) {
  return (
    <Paper p="xs" radius="md" withBorder bg="gray.0">
      <Text size="xs" fw={700} c="dimmed" mb={6}>{title}</Text>
      <img
        src={`/docs/screenshots/${name}.png`}
        alt={title}
        style={{
          display: 'block',
          width: '100%',
          borderRadius: 6,
          border: '1px solid var(--mantine-color-gray-3)',
          background: 'white',
        }}
      />
      <Text size="xs" c="dimmed" mt={6}>{caption}</Text>
    </Paper>
  );
}

// ─── secciones ─────────────────────────────────────────────────────────────

function TabIntroduccion() {
  return (
    <Stack gap="xl">
      <Paper p="xl" radius="md" withBorder style={{ background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4e8 100%)', borderColor: '#c8dff5' }}>
        <Group gap="md" align="flex-start">
          <ThemeIcon size={52} radius="xl" style={{ background: 'linear-gradient(135deg, #264362, #1e3552)', flexShrink: 0 }}>
            <CalendarDays size={26} color="white" />
          </ThemeIcon>
          <div>
            <Text fw={800} size="xl" mb={4}>e-Schedule — Sistema de asignación docente</Text>
            <Text c="dimmed" size="sm">UNICORDOBA · v0.1</Text>
            <Text mt="sm" size="sm" style={{ maxWidth: 700 }}>
              e-Schedule es la plataforma institucional de UNICORDOBA para planificar y gestionar la oferta académica semestral.
              Centraliza la información de docentes, sedes, programas y materias, y ejecuta un motor de optimización que asigna
              automáticamente cada docente al horario y sede más adecuados, respetando disponibilidad, capacidad horaria,
              restricciones geográficas y calendarios quincenales.
            </Text>
          </div>
        </Group>
      </Paper>

      <div>
        <SectionTitle icon={Layers}>Flujo de trabajo general</SectionTitle>
        <DocScreenshot
          name="dashboard"
          title="Dashboard general"
          caption="Vista ejecutiva del período de trabajo, capacidad docente, demanda de clases y alertas principales."
        />
        <Text size="sm" c="dimmed" mb="md">
          Sigue estos pasos en orden la primera vez que configures un período académico.
          Una vez la infraestructura y el cuerpo docente están registrados, solo necesitas repetir los pasos 5 al 8.
        </Text>
        <Timeline active={-1} bulletSize={28} lineWidth={2}>
          <Timeline.Item
            bullet={<Text size="xs" fw={700} c="white">1</Text>}
            title={<Text fw={600}>Estructura organizacional</Text>}
            color="blue"
          >
            <Text size="sm" c="dimmed">Registra Facultades, Departamentos y Programas académicos.</Text>
          </Timeline.Item>
          <Timeline.Item
            bullet={<Text size="xs" fw={700} c="white">2</Text>}
            title={<Text fw={600}>Infraestructura física</Text>}
            color="blue"
          >
            <Text size="sm" c="dimmed">Crea Células regionales y las Sedes que pertenecen a cada célula.</Text>
          </Timeline.Item>
          <Timeline.Item
            bullet={<Text size="xs" fw={700} c="white">3</Text>}
            title={<Text fw={600}>Cuerpo docente</Text>}
            color="blue"
          >
            <Text size="sm" c="dimmed">Registra Docentes, asígnales su célula o vinculación central y configura su disponibilidad horaria.</Text>
          </Timeline.Item>
          <Timeline.Item
            bullet={<Text size="xs" fw={700} c="white">4</Text>}
            title={<Text fw={600}>Catálogo de materias</Text>}
            color="blue"
          >
            <Text size="sm" c="dimmed">Define las Materias del programa con sus horas semanales y semestre al que pertenecen.</Text>
          </Timeline.Item>
          <Timeline.Item
            bullet={<Text size="xs" fw={700} c="white">5</Text>}
            title={<Text fw={600}>Período académico</Text>}
            color="teal"
          >
            <Text size="sm" c="dimmed">Crea el Período (ej. 2025-2) y márcalo como activo. Define la fecha de inicio y el calendario base (A o B).</Text>
          </Timeline.Item>
          <Timeline.Item
            bullet={<Text size="xs" fw={700} c="white">6</Text>}
            title={<Text fw={600}>Oferta de clases</Text>}
            color="teal"
          >
            <Text size="sm" c="dimmed">Genera las Clases del período usando Plantillas de clases o crea cada clase individualmente.</Text>
          </Timeline.Item>
          <Timeline.Item
            bullet={<Text size="xs" fw={700} c="white">7</Text>}
            title={<Text fw={600}>Asignación docente</Text>}
            color="teal"
          >
            <Text size="sm" c="dimmed">Ejecuta el motor automático de asignaciones o asigna manualmente docentes a cada clase.</Text>
          </Timeline.Item>
          <Timeline.Item
            bullet={<Text size="xs" fw={700} c="white">8</Text>}
            title={<Text fw={600}>Revisión y publicación</Text>}
            color="teal"
          >
            <Text size="sm" c="dimmed">Revisa el Horario por sede, el Mapa de sedes y el Dashboard. Exporta reportes si es necesario.</Text>
          </Timeline.Item>
        </Timeline>
      </div>

      <div>
        <SectionTitle icon={BarChart3}>Módulos de la plataforma</SectionTitle>
        <Grid>
          {[
            { icon: Users, label: 'Docentes', color: 'blue', desc: 'Gestión del cuerpo docente y su disponibilidad horaria.' },
            { icon: MapPin, label: 'Células y Sedes', color: 'green', desc: 'Infraestructura física distribuida en regiones.' },
            { icon: GraduationCap, label: 'Programas y Materias', color: 'violet', desc: 'Oferta académica organizada por facultad y departamento.' },
            { icon: CalendarDays, label: 'Períodos', color: 'teal', desc: 'Gestión de semestres académicos.' },
            { icon: ClipboardList, label: 'Clases', color: 'orange', desc: 'Oferta de clases por período, sede y grupo.' },
            { icon: Zap, label: 'Asignaciones', color: 'red', desc: 'Motor automático y asignación manual de docentes.' },
            { icon: Map, label: 'Mapa', color: 'cyan', desc: 'Vista geográfica de sedes y asignaciones foráneas.' },
            { icon: BarChart3, label: 'Dashboard', color: 'grape', desc: 'Métricas de capacidad, cobertura y ocupación docente.' },
          ].map((mod) => (
            <Grid.Col key={mod.label} span={{ base: 12, sm: 6, md: 3 }}>
              <Card p="md" radius="md" withBorder h="100%">
                <Group gap="xs" mb={6}>
                  <ThemeIcon size="sm" radius="sm" color={mod.color} variant="light">
                    <mod.icon size={13} />
                  </ThemeIcon>
                  <Text fw={600} size="sm">{mod.label}</Text>
                </Group>
                <Text size="xs" c="dimmed">{mod.desc}</Text>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      </div>
    </Stack>
  );
}

function TabConfiguracion() {
  return (
    <Stack gap="md">
      <Tip>
        Estos módulos configuran la infraestructura permanente del sistema. Solo necesitas completarlos una vez y actualizar cuando haya cambios institucionales.
      </Tip>

      <Accordion variant="separated" radius="md">
        <Accordion.Item value="facultades">
          <Accordion.Control icon={<ThemeIcon size="sm" color="violet" variant="light" radius="sm"><Building2 size={13} /></ThemeIcon>}>
            <Text fw={600}>Facultades y Departamentos</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="sm">
                Las <strong>Facultades</strong> son la unidad organizacional de más alto nivel (ej. Facultad de Ingeniería).
                Cada facultad contiene uno o más <strong>Departamentos</strong> (ej. Departamento de Sistemas).
                Los departamentos sirven para organizar docentes y programas académicos.
              </Text>
              <DocScreenshot
                name="facultades"
                title="Facultades y departamentos"
                caption="Vista para mantener la estructura académica base: facultades y departamentos responsables."
              />
              <Text fw={600} size="sm" mt="xs">Para crear una Facultad:</Text>
              <List size="sm" spacing={4}>
                <List.Item>Ve a <Code>Académico → Facultades</Code> en el menú lateral.</List.Item>
                <List.Item>Haz clic en <Badge color="blue" size="sm">+ Nueva facultad</Badge>.</List.Item>
                <List.Item>Ingresa el nombre y una descripción opcional.</List.Item>
                <List.Item>Guarda. Desde la misma pantalla puedes expandir la facultad para agregar Departamentos.</List.Item>
              </List>
              <Tip>Un departamento siempre pertenece a una única facultad. Si necesitas mover un departamento, debes eliminarlo y crearlo nuevamente bajo la facultad correcta.</Tip>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="programas">
          <Accordion.Control icon={<ThemeIcon size="sm" color="grape" variant="light" radius="sm"><GraduationCap size={13} /></ThemeIcon>}>
            <Text fw={600}>Programas académicos</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="sm">
                Un <strong>Programa</strong> representa una carrera o plan de estudios (ej. Ingeniería de Sistemas, Tecnología en Desarrollo de Software).
                Cada programa define cómo se distribuyen sus clases en el período.
              </Text>
              <DocScreenshot
                name="programas"
                title="Programas académicos"
                caption="Desde esta vista se consulta la oferta, la ciclicidad, el número de semestres y las sedes donde se oferta cada programa."
              />
              <BTable mt="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Campo</Table.Th>
                    <Table.Th>Descripción</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td><Code>Departamento</Code></Table.Td>
                    <Table.Td>Departamento al que pertenece el programa.</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Code>Tipo de ciclo</Code></Table.Td>
                    <Table.Td><Badge size="xs" color="teal">Semanal</Badge> — clases todas las semanas. <Badge size="xs" color="orange">Quincenal</Badge> — clases cada dos semanas, alternando calendario A y B.</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Code>N.º de semestres</Code></Table.Td>
                    <Table.Td>Total de semestres del programa. Limita qué semestres son válidos al crear clases.</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Code>Prioritario</Code></Table.Td>
                    <Table.Td>Marca el programa para que sus clases sean atendidas primero durante la asignación automática.</Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </BTable>
              <Warning>El tipo de ciclo afecta directamente la generación de clases y la asignación. No cambies este valor una vez que el período está en curso.</Warning>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="celulas-sedes">
          <Accordion.Control icon={<ThemeIcon size="sm" color="green" variant="light" radius="sm"><MapPin size={13} /></ThemeIcon>}>
            <Text fw={600}>Células y Sedes</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="sm">
                La infraestructura física está organizada en dos niveles:
              </Text>
              <DocScreenshot
                name="celulas-sedes"
                title="Células y sedes"
                caption="Vista para administrar células regionales, sedes, coordenadas y programas ofertados por sede."
              />
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Paper p="md" radius="md" withBorder>
                    <Text fw={700} size="sm" mb={4}>Célula regional</Text>
                    <Text size="sm" c="dimmed">
                      Nodo administrativo que agrupa sedes en un municipio o zona geográfica.
                      Ejemplo: <em>Célula Lorica</em> agrupa todas las sedes del municipio de Lorica.
                    </Text>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Paper p="md" radius="md" withBorder>
                    <Text fw={700} size="sm" mb={4}>Sede</Text>
                    <Text size="sm" c="dimmed">
                      Lugar físico donde se dictan clases. Puede ser central, célula, municipal o rural.
                      Requiere coordenadas geográficas para el cálculo de distancias.
                    </Text>
                  </Paper>
                </Grid.Col>
              </Grid>
              <Text fw={600} size="sm" mt="xs">Tipos de sede:</Text>
              <BTable>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Tipo</Table.Th>
                    <Table.Th>Descripción</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr><Table.Td><Badge color="blue">Central</Badge></Table.Td><Table.Td>Sede principal de la institución. No requiere célula.</Table.Td></Table.Tr>
                  <Table.Tr><Table.Td><Badge color="green">Célula</Badge></Table.Td><Table.Td>Sede ubicada en el nodo regional. Pertenece a una célula.</Table.Td></Table.Tr>
                  <Table.Tr><Table.Td><Badge color="yellow">Municipal</Badge></Table.Td><Table.Td>Sede en cabecera municipal. Pertenece a una célula.</Table.Td></Table.Tr>
                  <Table.Tr><Table.Td><Badge color="orange">Rural</Badge></Table.Td><Table.Td>Sede en zona rural. Pertenece a una célula.</Table.Td></Table.Tr>
                </Table.Tbody>
              </BTable>
              <Tip>Ingresa siempre las coordenadas (latitud / longitud) de cada sede. El motor de asignaciones las usa para calcular distancias de traslado y validar tiempos de viaje entre sedes.</Tip>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="docentes">
          <Accordion.Control icon={<ThemeIcon size="sm" color="blue" variant="light" radius="sm"><Users size={13} /></ThemeIcon>}>
            <Text fw={600}>Docentes y disponibilidad</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="sm">
                Los docentes son el recurso central del sistema. Cada docente tiene un perfil que define cuántas horas puede tomar, dónde puede enseñar y en qué horarios está disponible.
              </Text>
              <DocScreenshot
                name="docentes"
                title="Docentes"
                caption="Listado operativo de docentes, capacidad horaria, vinculación, célula y disponibilidad."
              />
              <BTable>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Campo</Table.Th>
                    <Table.Th>Descripción</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td><Code>Tipo de vinculación</Code></Table.Td>
                    <Table.Td><Badge size="xs" color="blue">Central</Badge> — puede enseñar en cualquier sede. <Badge size="xs" color="green">Célula</Badge> — restringido a sedes de su célula (salvo modo libre).</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Code>Célula asignada</Code></Table.Td>
                    <Table.Td>Célula regional a la que pertenece. Requerido si el tipo es "célula".</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Code>Máx. horas</Code></Table.Td>
                    <Table.Td>Tope de horas semanales que puede asumir. Por defecto 19h.</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Code>Modo libre</Code></Table.Td>
                    <Table.Td>Permite asignar al docente fuera de su célula habitual (asignaciones foráneas).</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Code>Disponibilidad</Code></Table.Td>
                    <Table.Td>Bloques horarios por día de la semana en que el docente puede recibir clases.</Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </BTable>
              <Text fw={600} size="sm" mt="xs">Configurar disponibilidad:</Text>
              <List size="sm" spacing={4}>
                <List.Item>Abre la ficha del docente con el botón <Badge size="xs">Ver detalle</Badge>.</List.Item>
                <List.Item>En la sección <em>Disponibilidad horaria</em>, haz clic en <Badge size="xs" color="blue">+ Agregar bloque</Badge>.</List.Item>
                <List.Item>Selecciona el día de la semana, la hora de inicio y la hora de fin del bloque disponible.</List.Item>
                <List.Item>Puedes agregar múltiples bloques por día (ej. mañana y tarde).</List.Item>
              </List>
              <Warning>Sin bloques de disponibilidad configurados, el motor automático no podrá asignar clases al docente.</Warning>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}

function TabAcademico() {
  return (
    <Stack gap="md">
      <Accordion variant="separated" radius="md">
        <Accordion.Item value="periodos">
          <Accordion.Control icon={<ThemeIcon size="sm" color="teal" variant="light" radius="sm"><CalendarDays size={13} /></ThemeIcon>}>
            <Text fw={600}>Períodos académicos</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="sm">
                Un <strong>Período</strong> representa un semestre académico (ej. <em>2025-2</em>).
                El período activo es el contexto de trabajo en toda la plataforma; puedes cambiarlo desde el selector en el encabezado.
              </Text>
              <DocScreenshot
                name="periodos"
                title="Períodos académicos"
                caption="Gestión del período de trabajo y calendario base para la planeación."
              />
              <BTable>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Campo</Table.Th>
                    <Table.Th>Descripción</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td><Code>Nombre</Code></Table.Td>
                    <Table.Td>Identificador del período (ej. <em>2025-2</em>). Aparece en todos los filtros y reportes.</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Code>Fecha de inicio</Code></Table.Td>
                    <Table.Td>Primer día hábil del semestre. Usado para calcular a qué semana corresponde cada clase.</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Code>Calendario inicio</Code></Table.Td>
                    <Table.Td>Define si la primera semana del período es <Badge size="xs">Semana A</Badge> o <Badge size="xs" color="orange">Semana B</Badge>. Determina la alternancia para programas quincenales.</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Code>Activo</Code></Table.Td>
                    <Table.Td>Solo puede haber un período activo a la vez. El período activo es el que se carga por defecto al entrar a la plataforma.</Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </BTable>
              <Tip>El selector de período en el encabezado te permite trabajar en cualquier período sin necesidad de activarlo, útil para revisar históricos.</Tip>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="materias">
          <Accordion.Control icon={<ThemeIcon size="sm" color="indigo" variant="light" radius="sm"><BookOpen size={13} /></ThemeIcon>}>
            <Text fw={600}>Materias</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="sm">
                Las <strong>Materias</strong> son las asignaturas que conforman el plan de estudios de cada programa.
                Su configuración determina cuánto tiempo ocupa cada clase en el horario del docente.
              </Text>
              <DocScreenshot
                name="materias"
                title="Materias"
                caption="Catálogo de asignaturas por programa, semestre, departamento y horas semanales."
              />
              <BTable>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Campo</Table.Th>
                    <Table.Th>Descripción</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td><Code>Horas/semana</Code></Table.Td>
                    <Table.Td>Duración en horas de cada sesión semanal. Determina el bloque horario que ocupa la clase.</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Code>Semestre</Code></Table.Td>
                    <Table.Td>Semestre del plan de estudios al que pertenece la materia. Usado para filtrar y organizar la oferta.</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Code>Programa</Code></Table.Td>
                    <Table.Td>Programa académico al que pertenece la materia.</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Code>Departamento</Code></Table.Td>
                    <Table.Td>Departamento responsable de dictar la materia. Puede diferir del programa.</Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </BTable>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="plantillas">
          <Accordion.Control icon={<ThemeIcon size="sm" color="orange" variant="light" radius="sm"><Settings size={13} /></ThemeIcon>}>
            <Text fw={600}>Plantillas de clases</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="sm">
                Las <strong>Plantillas</strong> son configuraciones reutilizables que aceleran la generación de la oferta de clases
                para cada período. Una plantilla define para un programa, uno o varios días de la semana y una distribución horaria,
                cuántos grupos deben generarse por semestre.
              </Text>
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <DocScreenshot
                    name="plantillas"
                    title="Listado de plantillas"
                    caption="Repositorio de patrones reutilizables para distintos programas, días, jornadas, semestres y grupos."
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <DocScreenshot
                    name="plantillas-modal"
                    title="Formulario de plantilla"
                    caption="La plantilla permite seleccionar varios días de clase y definir jornadas y grupos por semestre."
                  />
                </Grid.Col>
              </Grid>
              <Text fw={600} size="sm">Estructura de una plantilla:</Text>
              <Grid>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Paper p="sm" radius="md" withBorder>
                    <Text fw={700} size="xs" c="dimmed" mb={4}>PROGRAMA Y DÍAS</Text>
                    <Text size="sm">Programa académico al que aplica y días de la semana en que se generarán las clases.</Text>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Paper p="sm" radius="md" withBorder>
                    <Text fw={700} size="xs" c="dimmed" mb={4}>JORNADAS</Text>
                    <Text size="sm">Uno o más bloques horarios por día (ej. 07:00–13:00 y 14:00–20:00). Las clases se van encadenando dentro de estas jornadas para cada día seleccionado.</Text>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Paper p="sm" radius="md" withBorder>
                    <Text fw={700} size="xs" c="dimmed" mb={4}>SEMESTRES Y GRUPOS</Text>
                    <Text size="sm">Para cada semestre del programa, cuántos grupos paralelos deben generarse (ej. Semestre 3 → 2 grupos).</Text>
                  </Paper>
                </Grid.Col>
              </Grid>
              <Text fw={600} size="sm" mt="xs">Generar clases desde una plantilla:</Text>
              <DocScreenshot
                name="clases-generador"
                title="Generador de clases"
                caption="El generador aplica una plantilla por sede y crea las clases oficiales del período."
              />
              <List size="sm" spacing={4}>
                <List.Item>Ve a <Code>Académico → Clases</Code> y haz clic en <Badge size="xs" color="blue">Generar clases</Badge>.</List.Item>
                <List.Item>Elige el período y las sedes donde quieres generar la oferta.</List.Item>
                <List.Item>Para cada sede, selecciona la plantilla que corresponde.</List.Item>
                <List.Item>Haz clic en <Badge size="xs" color="teal">Generar clases</Badge>. El sistema creará automáticamente todas las clases en estado <Badge size="xs">pendiente</Badge>.</List.Item>
              </List>
              <Success>Si una plantilla tiene varios días, el generador distribuye las materias sobre la combinación de días y jornadas disponibles.</Success>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="clases">
          <Accordion.Control icon={<ThemeIcon size="sm" color="red" variant="light" radius="sm"><ClipboardList size={13} /></ThemeIcon>}>
            <Text fw={600}>Clases académicas</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="sm">
                Una <strong>Clase</strong> representa la necesidad académica concreta: un grupo de un semestre
                debe recibir una materia en una sede y franja horaria específica. Es el objeto que el sistema
                asigna a un docente.
              </Text>
              <DocScreenshot
                name="clases"
                title="Listado de clases"
                caption="El listado permite filtrar por programa, sede y semestre, revisar estados y borrar clases filtradas cuando sea necesario."
              />
              <BTable>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Estado</Table.Th>
                    <Table.Th>Significado</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td><Badge color="yellow">Pendiente</Badge></Table.Td>
                    <Table.Td>La clase existe en la oferta pero aún no tiene docente asignado.</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Badge color="green">Asignada</Badge></Table.Td>
                    <Table.Td>Un docente fue asignado a esta clase exitosamente.</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Badge color="red">Cancelada</Badge></Table.Td>
                    <Table.Td>La clase fue cancelada y no se tendrá en cuenta en la asignación.</Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </BTable>
              <Text fw={600} size="sm" mt="xs">Calendarios A/B para programas quincenales:</Text>
              <Text size="sm">
                Cuando el programa es de ciclo quincenal, cada clase pertenece a la Semana A o a la Semana B.
                Esto permite que dos clases compartan el mismo horario sin conflicto (una se dicta la semana impar, la otra la par).
                Para programas semanales, el calendario es Semanal (sin distinción).
              </Text>
              <Tip>El horario por sede (<Code>Académico → Horario por sede</Code>) te muestra visualmente todas las clases y asignaciones de una sede en formato de grilla semanal, separando semana A y semana B.</Tip>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}

function TabAsignaciones() {
  return (
    <Stack gap="md">
      <Paper p="md" radius="md" withBorder style={{ borderColor: '#c8dff5', background: '#f8fbff' }}>
        <Text size="sm">
          El módulo de Asignaciones es el corazón operativo de e-Schedule. Conecta cada clase pendiente con
          el docente más adecuado según disponibilidad, capacidad horaria, restricciones geográficas y
          proximidad a la sede.
        </Text>
      </Paper>
      <DocScreenshot
        name="asignaciones"
        title="Vista de asignaciones"
        caption="Permite filtrar, revisar el borrador del motor automático y confirmar asignaciones al período de trabajo."
      />

      <Accordion variant="separated" radius="md">
        <Accordion.Item value="modos">
          <Accordion.Control icon={<ThemeIcon size="sm" color="blue" variant="light" radius="sm"><Zap size={13} /></ThemeIcon>}>
            <Text fw={600}>Modos de asignación</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <BTable>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Modo</Table.Th>
                    <Table.Th>Descripción</Table.Th>
                    <Table.Th>Cuándo usarlo</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td><Badge color="blue">Automático</Badge></Table.Td>
                    <Table.Td>El motor genera candidatos y selecciona el de mayor puntuación respetando todas las restricciones.</Table.Td>
                    <Table.Td>Flujo normal al inicio del período.</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Badge color="green">Libre manual</Badge></Table.Td>
                    <Table.Td>El coordinador asigna manualmente un docente a una clase, eligiendo día, hora y sede.</Table.Td>
                    <Table.Td>Ajustes específicos, excepciones o clases que el motor no pudo resolver.</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Badge color="orange">Foráneo</Badge></Table.Td>
                    <Table.Td>El docente es asignado fuera de su célula habitual. Requiere que el docente tenga el Modo Libre activado.</Table.Td>
                    <Table.Td>Cuando no hay docentes disponibles en la célula destino y se necesita apoyo externo.</Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </BTable>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="motor">
          <Accordion.Control icon={<ThemeIcon size="sm" color="violet" variant="light" radius="sm"><Settings size={13} /></ThemeIcon>}>
            <Text fw={600}>Cómo funciona el motor automático</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="sm">
                Al ejecutar la asignación automática, el motor sigue este proceso para cada clase pendiente:
              </Text>
              <Timeline active={-1} bulletSize={22} lineWidth={2}>
                <Timeline.Item bullet={<Text size="10px" fw={700} c="white">1</Text>} title={<Text fw={600} size="sm">Carga el contexto</Text>} color="blue">
                  <Text size="xs" c="dimmed">Obtiene todos los docentes disponibles, sus horarios libres y las asignaciones ya existentes en el período.</Text>
                </Timeline.Item>
                <Timeline.Item bullet={<Text size="10px" fw={700} c="white">2</Text>} title={<Text fw={600} size="sm">Genera candidatos</Text>} color="blue">
                  <Text size="xs" c="dimmed">Para cada combinación válida de docente + sede + franja horaria, verifica que no existan conflictos de horario ni superación del límite de horas.</Text>
                </Timeline.Item>
                <Timeline.Item bullet={<Text size="10px" fw={700} c="white">3</Text>} title={<Text fw={600} size="sm">Valida restricciones geográficas</Text>} color="blue">
                  <Text size="xs" c="dimmed">Comprueba que el docente pertenezca a la célula de la sede (o tenga modo libre). Verifica que el tiempo de traslado entre sedes del mismo día sea factible (distancia ÷ 80 km/h + 30 min mínimo).</Text>
                </Timeline.Item>
                <Timeline.Item bullet={<Text size="10px" fw={700} c="white">4</Text>} title={<Text fw={600} size="sm">Calcula el score</Text>} color="blue">
                  <Text size="xs" c="dimmed">Cada candidato recibe una puntuación negativa proporcional a la distancia. El candidato con mayor score (menor distancia acumulada) es el ganador.</Text>
                </Timeline.Item>
                <Timeline.Item bullet={<Text size="10px" fw={700} c="white">5</Text>} title={<Text fw={600} size="sm">Confirma la asignación</Text>} color="teal">
                  <Text size="xs" c="dimmed">Registra la asignación, actualiza las horas del docente y marca la clase como "asignada".</Text>
                </Timeline.Item>
              </Timeline>
              <Tip>
                La fórmula de puntuación es: <Code>score = −(distancia_km × 2) − distancia_promedio_dia</Code>. Un score más cercano a 0 indica un candidato óptimo.
              </Tip>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="validaciones">
          <Accordion.Control icon={<ThemeIcon size="sm" color="red" variant="light" radius="sm"><AlertTriangle size={13} /></ThemeIcon>}>
            <Text fw={600}>Reglas de validación</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="sm">El sistema aplica estas reglas antes de confirmar cualquier asignación (automática o manual):</Text>
              <List size="sm" spacing="xs" icon={<ThemeIcon size="xs" color="red" variant="light" radius="xl"><AlertTriangle size={10} /></ThemeIcon>}>
                <List.Item>
                  <strong>Movilidad geográfica:</strong> un docente de tipo "célula" no puede ser asignado a sedes fuera de su célula, a menos que tenga el Modo Libre activo.
                </List.Item>
                <List.Item>
                  <strong>Capacidad máxima:</strong> la suma de horas asignadas no puede superar el campo <Code>max_horas</Code> del docente.
                </List.Item>
                <List.Item>
                  <strong>Conflicto de horario:</strong> un docente no puede tener dos clases el mismo día y hora. Las clases de calendario A y B distintos no se consideran conflicto.
                </List.Item>
                <List.Item>
                  <strong>Tiempo de traslado:</strong> si el docente tiene otra clase el mismo día en una sede diferente, el sistema verifica que haya tiempo suficiente para trasladarse (distancia ÷ 80 km/h + 30 min de transferencia).
                </List.Item>
              </List>
              <Warning>
                Si una asignación manual viola alguna de estas reglas, la plataforma mostrará un error descriptivo y no guardará la asignación.
              </Warning>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="asignacion-masiva">
          <Accordion.Control icon={<ThemeIcon size="sm" color="teal" variant="light" radius="sm"><FileText size={13} /></ThemeIcon>}>
            <Text fw={600}>Asignación masiva (borrador)</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="sm">
                La asignación masiva permite revisar todas las propuestas del motor <strong>antes de confirmarlas</strong>.
                El sistema genera un borrador con todos los candidatos óptimos y tú decides cuáles confirmar o descartar.
              </Text>
              <DocScreenshot
                name="asignaciones"
                title="Entrada a asignación masiva"
                caption="Desde la vista de asignaciones se accede al borrador masivo, la asignación automática y la asignación manual."
              />
              <Text fw={600} size="sm">Flujo del borrador:</Text>
              <List size="sm" spacing={4}>
                <List.Item>Haz clic en <Badge size="xs" color="teal">Asignación masiva</Badge> en la pantalla de Asignaciones.</List.Item>
                <List.Item>El sistema procesa todas las clases pendientes y muestra la lista de propuestas.</List.Item>
                <List.Item>Revisa cada propuesta: docente sugerido, sede, horario, distancia y advertencias.</List.Item>
                <List.Item>Filtra por programa, semana o estado para revisar subconjuntos.</List.Item>
                <List.Item>Haz clic en <Badge size="xs" color="green">Confirmar seleccionadas</Badge> para guardar las asignaciones aprobadas.</List.Item>
              </List>
              <Tip>
                Las filas con <Badge size="xs" color="orange">advertencias</Badge> son asignaciones válidas pero que el sistema considera subóptimas (mayor distancia, docente casi al límite de horas, etc.). Puedes confirmarlas igualmente.
              </Tip>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}

function TabVisualizacion() {
  return (
    <Stack gap="md">
      <Accordion variant="separated" radius="md">
        <Accordion.Item value="dashboard">
          <Accordion.Control icon={<ThemeIcon size="sm" color="grape" variant="light" radius="sm"><BarChart3 size={13} /></ThemeIcon>}>
            <Text fw={600}>Dashboard general</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="sm">
                El Dashboard muestra un resumen ejecutivo del estado del período de trabajo seleccionado.
                Todas las métricas se actualizan en tiempo real cuando cambias el período en el selector del encabezado.
              </Text>
              <DocScreenshot
                name="dashboard"
                title="Dashboard general"
                caption="Resumen visual de capacidad docente, demanda académica, cobertura de clases y alertas del período seleccionado."
              />
              <BTable>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Métrica</Table.Th>
                    <Table.Th>Qué mide</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td><strong>Capacidad total</strong></Table.Td>
                    <Table.Td>Suma de horas máximas de todos los docentes registrados.</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><strong>Demanda de clases</strong></Table.Td>
                    <Table.Td>Total de horas que representan las clases activas del período.</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><strong>Balance (superávit / déficit)</strong></Table.Td>
                    <Table.Td>Diferencia entre capacidad y demanda. Un déficit indica que se necesitan más docentes.</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><strong>Presión sobre la capacidad</strong></Table.Td>
                    <Table.Td>Porcentaje de la capacidad total que absorbe la demanda actual. Sobre 85% se considera alto riesgo.</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><strong>Cobertura de clases</strong></Table.Td>
                    <Table.Td>Porcentaje de clases activas que ya tienen docente asignado.</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><strong>Docentes equivalentes</strong></Table.Td>
                    <Table.Td>Cuántos docentes (a 19h/semana) se necesitarían para cubrir toda la demanda.</Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </BTable>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="horario-sede">
          <Accordion.Control icon={<ThemeIcon size="sm" color="cyan" variant="light" radius="sm"><Clock size={13} /></ThemeIcon>}>
            <Text fw={600}>Horario por sede</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="sm">
                La vista de <strong>Horario por sede</strong> muestra la grilla horaria completa de una sede para el período activo.
                Puedes ver qué clases hay cada día, en qué franja y quién las dicta.
              </Text>
              <DocScreenshot
                name="horario-sede"
                title="Horario por sede"
                caption="La grilla semanal muestra clases y asignaciones por sede, separando correctamente semanas A y B."
              />
              <List size="sm" spacing={4}>
                <List.Item>Selecciona la sede en el selector superior.</List.Item>
                <List.Item>Elige si quieres ver la <Badge size="xs">Semana A</Badge>, <Badge size="xs" color="orange">Semana B</Badge> o <Badge size="xs" color="gray">Todas</Badge>.</List.Item>
                <List.Item>Las celdas muestran el nombre de la materia, el docente asignado y el grupo.</List.Item>
                <List.Item>Las clases sin docente aparecen en naranja como <Badge size="xs" color="orange">pendiente</Badge>.</List.Item>
              </List>
              <Tip>Usa esta vista para detectar solapamientos visuales o franjas horarias vacías antes de finalizar el período.</Tip>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="mapa">
          <Accordion.Control icon={<ThemeIcon size="sm" color="teal" variant="light" radius="sm"><Map size={13} /></ThemeIcon>}>
            <Text fw={600}>Mapa de sedes</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="sm">
                El <strong>Mapa</strong> muestra todas las sedes registradas sobre un mapa geográfico interactivo.
                Los marcadores están coloreados según el tipo de sede.
              </Text>
              <DocScreenshot
                name="mapa"
                title="Mapa de sedes"
                caption="Vista geográfica de sedes para validar ubicación, zona y contexto territorial."
              />
              <BTable>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Color</Table.Th>
                    <Table.Th>Tipo de sede</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr><Table.Td><Badge color="blue">Azul</Badge></Table.Td><Table.Td>Central</Table.Td></Table.Tr>
                  <Table.Tr><Table.Td><Badge color="green">Verde</Badge></Table.Td><Table.Td>Célula</Table.Td></Table.Tr>
                  <Table.Tr><Table.Td><Badge color="yellow">Amarillo</Badge></Table.Td><Table.Td>Municipal</Table.Td></Table.Tr>
                  <Table.Tr><Table.Td><Badge color="orange">Naranja</Badge></Table.Td><Table.Td>Rural</Table.Td></Table.Tr>
                </Table.Tbody>
              </BTable>
              <Text size="sm">
                Haz clic en cualquier marcador para ver el detalle de la sede: nombre, célula, dirección y coordenadas.
              </Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}

function TabGlosario() {
  const terminos = [
    { term: 'Célula', def: 'Nodo administrativo regional que agrupa sedes en un área geográfica. Define el ámbito de movilidad de los docentes vinculados a ella.' },
    { term: 'Sede', def: 'Lugar físico donde se dictan clases. Clasificada en central, célula, municipal o rural. Requiere coordenadas para el cálculo de distancias.' },
    { term: 'Docente vinculado a célula', def: 'Docente cuyo contrato lo ata a una célula específica. Solo puede enseñar en sedes de esa célula, a menos que tenga Modo Libre activo.' },
    { term: 'Docente central', def: 'Docente con vinculación institucional global. Puede ser asignado a cualquier sede sin restricción geográfica.' },
    { term: 'Modo Libre', def: 'Bandera del docente que elimina la restricción geográfica y permite asignaciones fuera de su célula habitual. Las asignaciones resultantes quedan marcadas como "foráneas".' },
    { term: 'Asignación foránea', def: 'Asignación en que el docente enseña fuera de la célula a la que pertenece. Requiere Modo Libre activo. El sistema registra la distancia y la señala visualmente.' },
    { term: 'Período académico', def: 'Semestre (ej. 2025-2). Contexto temporal de todas las clases y asignaciones. Solo puede haber uno activo a la vez.' },
    { term: 'Calendario A / B', def: 'En programas quincenales, las clases alternan entre semana A (semanas impares del período) y semana B (semanas pares). Dos clases en el mismo horario con distinto calendario no generan conflicto.' },
    { term: 'Clase académica', def: 'Instancia concreta de enseñanza: un grupo de un semestre de un programa recibe una materia en una sede y franja horaria determinada. Es lo que se asigna a un docente.' },
    { term: 'Plantilla de clases', def: 'Configuración reutilizable que describe cómo generar la oferta de clases para un programa y uno o varios días. Incluye jornadas horarias y número de grupos por semestre.' },
    { term: 'Score de asignación', def: 'Puntuación interna del motor que mide qué tan óptima es una combinación docente-sede. Se calcula penalizando la distancia al lugar de referencia del docente.' },
    { term: 'Presión sobre la capacidad', def: 'Porcentaje de la capacidad docente total absorbido por la demanda de clases del período. Sobre 85% indica riesgo de desabastecimiento.' },
    { term: 'Cobertura de clases', def: 'Porcentaje de clases activas que ya tienen docente asignado. Llegar al 100% es el objetivo del proceso de asignación.' },
    { term: 'Disponibilidad horaria', def: 'Conjunto de bloques de día + hora en que un docente puede recibir clases. El motor solo genera candidatos dentro de estos bloques.' },
    { term: 'Horas asignadas', def: 'Suma de horas de todas las clases actualmente asignadas a un docente en el período. No puede superar el campo max_horas.' },
  ];

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">Referencia rápida de los términos técnicos y de negocio usados en e-Schedule.</Text>
      <BTable>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={200}>Término</Table.Th>
            <Table.Th>Definición</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {terminos.map(({ term, def }) => (
            <Table.Tr key={term}>
              <Table.Td><Text fw={600} size="sm">{term}</Text></Table.Td>
              <Table.Td><Text size="sm">{def}</Text></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </BTable>
    </Stack>
  );
}

// ─── página principal ───────────────────────────────────────────────────────

export function Documentacion() {
  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Documentación</Title>
          <Text size="sm" c="dimmed" mt={2}>Guía funcional completa de e-Schedule</Text>
        </div>
        <Badge variant="light" color="blue" size="lg" leftSection={<BookOpen size={13} />}>
          Guía de usuario
        </Badge>
      </Group>

      <Divider />

      <Tabs defaultValue="introduccion" variant="outline">
        <Tabs.List mb="md">
          <Tabs.Tab value="introduccion" leftSection={<BookOpen size={14} />}>Introducción</Tabs.Tab>
          <Tabs.Tab value="configuracion" leftSection={<Settings size={14} />}>Configuración</Tabs.Tab>
          <Tabs.Tab value="academico" leftSection={<GraduationCap size={14} />}>Académico</Tabs.Tab>
          <Tabs.Tab value="asignaciones" leftSection={<Zap size={14} />}>Asignaciones</Tabs.Tab>
          <Tabs.Tab value="visualizacion" leftSection={<BarChart3 size={14} />}>Visualización</Tabs.Tab>
          <Tabs.Tab value="glosario" leftSection={<FileText size={14} />}>Glosario</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="introduccion"><TabIntroduccion /></Tabs.Panel>
        <Tabs.Panel value="configuracion"><TabConfiguracion /></Tabs.Panel>
        <Tabs.Panel value="academico"><TabAcademico /></Tabs.Panel>
        <Tabs.Panel value="asignaciones"><TabAsignaciones /></Tabs.Panel>
        <Tabs.Panel value="visualizacion"><TabVisualizacion /></Tabs.Panel>
        <Tabs.Panel value="glosario"><TabGlosario /></Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

export function DocumentacionStandalone() {
  return (
    <div style={{ minHeight: '100dvh', background: '#eef3f8' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--mantine-color-gray-3)',
        }}
      >
        <Group justify="space-between" px="xl" py="md">
          <Group gap="sm">
            <ThemeIcon size={38} radius="md" color="brand" variant="filled">
              <BookOpen size={20} />
            </ThemeIcon>
            <div>
              <Text fw={800} size="lg">Guía de e-Schedule</Text>
              <Text size="xs" c="dimmed">Manual funcional y recorrido visual de la plataforma</Text>
            </div>
          </Group>
          <Button component="a" href="/" variant="light" color="brand">
            Volver a la app
          </Button>
        </Group>
      </div>

      <main style={{ maxWidth: 1480, margin: '0 auto', padding: '32px clamp(16px, 3vw, 40px) 56px' }}>
        <Paper
          p="xl"
          radius="md"
          withBorder
          mb="xl"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f2f7fd 55%, #edf7e8 100%)',
            borderColor: '#d4e3ef',
          }}
        >
          <Group justify="space-between" align="flex-start" gap="xl">
            <div style={{ maxWidth: 720 }}>
              <Badge color="brand" variant="light" mb="sm">Documentación</Badge>
              <Title order={1} size="h1">Manual funcional de e-Schedule</Title>
              <Text c="dimmed" mt="sm">
                Una guía navegable para entender la configuración académica, la generación de clases,
                las asignaciones docentes y las vistas de seguimiento, acompañada con capturas reales de la plataforma.
              </Text>
            </div>
            <Stack gap="xs" miw={220}>
              <Badge color="success" variant="filled" size="lg">Actualizable con capturas</Badge>
              <Text size="xs" c="dimmed">
                Las imágenes se regeneran con <Code>npm run docs:screenshots</Code>.
              </Text>
            </Stack>
          </Group>
        </Paper>

        <Paper p="xl" radius="md" withBorder bg="white">
          <Documentacion />
        </Paper>
      </main>
    </div>
  );
}
