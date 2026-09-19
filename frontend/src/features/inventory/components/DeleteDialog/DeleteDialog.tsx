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
  const [reason, setReason] = useState('Expired / Damaged cold storage');
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!item) return;
    if (!reason || reason.trim().length < 5) {
      setError('Please provide a valid archival reason (at least 5 characters).');
      return;
    }
    setError(null);
    setDeleting(true);
    try {
      await api.delete(`/inventory/${item.inventory_id}`, {
        data: { reason: reason.trim() },
      });
      onDeleted();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to archive inventory item.');
    } finally {
      setDeleting(false);
    }
  };

  if (!open || !item) return null;

  return (
    <ConfirmationDialog
      variant="warning"
      title="Archive Vaccine Batch"
      message={
        <div style={{ textAlign: 'left' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13.5px', color: '#475569' }}>
            This will <strong>soft-archive</strong> the batch. All injection records and history will be permanently preserved.
          </p>
          <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', fontSize: '12.5px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
            <div><strong>Vaccine:</strong> {item.vaccine_type}</div>
            <div><strong>Batch #:</strong> {item.batch_number}</div>
            <div><strong>Remaining Stock:</strong> {item.current_quantity} vials</div>
          </div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            Archival Reason (Required):
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Expired batch, packaging damaged, recalled"
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '13px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {error && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', marginBottom: 0 }}>
              {error}
            </p>
          )}
        </div>
      }
      confirmLabel={deleting ? 'Archiving...' : 'Confirm Archival'}
      cancelLabel="Cancel"
      onConfirm={handleDelete}
      onCancel={onClose}
    />
  );
}
