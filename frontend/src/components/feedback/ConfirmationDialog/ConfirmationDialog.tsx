import {
  Actions,
  CancelButton,
  ConfirmButton,
  Icon,
  LoaderBar,
  LoaderWrap,
  Message,
  Modal,
  Overlay,
  Title,
  type ConfirmationVariant,
} from './ConfirmationDialog.styles';

interface ConfirmationDialogProps {
  variant?: ConfirmationVariant;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  hideCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const ICONS: Record<string, React.ReactNode> = {
  confirm: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
      <polyline points="10 17 15 12 10 7"/>
      <line x1="15" y1="12" x2="3" y2="12"/>
    </svg>
  ),
  success: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  warning: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  danger: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
};

export default function ConfirmationDialog({
  variant = 'confirm',
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  hideCancel = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <Overlay
      onClick={hideCancel ? undefined : onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cm-title"
    >
      <Modal onClick={(e) => e.stopPropagation()}>
        <Icon variant={variant}>
          {ICONS[variant]}
        </Icon>

        <Title id="cm-title">{title}</Title>
        <Message>{message}</Message>

        {variant === 'success' && (
          <LoaderWrap>
            <LoaderBar />
          </LoaderWrap>
        )}

        {!hideCancel && (
          <Actions>
            <CancelButton onClick={onCancel}>
              {cancelLabel}
            </CancelButton>
            <ConfirmButton variant={variant} onClick={onConfirm}>
              {confirmLabel}
            </ConfirmButton>
          </Actions>
        )}
      </Modal>
    </Overlay>
  );
}
