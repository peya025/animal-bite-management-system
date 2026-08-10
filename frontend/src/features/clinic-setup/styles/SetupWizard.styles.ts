import { styled } from '@mui/material/styles';

export const SetupWizardRoot = styled('div')`
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #021411 0%, #062f26 50%, #010f0c 100%);
  display: flex;
  flex-direction: column;
  font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
  color: rgba(255, 255, 255, 0.85);

  /* Floating Neon Green & Mint Blobs */
  .ambient-blobs {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    z-index: 0;
    pointer-events: none;
  }

  .blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(85px);
    opacity: 0.45;
    animation: float-blob 22s infinite alternate ease-in-out;
  }

  .blob-1 {
    top: -5%;
    left: -5%;
    width: 480px;
    height: 480px;
    background: radial-gradient(circle, rgba(16, 185, 129, 0.85) 0%, rgba(16, 185, 129, 0) 70%);
  }

  .blob-2 {
    bottom: -5%;
    right: -5%;
    width: 550px;
    height: 550px;
    background: radial-gradient(circle, rgba(5, 150, 105, 0.8) 0%, rgba(5, 150, 105, 0) 70%);
    animation-delay: -5s;
  }

  .blob-3 {
    top: 35%;
    right: 15%;
    width: 320px;
    height: 320px;
    background: radial-gradient(circle, rgba(105, 240, 174, 0.65) 0%, rgba(105, 240, 174, 0) 70%);
    animation-delay: -10s;
  }

  @keyframes float-blob {
    0% {
      transform: translate(0, 0) scale(1);
    }
    50% {
      transform: translate(45px, 35px) scale(1.06);
    }
    100% {
      transform: translate(-20px, -45px) scale(0.95);
    }
  }

  /* Sparkling Star Particles */
  .sparkles-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
    pointer-events: none;
    overflow: hidden;
  }

  .sparkle {
    position: absolute;
    width: 14px;
    height: 14px;
    color: #69f0ae; /* Mint green sparkle */
    opacity: 0;
    animation: sparkle-float 6s infinite ease-in-out;
    filter: drop-shadow(0 0 6px rgba(105, 240, 174, 0.8));
  }

  .sparkle-1 { top: 20%; left: 12%; animation-delay: 0s; }
  .sparkle-2 { top: 75%; left: 8%; animation-delay: 1.5s; width: 18px; height: 18px; }
  .sparkle-3 { top: 15%; right: 22%; animation-delay: 3s; }
  .sparkle-4 { top: 60%; right: 10%; animation-delay: 4.5s; width: 10px; height: 10px; }
  .sparkle-5 { top: 40%; left: 52%; animation-delay: 2.2s; width: 16px; height: 16px; }

  @keyframes sparkle-float {
    0%, 100% {
      transform: translate(0, 0) scale(0) rotate(0deg);
      opacity: 0;
    }
    50% {
      transform: translate(15px, -25px) scale(1) rotate(180deg);
      opacity: 0.75;
    }
  }

  /* Welcome Screen */
  .welcome-screen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    position: relative;
    z-index: 10;
  }

  .welcome-card {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border: 1px solid rgba(255, 255, 255, 0.12); /* Glass border matching setup-content */
    border-radius: 32px;
    padding: 56px;
    max-width: 640px;
    width: 100%;
    text-align: center;
    box-shadow: 
      0 30px 60px rgba(0, 0, 0, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .welcome-title {
    font-size: 38px;
    font-weight: 800;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 12px 0;
    letter-spacing: -0.8px;
  }

  .welcome-subtitle {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 500;
    margin: 0 0 36px 0;
  }

  .welcome-logo-icon {
    width: 96px;
    height: 96px;
    border-radius: 28px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    margin-bottom: 24px;
    box-shadow: 0 12px 24px -10px rgba(16, 185, 129, 0.5);
    animation: pulse-ring-welcome 3s infinite;
  }

  @keyframes pulse-ring-welcome {
    0% {
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4), 0 12px 24px -10px rgba(16, 185, 129, 0.5);
    }
    70% {
      box-shadow: 0 0 0 12px rgba(16, 185, 129, 0), 0 12px 24px -10px rgba(16, 185, 129, 0.5);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0), 0 12px 24px -10px rgba(16, 185, 129, 0.5);
    }
  }

  .welcome-illustration {
    margin: 32px 0;
    padding: 20px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .illustration-content {
    display: flex;
    gap: 40px;
    justify-content: center;
    align-items: center;
  }

  .illustration-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .illustration-icon {
    font-size: 32px;
    animation: float 4s ease-in-out infinite;
  }

  .illustration-item:nth-child(2) .illustration-icon { animation-delay: 0.8s; }
  .illustration-item:nth-child(3) .illustration-icon { animation-delay: 1.6s; }

  .illustration-label {
    font-size: 11px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.55);
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }

  .welcome-text h2 {
    font-size: 20px;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 8px 0;
  }

  .welcome-text p {
    font-size: 15px;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 40px 0;
  }

  .btn-start {
    padding: 16px 36px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;
    border-radius: 30px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    transition: all 0.3s;
    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
  }

  .btn-start:hover {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(16, 185, 129, 0.5);
  }

  /* Setup Header */
  .setup-header {
    position: relative;
    z-index: 10;
    padding: 22px 40px;
    background: rgba(2, 20, 17, 0.55);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .setup-logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logo-circle {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 4px 10px rgba(16, 185, 129, 0.25);
  }

  .logo-text {
    font-size: 18px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.3px;
  }

  /* Setup Container */
  .setup-container {
    position: relative;
    z-index: 10;
    flex: 1;
    max-width: 840px;
    margin: 40px auto;
    padding: 0 20px 60px;
    width: 100%;
  }

  /* Step Indicators Stepper */
  .step-indicators {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    margin: 0 auto 50px;
    max-width: 720px;
    padding: 0 10px;
  }

  .step-indicators::before {
    content: '';
    position: absolute;
    top: 22px;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(255, 255, 255, 0.08);
    z-index: 1;
    border-radius: 2px;
  }

  .step-indicators-progress {
    position: absolute;
    top: 22px;
    left: 0;
    height: 3px;
    background: linear-gradient(90deg, #10b981, #059669);
    z-index: 1;
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 2px;
  }

  .step-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    position: relative;
    z-index: 2;
    cursor: default;
    width: 80px;
  }

  .step-indicator::after {
    display: none;
  }

  .step-number {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
  }

  .step-indicator.active .step-number {
    background: rgba(255, 255, 255, 0.08);
    border-color: #10b981;
    color: #10b981;
    transform: scale(1.12);
    box-shadow: 
      0 10px 20px rgba(16, 185, 129, 0.25),
      0 0 0 5px rgba(16, 185, 129, 0.15);
    animation: pulse-ring 2.5s infinite;
  }

  .step-indicator.completed .step-number {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border-color: #10b981;
    color: #ffffff;
    transform: scale(1);
    box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
  }

  .step-title {
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    text-align: center;
    transition: color 0.3s;
    white-space: nowrap;
  }

  .step-indicator.active .step-title {
    color: #ffffff;
    font-weight: 700;
  }

  .step-indicator.completed .step-title {
    color: rgba(255, 255, 255, 0.8);
  }

  @keyframes pulse-ring {
    0% {
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4), 0 10px 20px rgba(16, 185, 129, 0.2);
    }
    70% {
      box-shadow: 0 0 0 8px rgba(16, 185, 129, 0), 0 10px 20px rgba(16, 185, 129, 0.2);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0), 0 10px 20px rgba(16, 185, 129, 0.2);
    }
  }

  /* Main Setup Card - Extremely glassmorphic dark container from screenshot */
  .setup-content {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 24px;
    padding: 48px;
    box-shadow: 
      0 24px 60px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
    min-height: 400px;
    transition: all 0.3s ease;
  }

  .step-content h2 {
    font-size: 26px;
    font-weight: 800;
    color: #ffffff;
    margin: 0 0 8px 0;
    letter-spacing: -0.5px;
  }

  .step-description {
    font-size: 15px;
    color: rgba(255, 255, 255, 0.5);
    margin: 0 0 32px 0;
  }

  /* Form Fields - Sleek capsule inputs */
  .form-group {
    margin-bottom: 24px;
    position: relative;
  }

  .form-group label {
    display: block;
    font-size: 12px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }

  .input-with-icon {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-icon-wrapper {
    position: absolute;
    left: 18px;
    color: rgba(255, 255, 255, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    transition: color 0.3s;
  }

  .form-group input[type="text"],
  .form-group input[type="email"],
  .form-group input[type="tel"],
  .form-group input[type="password"],
  .form-group textarea {
    width: 100%;
    padding: 14px 20px 14px 48px;
    border: 1.5px solid rgba(255, 255, 255, 0.1);
    border-radius: 30px; /* Capsule shape inputs to match mockup */
    font-size: 14px;
    color: #ffffff;
    background: rgba(255, 255, 255, 0.04);
    transition: all 0.3s ease;
  }

  .form-group textarea {
    padding: 14px 20px 14px 48px;
    border-radius: 20px;
  }

  .form-group input::placeholder,
  .form-group textarea::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  .form-group input:hover,
  .form-group textarea:hover {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.07);
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #10b981;
    background: rgba(255, 255, 255, 0.06);
    box-shadow: 
      0 0 0 4px rgba(16, 185, 129, 0.18),
      0 10px 15px rgba(0, 0, 0, 0.2);
  }

  .form-group input:focus + .input-icon-wrapper,
  .form-group input:focus ~ .input-icon-wrapper {
    color: #10b981;
  }

  /* Form validation error styling */
  .form-group input.has-error,
  .form-group textarea.has-error {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.15) !important;
  }

  .form-group input.has-error ~ .input-icon-wrapper,
  .form-group textarea.has-error ~ .input-icon-wrapper {
    color: #ef4444 !important;
  }

  .error-text {
    font-size: 11px;
    color: #ef4444;
    margin-top: 6px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* Prevent browser autofill from turning input background solid white */
  .form-group input:-webkit-autofill,
  .form-group input:-webkit-autofill:hover, 
  .form-group input:-webkit-autofill:focus, 
  .form-group input:-webkit-autofill:active {
    -webkit-background-clip: text;
    -webkit-text-fill-color: #ffffff !important;
    transition: background-color 5000s ease-in-out 0s;
    box-shadow: inset 0 0 20px 20px rgba(11, 19, 41, 0.6) !important;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  /* File Upload Area */
  .file-upload-card {
    border: 2px dashed rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    padding: 30px;
    background: rgba(255, 255, 255, 0.02);
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: 100%;
  }

  .file-upload-card:hover {
    border-color: #10b981;
    background: rgba(16, 185, 129, 0.04);
    transform: translateY(-1px);
  }

  .file-upload-icon {
    font-size: 36px;
    color: rgba(255, 255, 255, 0.4);
    transition: color 0.3s;
  }

  .file-upload-card:hover .file-upload-icon {
    color: #10b981;
  }

  .file-upload-card input[type="file"] {
    display: none;
  }

  .file-upload-text {
    font-size: 14px;
    font-weight: 600;
    color: #cbd5e1;
    margin: 0;
  }

  .file-upload-text span {
    color: #10b981;
    text-decoration: underline;
  }

  .file-upload-hint {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    margin: 0;
  }

  .file-uploaded-preview {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    margin-top: 10px;
    width: 100%;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
  }

  .file-preview-thumbnail {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    object-fit: cover;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .file-preview-info {
    flex: 1;
    text-align: left;
  }

  .file-preview-name {
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
    margin: 0;
    word-break: break-all;
  }

  .file-preview-size {
    font-size: 11px;
    color: #cbd5e1;
    margin: 0;
  }

  .btn-remove-file {
    padding: 6px;
    background: transparent;
    border: none;
    color: #ef4444;
    cursor: pointer;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }

  .btn-remove-file:hover {
    background: rgba(239, 68, 68, 0.1);
  }

  /* Preset Colors */
  .preset-colors {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;
  }

  .preset-color-btn {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    border: 2.5px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
  }

  .preset-color-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
  }

  .preset-color-btn.active {
    border-color: #ffffff;
    transform: scale(1.05);
  }

  .preset-color-btn.active::after {
    content: '✓';
    color: white;
    font-size: 14px;
    font-weight: bold;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-shadow: 0 1px 2px rgba(0,0,0,0.4);
  }

  .color-picker-wrapper {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
  }

  .color-picker-input {
    width: 56px;
    height: 44px;
    padding: 0;
    border: 1.5px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    cursor: pointer;
    background: transparent;
  }

  .color-picker-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .color-picker-label {
    font-size: 11px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
  }

  .color-picker-hex {
    font-size: 14px;
    font-weight: 700;
    color: #ffffff;
  }

  /* Confirm Step Section */
  .confirm-section {
    margin-bottom: 28px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 24px;
  }

  .confirm-section h3 {
    font-size: 15px;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 16px 0;
    padding-bottom: 8px;
    border-bottom: 1.5px solid rgba(255, 255, 255, 0.1);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .confirm-item {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .confirm-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .confirm-label {
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
  }

  .confirm-value {
    color: #ffffff;
    font-weight: 600;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .color-preview {
    width: 20px;
    height: 20px;
    border-radius: 6px;
    border: 1.5px solid rgba(255, 255, 255, 0.15);
  }

  /* Success Done Screen */
  .done-step {
    text-align: center;
    padding: 40px 20px;
  }

  .success-checkmark-wrapper {
    width: 90px;
    height: 90px;
    margin: 0 auto 28px;
    position: relative;
  }

  .success-checkmark-circle {
    stroke-dasharray: 166;
    stroke-dashoffset: 166;
    stroke-width: 2.5;
    stroke-miterlimit: 10;
    stroke: #10b981;
    fill: none;
    animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
  }

  .success-checkmark-check {
    transform-origin: 50% 50%;
    stroke-dasharray: 48;
    stroke-dashoffset: 48;
    stroke: #10b981;
    stroke-width: 3.5;
    fill: none;
    animation: stroke 0.35s cubic-bezier(0.65, 0, 0.45, 1) 0.7s forwards;
  }

  @keyframes stroke {
    100% {
      stroke-dashoffset: 0;
    }
  }

  .done-step h2 {
    color: #10b981;
    font-size: 28px;
    font-weight: 800;
    margin: 0 0 8px 0;
  }

  .done-step p {
    color: #cbd5e1;
    font-size: 15px;
    margin: 0 0 32px 0;
  }

  .btn-dashboard {
    padding: 14px 36px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;
    border-radius: 30px; /* Capsule shape */
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.25);
  }

  .btn-dashboard:hover {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(16, 185, 129, 0.35);
  }

  /* Setup Actions Footer */
  .setup-actions {
    display: flex;
    justify-content: space-between;
    margin-top: 36px;
    position: relative;
    z-index: 10;
  }

  .btn-back {
    padding: 12px 28px;
    background: rgba(255, 255, 255, 0.05);
    color: #cbd5e1;
    border: 1.5px solid rgba(255, 255, 255, 0.15);
    border-radius: 30px; /* Capsule back button */
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .btn-back:hover {
    border-color: rgba(255, 255, 255, 0.25);
    color: #ffffff;
    background: rgba(255, 255, 255, 0.1);
    transform: translateX(-2px);
  }

  .btn-next {
    padding: 12px 32px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%); /* Official green gradient next button */
    color: white;
    border: none;
    border-radius: 30px; /* Capsule next button */
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .btn-next:hover {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(16, 185, 129, 0.35);
  }

  /* Theme Toggle Buttons styling */
  .theme-toggle-btn, .theme-toggle-floating {
    background: rgba(255, 255, 255, 0.05);
    border: 1.5px solid rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
    border-radius: 12px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }

  .theme-toggle-btn:hover, .theme-toggle-floating:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.3);
    color: #ffffff;
    transform: translateY(-2px) scale(1.05);
  }

  .theme-toggle-floating {
    position: absolute;
    top: 24px;
    right: 24px;
    z-index: 100;
  }

  /* Light Theme overrides */
  &.theme-light {
    background: linear-gradient(135deg, #f0fdf4 0%, #e6f9ed 50%, #f0fdf4 100%);
    color: #1e293b;

    .logo-text {
      color: #0f172a;
    }

    .sparkle {
      color: #059669;
      filter: drop-shadow(0 0 6px rgba(5, 150, 105, 0.45));
    }

    .welcome-card, .setup-content {
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border: 1px solid rgba(16, 185, 129, 0.25);
      box-shadow: 
        0 30px 60px rgba(16, 185, 129, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.65);
    }

    .welcome-subtitle {
      color: #475569;
    }

    .welcome-illustration {
      background: rgba(16, 185, 129, 0.04);
      border: 1px solid rgba(16, 185, 129, 0.1);
    }

    .illustration-label {
      color: #334155;
    }

    .welcome-text h2 {
      color: #0f172a;
    }

    .welcome-text p {
      color: #334155;
    }

    .setup-header {
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(16, 185, 129, 0.18);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
    }

    .step-indicator {
      &.active {
        .step-number {
          background: rgba(16, 185, 129, 0.06);
          border-color: #059669;
          color: #059669;
          box-shadow: 
            0 10px 20px rgba(16, 185, 129, 0.12),
            0 0 0 5px rgba(16, 185, 129, 0.1);
        }
        .step-title {
          color: #0f172a;
        }
      }
      &.completed {
        .step-number {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-color: #10b981;
          color: #ffffff;
        }
        .step-title {
          color: #059669;
        }
      }
      .step-number {
        background: #ffffff;
        border: 2px solid #cbd5e1;
        color: #64748b;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.03);
      }
      .step-title {
        color: #64748b;
      }
    }

    .step-indicators::before {
      background: #e2e8f0;
    }

    .step-content h2 {
      color: #0f172a;
    }

    .step-description {
      color: #475569;
    }

    .form-group label {
      color: #475569;
    }

    .form-group input[type="text"],
    .form-group input[type="email"],
    .form-group input[type="tel"],
    .form-group input[type="password"],
    .form-group textarea {
      border-color: #cbd5e1;
      color: #0f172a;
      background: #ffffff;
    }

    .form-group input::placeholder,
    .form-group textarea::placeholder {
      color: #94a3b8;
    }

    .form-group input:hover,
    .form-group textarea:hover {
      border-color: #94a3b8;
      background: #f8fafc;
    }

    .form-group input:focus,
    .form-group textarea:focus {
      border-color: #10b981;
      background: #ffffff;
      box-shadow: 
        0 0 0 4px rgba(16, 185, 129, 0.15),
        0 10px 15px rgba(0, 0, 0, 0.05);
    }

    .form-group input:focus + .input-icon-wrapper,
    .form-group input:focus ~ .input-icon-wrapper {
      color: #059669;
    }

    .input-icon-wrapper {
      color: #64748b;
    }

    .form-group input:-webkit-autofill,
    .form-group input:-webkit-autofill:hover, 
    .form-group input:-webkit-autofill:focus, 
    .form-group input:-webkit-autofill:active {
      -webkit-text-fill-color: #0f172a !important;
      box-shadow: inset 0 0 20px 20px #ffffff !important;
    }

    .file-upload-card {
      border-color: #cbd5e1;
      background: #ffffff;
    }

    .file-upload-card:hover {
      border-color: #10b981;
      background: #f0fdf4;
    }

    .file-upload-icon {
      color: #64748b;
    }

    .file-upload-text {
      color: #334155;
    }

    .file-upload-hint {
      color: #64748b;
    }

    .file-uploaded-preview {
      background: #ffffff;
      border-color: #cbd5e1;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.04);
    }

    .file-preview-name {
      color: #0f172a;
    }

    .file-preview-size {
      color: #64748b;
    }

    .btn-remove-file {
      background: #fee2e2;
      color: #ef4444;
    }

    .btn-remove-file:hover {
      background: #fca5a5;
    }

    .color-picker-wrapper {
      background: #ffffff;
      border-color: #cbd5e1;
    }

    .color-picker-input {
      border-color: #cbd5e1;
    }

    .color-picker-label {
      color: #64748b;
    }

    .color-picker-hex {
      color: #0f172a;
    }

    .confirm-section {
      background: #ffffff;
      border-color: #cbd5e1;
    }

    .confirm-section h3 {
      color: #0f172a;
      border-bottom-color: #cbd5e1;
    }

    .confirm-item {
      border-bottom-color: #f1f5f9;
    }

    .confirm-label {
      color: #475569;
    }

    .confirm-value {
      color: #0f172a;
    }

    .done-step p {
      color: #475569;
    }

    .btn-back {
      background: #ffffff;
      color: #475569;
      border-color: #cbd5e1;
    }

    .btn-back:hover {
      border-color: #94a3b8;
      color: #0f172a;
      background: #f8fafc;
    }

    .theme-toggle-btn, .theme-toggle-floating {
      background: rgba(0, 0, 0, 0.03);
      border-color: rgba(0, 0, 0, 0.08);
      color: #475569;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

    .theme-toggle-btn:hover, .theme-toggle-floating:hover {
      background: rgba(0, 0, 0, 0.06);
      border-color: rgba(0, 0, 0, 0.15);
      color: #0f172a;
    }

    .step-content > div[style*="borderTop"] {
      border-top-color: #e2e8f0 !important;
    }

    .step-content h3[style*="color"] {
      color: #475569 !important;
    }
  }

  &.theme-dark {
    .step-content > div[style*="borderTop"] {
      border-top-color: rgba(255, 255, 255, 0.12) !important;
    }

    .step-content h3[style*="color"] {
      color: rgba(255, 255, 255, 0.45) !important;
    }
  }

  @media (max-width: 768px) {
    .step-indicators {
      gap: 10px;
    }
    .step-indicator {
      width: 60px;
    }
    .step-number {
      width: 38px;
      height: 38px;
    }
    .step-title {
      display: none;
    }
    .step-indicators::before,
    .step-indicators-progress {
      top: 19px;
    }
    .form-row {
      grid-template-columns: 1fr;
    }
    .setup-content {
      padding: 28px;
    }
  }
`;
