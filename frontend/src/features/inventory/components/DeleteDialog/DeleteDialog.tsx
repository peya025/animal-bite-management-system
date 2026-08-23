import { useState } from 'react';
import api from '../../../../services/api';
import ConfirmationDialog from '../../../../components/feedback/ConfirmationDialog';
import type { InventoryItem } from '../../types';

interface DeleteDialogProps {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteDialog({ open, item, onClose, onDeleted }: DeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!item) return;
    setDeleting(true);
    try {
      await api.delete(`/inventory/${item.inventory_id}`);
      onDeleted();
      onClose();
    } catch {
      /* keep modal open on error */
    } finally {
      setDeleting(false);
    }
  };

  if (!open || !item) return null;

  return (
    <ConfirmationDialog
      variant="danger"
      title="Delete Inventory Item"
      message={
        <>
          Permanently delete this record?
          <br />
          <strong>{item.vaccine_type}</strong> · Batch <strong>{item.batch_number}</strong>
          <br />
          Stock: <strong>{item.current_quantity} vials</strong> (≈{' '}
          {item.current_quantity * 3} patients)
        </>
      }
      confirmLabel={deleting ? 'Deleting…' : 'Yes, Delete'}
      cancelLabel="Cancel"
      onConfirm={handleDelete}
      onCancel={onClose}
    />
  );
}
