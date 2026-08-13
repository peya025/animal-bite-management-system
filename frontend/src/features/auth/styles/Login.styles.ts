import { styled } from '@mui/material/styles';

export const LoginRoot = styled('div')`
  --primary: #10b981;
  --primary-dark: #059669;
  --primary-light: #d1fae5;
  --primary-gradient-light: #6ee7b7;
  --white: #ffffff;
  --black: #000000;
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-900: #111827;
  --glass-bg: rgba(255, 255, 255, 0.85);
  --glass-border: rgba(255, 255, 255, 0.3);
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.12);
  --shadow-xl: 0 16px 48px rgba(16, 185, 129, 0.15);
  --error: #ef4444;
  --error-light: #fee2e2;
  --error-dark: #b91c1c;
  --success: #10b981;

  [data-theme='dark'] & {
    --white: #1e293b;
    --black: #ffffff;
    --gray-50: #0f172a;
    --gray-100: #1e293b;
    --gray-200: #334155;
    --gray-300: #475569;
    --gray-400: #64748b;
    --gray-500: #94a3b8;
    --gray-600: #cbd5e1;
    --gray-700: #cbd5e1;
    --gray-900: #f3f4f6;
    --glass-bg: rgba(30, 41, 59, 0.85);
    --glass-border: rgba(71, 85, 105, 0.3);
  }

  &, & * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--white);
  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
  color: var(--gray-700);

  .info-panel {
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
    color: white;
    padding: 80px 48px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    overflow-y: auto;
    position: relative;
  }
  .info-panel::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.08) 0%, transparent 60%);
    pointer-events: none;
  }
  .logo-container { text-align: center; position: relative; z-index: 1; }
  .logo-wrapper {
    width: 180px;
    height: 180px;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(20px);
    border-radius: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 40px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.3);
    transition: transform 0.3s ease;
  }
  .logo-wrapper:hover { transform: scale(1.05); }
  .logo-wrapper svg {
    color: white;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
  }
  .logo-container h1 {
    font-size: 42px;
    font-weight: 800;
    margin-bottom: 16px;
    letter-spacing: -0.02em;
    color: white;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  .tagline {
    font-size: 18px;
    opacity: 1;
    line-height: 1.6;
    font-weight: 500;
    max-width: 320px;
    margin: 0 auto;
    color: white;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  }
  .minimal-footer {
    position: absolute;
    bottom: 48px;
    left: 0;
    right: 0;
    text-align: center;
    z-index: 1;
  }
  .version-badge {
    display: inline-block;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 24px;
    padding: 10px 24px;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: white;
  }
  .form-panel {
    background: var(--white);
    padding: 80px 56px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow-y: auto;
    position: relative;
  }
  .form-panel::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--primary-light), transparent);
  }
  .form-header { margin-bottom: 48px; }
  .form-header h2 {
    font-size: 36px;
    font-weight: 800;
    color: var(--gray-900);
    margin-bottom: 12px;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, var(--gray-900) 0%, var(--gray-700) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .form-header p { font-size: 17px; color: var(--gray-500); line-height: 1.6; }
  .login-form {
    display: flex;
    flex-direction: column;
    gap: 24px;
    margin-bottom: 32px;
  }
  .error-message {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    background: var(--error-light);
    border: 1px solid #fecaca;
    border-radius: 12px;
    color: var(--error-dark);
    font-size: 14px;
    font-weight: 500;
    animation: slideDown 0.3s ease;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.1);
  }
  .error-message svg { flex-shrink: 0; color: var(--error); }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .input-group { display: flex; flex-direction: column; gap: 10px; }
  .input-group label {
    font-size: 14px;
    font-weight: 600;
    color: var(--gray-700);
    letter-spacing: -0.01em;
  }
  .input-wrapper { position: relative; display: flex; align-items: center; }
  .input-icon {
    position: absolute;
    left: 14px;
    color: var(--gray-400);
    flex-shrink: 0;
    pointer-events: none;
    transition: color 0.3s ease;
  }
  .input-wrapper input {
    width: 100%;
    padding: 14px 14px 14px 44px;
    border: 2px solid var(--gray-200);
    border-radius: 12px;
    font-size: 15px;
    font-family: inherit;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: var(--white);
  }
  .input-wrapper input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
  }
  .input-wrapper input:focus + .input-icon { color: var(--primary); }
  .input-wrapper input::placeholder { color: var(--gray-400); }
  .input-wrapper input:disabled {
    background: var(--gray-50);
    cursor: not-allowed;
    opacity: 0.6;
  }
  .visibility-toggle {
    position: absolute;
    right: 14px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--gray-400);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    transition: all 0.3s ease;
    border-radius: 8px;
  }
  .visibility-toggle:hover { color: var(--primary); background: var(--primary-light); }
  .visibility-toggle:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }
  .form-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    margin-top: 4px;
    margin-bottom: 4px;
  }
  .remember-me {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    user-select: none;
    color: var(--gray-600);
    font-weight: 500;
    transition: color 0.3s ease;
  }
  .remember-me:hover { color: var(--gray-700); }
  .remember-me input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--primary);
    border-radius: 4px;
    transition: all 0.3s ease;
  }
  .remember-me input[type="checkbox"]:disabled { cursor: not-allowed; opacity: 0.6; }
  .forgot-password {
    color: var(--primary);
    text-decoration: none;
    font-weight: 600;
    transition: all 0.3s ease;
    position: relative;
  }
  .forgot-password::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 0;
    height: 2px;
    background: var(--primary-dark);
    transition: width 0.3s ease;
  }
  .forgot-password:hover { color: var(--primary-dark); }
  .forgot-password:hover::after { width: 100%; }
  .login-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 28px;
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
    font-family: inherit;
    margin-top: 12px;
    position: relative;
    overflow: hidden;
  }
  .login-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }
  .login-button:hover::before { left: 100%; }
  .login-button:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
  }
  .login-button:active:not(:disabled) { transform: translateY(-1px); }
  .login-button:disabled { opacity: 0.7; cursor: not-allowed; }
  .spinner {
    display: inline-block;
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .demo-note {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: var(--gray-500);
    text-align: center;
    justify-content: center;
    margin-top: 28px;
    padding-top: 28px;
    border-top: 1px solid var(--gray-200);
    background: var(--gray-50);
    padding: 16px;
    border-radius: 12px;
    font-weight: 500;
  }
  .demo-note svg {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    color: var(--primary);
  }

  .seeded-demo-container {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid var(--gray-200);
  }
  .seeded-demo-header {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--gray-400);
    text-transform: uppercase;
    margin-bottom: 12px;
    text-align: left;
  }
  .seeded-demo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .role-demo-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: var(--white);
    border: 1.5px solid var(--gray-200);
    border-radius: 12px;
    color: var(--gray-700);
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }
  .role-demo-btn:hover {
    border-color: var(--primary);
    background: var(--primary-light);
    color: var(--primary-dark);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
  }
  .role-demo-btn svg {
    color: var(--gray-500);
    transition: color 0.2s ease;
    flex-shrink: 0;
  }
  .role-demo-btn:hover svg {
    color: var(--primary-dark);
  }

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    .info-panel { display: none; }
    .form-panel {
      padding: 60px 32px;
      justify-content: flex-start;
      min-height: 100vh;
    }
  }
  @media (max-width: 768px) {
    .form-panel { padding: 48px 24px; }
    .form-header h2 { font-size: 28px; }
    .form-header p { font-size: 15px; }
    .input-wrapper input { font-size: 16px; }
    .login-button { font-size: 16px; padding: 14px 24px; }
    .form-footer { flex-direction: column; gap: 12px; align-items: flex-start; }
    .forgot-password { align-self: flex-end; }
  }
  @media (max-width: 480px) {
    .form-panel { padding: 40px 20px; }
    .form-header h2 { font-size: 24px; }
    .form-header p { font-size: 14px; }
    .feature-item { margin-bottom: 24px; }
    .input-group label { font-size: 13px; }
    .login-button { padding: 14px 20px; }
    .demo-note { font-size: 12px; }
  }
`;
