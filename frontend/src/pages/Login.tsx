import { useState } from 'react';
import {
  Box, Paper, Stack, Title, Text, TextInput, PasswordInput,
  Button, Alert, Group, Divider,
} from '@mantine/core';
import { CalendarDays, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

// ─── Bootstrap Admin ─────────────────────────────────────────────────────────

function BootstrapAdmin({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ nombre: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/bootstrap-admin', {
        nombre: form.nombre,
        email: form.email,
        password: form.password,
      });
      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al crear administrador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <Alert icon={<ShieldCheck size={16} />} color="blue" variant="light" radius="md">
          Es la primera vez que se usa e-Schedule. Crea el usuario administrador para comenzar.
        </Alert>

        <TextInput
          label="Nombre completo"
          placeholder="Administrador"
          required
          value={form.nombre}
          onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
        />
        <TextInput
          label="Correo electrónico"
          placeholder="admin@unicordoba.edu.co"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
        />
        <PasswordInput
          label="Contraseña"
          placeholder="Mínimo 10 caracteres, letra y número"
          required
          value={form.password}
          onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
        />
        <PasswordInput
          label="Confirmar contraseña"
          placeholder="Repite la contraseña"
          required
          value={form.confirm}
          onChange={(e) => setForm(f => ({ ...f, confirm: e.target.value }))}
        />

        {error && (
          <Alert icon={<AlertTriangle size={15} />} color="red" variant="light" radius="md">
            {error}
          </Alert>
        )}

        <Button type="submit" fullWidth loading={loading} color="blue">
          Crear administrador
        </Button>
      </Stack>
    </form>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginForm() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <TextInput
          label="Correo electrónico"
          placeholder="usuario@unicordoba.edu.co"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
        />
        <PasswordInput
          label="Contraseña"
          placeholder="Tu contraseña"
          required
          value={form.password}
          onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
        />

        {error && (
          <Alert icon={<AlertTriangle size={15} />} color="red" variant="light" radius="md">
            {error}
          </Alert>
        )}

        <Button type="submit" fullWidth loading={loading} style={{ background: 'linear-gradient(90deg, #528BC9, #3f73aa)' }}>
          Ingresar
        </Button>
      </Stack>
    </form>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export function LoginPage() {
  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);
  const [checkDone, setCheckDone] = useState(false);
  const { refreshMe } = useAuth();

  // Verificar si se necesita bootstrap
  useState(() => {
    api.get<{ needs_bootstrap: boolean }>('/auth/bootstrap-status')
      .then(({ data }) => setNeedsBootstrap(data.needs_bootstrap))
      .catch(() => setNeedsBootstrap(false))
      .finally(() => setCheckDone(true));
  });

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #264362 0%, #1e3552 60%, #152740 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <Paper
        p="xl"
        radius="lg"
        w="100%"
        maw={420}
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.35)' }}
      >
        {/* Logo */}
        <Group justify="center" mb="xl">
          <Stack align="center" gap={8}>
            <Box
              style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg, #87BF58, #6da040)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(135,191,88,0.4)',
              }}
            >
              <CalendarDays size={26} color="white" strokeWidth={2.2} />
            </Box>
            <div style={{ textAlign: 'center' }}>
              <Title order={3} style={{ color: '#264362' }}>e-Schedule</Title>
              <Text size="xs" c="dimmed">Asignación docente · UNICORDOBA</Text>
            </div>
          </Stack>
        </Group>

        <Divider mb="lg" />

        {!checkDone ? (
          <Text ta="center" c="dimmed" size="sm">Cargando...</Text>
        ) : needsBootstrap ? (
          <>
            <Title order={4} mb="xs">Configuración inicial</Title>
            <Text size="sm" c="dimmed" mb="md">Crea el primer administrador del sistema.</Text>
            <BootstrapAdmin onCreated={() => { setNeedsBootstrap(false); refreshMe(); }} />
          </>
        ) : (
          <>
            <Title order={4} mb="xs">Iniciar sesión</Title>
            <Text size="sm" c="dimmed" mb="md">Ingresa tus credenciales para continuar.</Text>
            <LoginForm />
          </>
        )}
      </Paper>
    </Box>
  );
}
