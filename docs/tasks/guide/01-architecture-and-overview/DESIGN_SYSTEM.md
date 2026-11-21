# Design System - Mint Green Theme

## Color Palette Reference

### Primary Colors
```
Mint Primary:        #10b981 (rgb: 16, 185, 129)
Mint Dark:          #059669 (rgb: 5, 150, 105)
Mint Light:         #d1fae5 (rgb: 209, 250, 229)
Mint Gradient Light: #6ee7b7 (rgb: 110, 231, 183)
```

### Neutral Colors
```
White:              #ffffff
Gray Light:         #f3f4f6
Gray Medium:        #e5e7eb
Gray Dark:          #4b5563
```

### Status Colors
```
Error:              #ef4444
Error Light:        #fee2e2
Error Dark:         #b91c1c
```

## Typography

### Web App (React/CSS)
- Font Family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif
- Title: 28px, Bold (700)
- Subtitle: 14px, Regular
- Label: 14px, Semi-bold (600)
- Input: 16px, Regular
- Button: 16px, Semi-bold (600)

### Mobile App (Flutter)
- Font Family: System default
- Title: 28px, Bold
- Subtitle: 14px, Semi-bold (500)
- Label: 14px, Semi-bold (600)
- Body: 16px, Regular
- Small: 13px, Semi-bold (500)

## Component Styles

### Buttons
- **Background**: Gradient (Mint Primary → Mint Dark)
- **Text Color**: White
- **Padding**: 12px 24px (web), 14px 24px (mobile)
- **Border Radius**: 8px
- **Shadow**: 0 4px 12px rgba(16, 185, 129, 0.4)
- **Hover**: Slightly raised, enhanced shadow
- **Disabled**: 70% opacity, no cursor

### Input Fields
- **Background**: White
- **Border**: 2px solid #e5e7eb
- **Border Radius**: 8px
- **Padding**: 12px 16px
- **Focus Border**: Mint Primary (#10b981)
- **Focus Shadow**: 0 0 0 3px rgba(16, 185, 129, 0.1)
- **Font Size**: 16px (prevents zoom on iOS)

### Cards
- **Background**: White
- **Border Radius**: 16px
- **Shadow**: 0 20px 60px rgba(0, 0, 0, 0.15)
- **Padding**: 60px 40px (web), 32px (mobile)

### Gradient Backgrounds
- **Direction**: 135deg (top-left to bottom-right)
- **Colors**: Mint Primary (#10b981) → Mint Dark (#059669)
- **Used for**: Login page background, button backgrounds

## Logo/Icon Usage
- Icon Color: Mint Primary (#10b981)
- Icon Background Circle: Linear gradient (Mint Light → #a7f3d0)
- Icon Size: 100px (web), SVG scalable (mobile)

## Spacing Reference
```
Extra Small: 4px
Small:       8px
Medium:      12px
Large:       16px
Extra Large: 24px
Huge:        40px
```

## Border Radius
```
Small:  4px
Medium: 8px
Large:  16px
```

## Box Shadows
```
Small:   0 2px 4px rgba(0, 0, 0, 0.1)
Medium:  0 4px 12px rgba(16, 185, 129, 0.4)
Large:   0 20px 60px rgba(0, 0, 0, 0.15)
Focus:   0 0 0 3px rgba(16, 185, 129, 0.1)
```

## Responsive Breakpoints

### Web App
- Desktop: 1200px+
- Tablet: 768px - 1199px
- Mobile: Below 768px
- Small Mobile: 480px and below

### Mobile App
- Safe Area Padding: Used on all screens
- Notch Support: Automatic via SafeArea widget

## Animation Durations
- Hover Effects: 0.3s ease
- Loading: Continuous spinner
- Transitions: 0.3s cubic-bezier

## Accessibility
- Minimum contrast ratio: 4.5:1 (WCAG AA)
- Focus indicators: Visible border with shadow
- Labels: Always associated with form fields
- Button sizes: Minimum 44x44px (mobile)
- Font sizes: Minimum 16px on iOS inputs

## Usage in Code

### React/CSS
```css
:root {
  --mint-primary: #10b981;
  --mint-light: #d1fae5;
  --mint-dark: #059669;
}

/* Usage */
background: var(--mint-primary);
```

### Flutter
```dart
static const Color mintPrimary = Color(0xFF10b981);
static const Color mintLight = Color(0xFFd1fae5);
static const Color mintDark = Color(0xFF059669);

// Usage
Container(
  color: mintPrimary,
)
```

## Asset Guidelines
- Logo format: SVG (scalable)
- Icon format: SVG (scalable)
- Favicon: 32x32px PNG or ICO
- App Icon: 
  - iOS: 1024x1024px
  - Android: 192x192px minimum

---

For any design questions or updates, refer to the login page implementations:
- Web: `frontend/src/pages/Login.tsx` and `frontend/src/styles/Login.css`
- Mobile: `mobile/lib/screens/login_screen.dart`
