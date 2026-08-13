import { styled } from '@mui/material/styles';

const BellButton = styled('button')`
  position: relative;
  background: var(--btn-outlined-bg, #ffffff);
  border: 1px solid var(--card-border, #e5e7eb);
  color: var(--text-h, #111827);
  border-radius: 8px;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0;
  box-shadow: var(--shadow);

  &:hover {
    background: var(--nav-item-hover-bg, #f9fafb);
    border-color: #10b981;
    color: #10b981;
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.96);
  }

  svg {
    transition: transform 0.2s ease;
  }

  &:hover svg {
    transform: rotate(-8deg);
  }
`;

const NotificationDot = styled('span')`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fb7185 0%, #ef4444 100%);
  box-shadow: 0 0 0 2px var(--btn-outlined-bg, #ffffff);
`;

export default function NotificationButton() {
  return (
    <BellButton type="button" title="Notifications" aria-label="Notifications">
      <NotificationDot />
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
        <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
      </svg>
    </BellButton>
  );
}
