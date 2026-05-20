import { useState } from 'react';
import {
  Stack, Title, Text, Button, Group, Paper, Table, Badge,
  Modal, TextInput, PasswordInput, Alert, ActionIcon, Tooltip,
  ThemeIcon,
} from '@mantine/core';
import { useAuth } from '../context/AuthContext';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Plus, UserCheck, UserX, KeyRound, AlertTriangle, Users } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useConfirm } from '../components/ConfirmProvider';

interface UsuarioRow {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'coordinador';
  activo: number;
  ultimo_login_at: string | null;
  created_at: string;
}

function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: () => api.get<UsuarioRow[]>('/usuarios').then(r => r.data),
  });
}

function useCrearUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { nombre: string; email: string; password: string }) =>
      api.post('/usuarios', body).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

function useToggleActivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      api.patch(`/usuarios/${id}/activo`, { activo }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

function useResetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.patch(`/usuarios/${id}/password`, { password }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

function formatDate(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('es-CO', {
    dateStyle: 'short', timeStyle: 'short',
  });
}

export function Usuarios() {
  const { isAdmin } = useAuth();
  const confirm = useConfirm();

  if (!isAdmin) {
    return (
      <Stack align="center" justify="center" h={300} gap="xs">
        <ThemeIcon size="xl" variant="light" color="red"><AlertTriangle size={24} /></ThemeIcon>
        <Title order={4} c="dimmed">Acceso restringido</Title>
        <Text size="sm" c="dimmed">Solo los administradores pueden gestionar usuarios.</Text>
      </Stack>
    );
  }
  const { data: usuarios = [], isLoading } = useUsuarios();
  const crearUsuario = useCrearUsuario();
  const toggleActivo = useToggleActivo();
  const resetPassword = useResetPassword();

  const [crearOpen, { open: openCrear, close: closeCrear }] = useDisclosure(false);
  const [resetOpen, { open: openReset, close: closeReset }] = useDisclosure(false);
  const [selectedId, setSelectedId] = useState('');

  const [nuevoForm, setNuevoForm] = useState({ nombre: '', email: '', password: '', confirm: '' });
  const [nuevoError, setNuevoError] = useState('');

  const [resetForm, setResetForm] = useState({ password: '', confirm: '' });
  const [resetError, setResetError] = useState('');

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setNuevoError('');
    if (nuevoForm.password !== nuevoForm.confirm) {
      setNuevoError('Las contraseñas no coinciden');
      return;
    }
    try {
      await crearUsuario.mutateAsync({
        nombre: nuevoForm.nombre,
        email: nuevoForm.email,
        password: nuevoForm.password,
      });
      notifications.show({ message: 'Coordinador creado', color: 'green' });
      setNuevoForm({ nombre: '', email: '', password: '', confirm: '' });
      closeCrear();
    } catch (err: any) {
      setNuevoError(err?.response?.data?.error ?? 'Error al crear usuario');
    }
  };

  const handleToggleActivo = async (u: UsuarioRow) => {
    const accion = u.activo ? 'desactivar' : 'activar';
    const ok = await confirm({
      title: `${accion.charAt(0).toUpperCase() + accion.slice(1)} usuario`,
      message: `¿Confirmas ${accion} a ${u.nombre}?`,
      confirmLabel: accion.charAt(0).toUpperCase() + accion.slice(1),
      color: u.activo ? 'red' : 'green',
    });
    if (!ok) return;
    try {
      await toggleActivo.mutateAsync({ id: u.id, activo: !u.activo });
      notifications.show({ message: `Usuario ${accion === 'activar' ? 'activado' : 'desactivado'}`, color: u.activo ? 'orange' : 'green' });
    } catch (err: any) {
      notifications.show({ message: err?.response?.data?.error ?? 'Error', color: 'red' });
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (resetForm.password !== resetForm.confirm) {
      setResetError('Las contraseñas no coinciden');
      return;
    }
    try {
      await resetPassword.mutateAsync({ id: selectedId, password: resetForm.password });
      notifications.show({ message: 'Contraseña restablecida', color: 'green' });
      setResetForm({ password: '', confirm: '' });
      closeReset();
    } catch (err: any) {
      setResetError(err?.response?.data?.error ?? 'Error al restablecer contraseña');
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Usuarios</Title>
          <Text size="sm" c="dimmed">Administración de coordinadores del sistema</Text>
        </div>
        <Button leftSection={<Plus size={16} />} onClick={openCrear}>
          Nuevo coordinador
        </Button>
      </Group>

      <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Rol</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Último acceso</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <Table.Tr>
                <Table.Td colSpan={6}><Text size="sm" c="dimmed" ta="center" py="md">Cargando...</Text></Table.Td>
              </Table.Tr>
            ) : usuarios.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Group justify="center" py="xl" gap="xs">
                    <ThemeIcon size="lg" variant="light" color="gray"><Users size={18} /></ThemeIcon>
                    <Text size="sm" c="dimmed">No hay usuarios registrados</Text>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ) : (
              usuarios.map((u) => (
                <Table.Tr key={u.id}>
                  <Table.Td><Text size="sm" fw={500}>{u.nombre}</Text></Table.Td>
                  <Table.Td><Text size="sm" c="dimmed">{u.email}</Text></Table.Td>
                  <Table.Td>
                    <Badge color={u.rol === 'admin' ? 'blue' : 'teal'} variant="light" size="sm">
                      {u.rol}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={u.activo ? 'green' : 'gray'} variant="dot" size="sm">
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </Table.Td>
                  <Table.Td><Text size="xs" c="dimmed">{formatDate(u.ultimo_login_at)}</Text></Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <Tooltip label={u.activo ? 'Desactivar' : 'Activar'}>
                        <ActionIcon
                          variant="light"
                          color={u.activo ? 'orange' : 'green'}
                          size="sm"
                          onClick={() => handleToggleActivo(u)}
                        >
                          {u.activo ? <UserX size={14} /> : <UserCheck size={14} />}
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Restablecer contraseña">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          size="sm"
                          onClick={() => { setSelectedId(u.id); setResetForm({ password: '', confirm: '' }); setResetError(''); openReset(); }}
                        >
                          <KeyRound size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Modal crear coordinador */}
      <Modal opened={crearOpen} onClose={closeCrear} title="Nuevo coordinador" size="sm">
        <form onSubmit={handleCrear}>
          <Stack gap="sm">
            <TextInput label="Nombre" required value={nuevoForm.nombre} onChange={e => setNuevoForm(f => ({ ...f, nombre: e.target.value }))} />
            <TextInput label="Email" type="email" required value={nuevoForm.email} onChange={e => setNuevoForm(f => ({ ...f, email: e.target.value }))} />
            <PasswordInput label="Contraseña" placeholder="Mín. 10 caracteres, letra y número" required value={nuevoForm.password} onChange={e => setNuevoForm(f => ({ ...f, password: e.target.value }))} />
            <PasswordInput label="Confirmar contraseña" required value={nuevoForm.confirm} onChange={e => setNuevoForm(f => ({ ...f, confirm: e.target.value }))} />
            {nuevoError && <Alert icon={<AlertTriangle size={14} />} color="red" variant="light" radius="md">{nuevoError}</Alert>}
            <Group justify="flex-end" mt="xs">
              <Button variant="default" onClick={closeCrear}>Cancelar</Button>
              <Button type="submit" loading={crearUsuario.isPending}>Crear coordinador</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal restablecer contraseña */}
      <Modal opened={resetOpen} onClose={closeReset} title="Restablecer contraseña" size="sm">
        <form onSubmit={handleReset}>
          <Stack gap="sm">
            <PasswordInput label="Nueva contraseña" placeholder="Mín. 10 caracteres, letra y número" required value={resetForm.password} onChange={e => setResetForm(f => ({ ...f, password: e.target.value }))} />
            <PasswordInput label="Confirmar nueva contraseña" required value={resetForm.confirm} onChange={e => setResetForm(f => ({ ...f, confirm: e.target.value }))} />
            {resetError && <Alert icon={<AlertTriangle size={14} />} color="red" variant="light" radius="md">{resetError}</Alert>}
            <Group justify="flex-end" mt="xs">
              <Button variant="default" onClick={closeReset}>Cancelar</Button>
              <Button type="submit" loading={resetPassword.isPending} color="blue">Restablecer</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
