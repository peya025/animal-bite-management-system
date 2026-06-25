import { useState } from 'react';
import api from '../../../../services/api';
import ConfirmationDialog from '../../../../components/feedback/ConfirmationDialog';

interface InventoryItem {
  inventory_id: number;
  clinic_id: number;
  vaccine_type: string;
  batch_number: string;
  current_quantity: number;
  expiration_date: string;
  status: 'active' | 'expired' | 'deleted';
  created_at: string;
  updated_at: string;
  transactions_count?: number;
}

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
