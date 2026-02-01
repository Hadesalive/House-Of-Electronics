import { useState, useCallback } from 'react';

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const useConfirmation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions>({
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'info'
  });
  const [onConfirm, setOnConfirm] = useState<(() => void) | null>(null);

  const confirm = useCallback((opts: ConfirmationOptions, callback: () => void) => {
    setOptions(opts);
    setOnConfirm(() => callback);
    setIsOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    if (onConfirm) {
      onConfirm();
      setOnConfirm(null);
    }
    setIsOpen(false);
  }, [onConfirm]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setOnConfirm(null);
  }, []);

  return {
    isOpen,
    options,
    confirm,
    handleConfirm,
    handleClose
  };
};
