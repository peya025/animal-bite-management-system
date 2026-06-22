export interface Column<T> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  rowsPerPage?: number;
  getRowKey: (row: T) => string | number;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyAction?: { label: string; onClick: () => void };
}