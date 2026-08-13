import { useAppTheme } from '../contexts/ThemeContext';
import { styled } from '@mui/material/styles';

const ToggleButton = styled('button')`
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
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &:hover svg {
    transform: rotate(20deg);
  }
`;

export default function ThemeToggle() {
  const { themeMode, toggleThemeMode } = useAppTheme();

  return (
    <ToggleButton 
      onClick={toggleThemeMode} 
      title={themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
      aria-label="Toggle theme"
      type="button"
    >
      {themeMode === 'light' ? (
        /* Sun Icon */
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="5" fill="#f59e0b" stroke="#d97706" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        /* Moon Icon */
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            fill="#a78bfa"
            stroke="#7c3aed"
          />
        </svg>
      )}
    </ToggleButton>
  );
}
