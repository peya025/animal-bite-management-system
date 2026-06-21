# Inventory Components

This folder contains reusable components extracted from the VaccineInventory page for better maintainability and reusability.

## Components

### 1. AddEditInventoryDialog.tsx
**Purpose**: Dialog for adding new vaccine stock or editing existing inventory items.

**Props**:
- `open: boolean` - Controls dialog visibility
- `editItem: InventoryItem | null` - Item to edit (null for add mode)
- `onClose: () => void` - Callback when dialog closes
- `onSaved: () => void` - Callback after successful save

**Features**:
- Visual pill selector for vaccine types
- Batch number validation
- Quantity and expiration date inputs
- Live expiry warning (past dates, expiring soon)
- Live summary preview of what will be added
- Confirmation modal before saving
- Gradient green header for add mode, blue for edit mode

---

### 2. AdjustStockDialog.tsx
**Purpose**: Dialog for adjusting stock quantities (restock, deduct, mark as expired, dispose).

**Props**:
- `open: boolean` - Controls dialog visibility
- `item: InventoryItem | null` - Inventory item to adjust
- `onClose: () => void` - Callback when dialog closes
- `onSaved: () => void` - Callback after successful adjustment

**Features**:
- Transaction type selector (received, adjusted, expired, disposed)
- Quantity input (add or deduct)
- Remarks field for notes
- Color-coded buttons (red for deductions, primary for additions)
- Confirmation modal with transaction summary

---

### 3. TransactionHistoryDialog.tsx
**Purpose**: Dialog displaying the transaction history for a specific inventory item.

**Props**:
- `open: boolean` - Controls dialog visibility
- `item: InventoryItem | null` - Inventory item to show history for
- `onClose: () => void` - Callback when dialog closes

**Features**:
- Table view of all transactions
- Date, type, quantity, staff, remarks columns
- Color-coded transaction types (success, warning, error, info)
- Empty state with icon when no transactions
- Loading state with spinner

---

### 4. DeleteDialog.tsx
**Purpose**: Confirmation dialog for deleting an inventory item.

**Props**:
- `open: boolean` - Controls dialog visibility
- `item: InventoryItem | null` - Item to delete
- `onClose: () => void` - Callback when dialog closes
- `onDeleted: () => void` - Callback after successful deletion

**Features**:
- Uses ConfirmationModal with danger variant
- Shows item details (vaccine type, batch, quantity)
- Calculates patient coverage (quantity × 3)
- Loading state during deletion

---

### 5. InventoryTable.tsx
**Purpose**: Reusable table component for displaying inventory items with pagination.

**Props**:
- `items: InventoryItem[]` - Array of inventory items
- `loading: boolean` - Shows skeleton loaders when true
- `page: number` - Current page number
- `rowsPerPage: number` - Number of rows per page
- `total: number` - Total number of items
- `onPageChange: (newPage: number) => void` - Page change callback
- `onRowsPerPageChange: (newRowsPerPage: number) => void` - Rows per page change callback
- `onEdit: (item: InventoryItem) => void` - Edit button callback
- `onAdjust: (item: InventoryItem) => void` - Adjust stock button callback
- `onHistory: (item: InventoryItem) => void` - Transaction history button callback
- `onDelete: (item: InventoryItem) => void` - Delete button callback
- `onAddFirst: () => void` - Add first stock button callback (when empty)

**Features**:
- 7 columns: ID, Vaccine Type, Batch Number, Vials/Capacity, Expiration Date, Status, Actions
- Vaccine icon with type name
- Mini stock progress bar (red for depleted, orange for low, green for normal)
- Patient coverage calculation (quantity × 3)
- Expiration warnings (expired, expiring soon with day countdown)
- Status chips (active, expired, depleted)
- 4 action buttons: Adjust Stock, Transaction History, Edit, Delete
- Empty state with "Add First Stock" button
- Skeleton loaders during loading
- Built-in pagination component

---

## Usage Example

```tsx
import VaccineInventory from './pages/Inventory/VaccineInventory';

// The main VaccineInventory component already uses all these components
// If you need to use them separately in other pages:

import AddEditInventoryDialog from './components/Inventory/AddEditInventoryDialog';
import AdjustStockDialog from './components/Inventory/AdjustStockDialog';
import TransactionHistoryDialog from './components/Inventory/TransactionHistoryDialog';
import DeleteDialog from './components/Inventory/DeleteDialog';
import InventoryTable from './components/Inventory/InventoryTable';

function MyCustomInventoryView() {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  return (
    <>
      <InventoryTable
        items={items}
        loading={false}
        page={0}
        rowsPerPage={10}
        total={items.length}
        onPageChange={(page) => console.log('Page:', page)}
        onRowsPerPageChange={(rows) => console.log('Rows:', rows)}
        onEdit={(item) => setSelectedItem(item)}
        onAdjust={(item) => console.log('Adjust:', item)}
        onHistory={(item) => console.log('History:', item)}
        onDelete={(item) => console.log('Delete:', item)}
        onAddFirst={() => setDialogOpen(true)}
      />
      
      <AddEditInventoryDialog
        open={dialogOpen}
        editItem={selectedItem}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          // Reload data
        }}
      />
    </>
  );
}
```

---

## Component Dependencies

All components depend on:
- `@mui/material` - Material UI components
- `@mui/icons-material` - Material UI icons
- `../../services/api` - API service for HTTP requests
- `../ConfirmationModal/ConfirmationModal` - Confirmation modal component (for dialogs)

## TypeScript Interfaces

```typescript
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
```

---

## Benefits of Component Extraction

1. **Reusability**: Components can be used in other pages (e.g., different inventory views, reports)
2. **Maintainability**: Each component has a single responsibility, easier to update
3. **Testing**: Smaller components are easier to test in isolation
4. **Code Organization**: Clear separation of concerns
5. **Performance**: Components can be lazy-loaded if needed
6. **Collaboration**: Multiple developers can work on different components simultaneously

---

## Future Enhancements

Possible improvements for these components:

1. **InventoryTable**: Add sorting, filtering, column visibility toggle
2. **AddEditInventoryDialog**: Add barcode scanner integration
3. **TransactionHistoryDialog**: Add export to CSV/PDF
4. **AdjustStockDialog**: Add photo upload for proof of delivery
5. **All Dialogs**: Add keyboard shortcuts (Escape to close, Enter to confirm)
