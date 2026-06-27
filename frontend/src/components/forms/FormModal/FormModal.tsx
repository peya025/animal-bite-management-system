import {
  Body,
  CloseButton,
  Footer,
  Header,
  Modal,
  Overlay,
  Subtitle,
  Title,
} from './FormModal.styles';

interface FormModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Footer slot — put your action buttons here */
  footer?: React.ReactNode;
  /** Max width in px (default 720) */
  maxWidth?: number;
}

export default function FormModal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = 720,
}: FormModalProps) {
  return (
    <Overlay onClick={onClose} role="dialog" aria-modal="true">
      <Modal
        maxWidth={maxWidth}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <Header>
          <div>
            <Title>{title}</Title>
            {subtitle && <Subtitle>{subtitle}</Subtitle>}
          </div>
          <CloseButton onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </CloseButton>
        </Header>

        {/* Scrollable body */}
        <Body>{children}</Body>

        {/* Footer */}
        {footer && <Footer>{footer}</Footer>}
      </Modal>
    </Overlay>
  );
}
