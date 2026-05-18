import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Group, Modal, Stack, Text } from '@mantine/core';

type ConfirmOptions = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  color?: string;
};

type PendingConfirm = ConfirmOptions & {
  resolve: (confirmed: boolean) => void;
};

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => (
    new Promise<boolean>(resolve => setPending({ ...options, resolve }))
  ), []);

  const handleClose = (confirmed: boolean) => {
    pending?.resolve(confirmed);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        opened={!!pending}
        onClose={() => handleClose(false)}
        title={pending?.title ?? 'Confirmar accion'}
        centered
      >
        <Stack gap="md">
          <Text size="sm">{pending?.message}</Text>
          <Group justify="flex-end">
            <Button variant="light" color="gray" onClick={() => handleClose(false)}>
              {pending?.cancelLabel ?? 'Cancelar'}
            </Button>
            <Button color={pending?.color ?? 'red'} onClick={() => handleClose(true)}>
              {pending?.confirmLabel ?? 'Confirmar'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return confirm;
}
