# Animal Bite Management & Monitoring System - Login Pages

Professional login pages have been created for both the web and mobile applications with a mint green color scheme.

## 🎨 Color Palette

- **Primary Mint Green**: `#10b981`
- **Light Mint**: `#d1fae5`
- **Dark Mint**: `#059669`
- **Light Gradient**: `#6ee7b7`

## Web App (React/TypeScript)

### Location
- **Component**: `frontend/src/pages/Login.tsx`
- **Styles**: `frontend/src/styles/Login.css`

### Features
- Professional two-column layout (sidebar + login form)
- Email validation
- Password input field
- Error message display
- Responsive design (mobile, tablet, desktop)
- Loading state
- Forgotten password link
- Feature highlights section

### How to Use
The login page is already integrated into the app. Run the development server:

```bash
cd frontend
npm install
npm run dev
```

The login page will be displayed at `http://localhost:5173`

### Customization
To integrate with your backend API, update the fetch call in `Login.tsx`:
```typescript
const response = await fetch('/api/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, password }),
});
```

## Mobile App (Flutter)

### Location
- **Screen**: `mobile/lib/screens/login_screen.dart`
- **Colors**: Defined directly in the LoginScreen class (lines 16-18)

### Features
- Material 3 design
- Email validation
- Password visibility toggle
- Error message display
- Loading indicator during login
- Key features section in a highlighted box
- Mint green gradient background
- Responsive layout for all screen sizes

### How to Use
The login screen is already set as the home page. Run the app:

```bash
cd mobile
flutter pub get
flutter run
```

### Customization
To integrate with your backend API, update the `_handleLogin()` method in `login_screen.dart` (lines 38-57):

```dart
Future<void> _handleLogin() async {
  // Replace the simulated API call with your actual backend
  final response = await http.post(
    Uri.parse('YOUR_API_BASE_URL/api/login'),
    body: {
      'email': _emailController.text,
      'password': _passwordController.text,
    },
  );
  // Handle response...
}
```

## Responsive Design

### Web App
- **Desktop**: Full two-column layout with sidebar info
- **Tablet (768px)**: Single column, hides sidebar
- **Mobile (480px)**: Optimized font sizes and spacing

### Mobile App
- Automatically adapts to all screen sizes
- Safe area padding for notches and status bars

## Form Validation

### Both Apps
- **Email**: Required, must match email format
- **Password**: Required, minimum 6 characters (web), any length (mobile)

## Integration TODO

1. **Backend Connection**
   - Update API endpoint URLs
   - Implement token storage (localStorage for web, secure storage for mobile)
   - Add proper error handling

2. **Navigation**
   - Add routing after successful login
   - Implement forgot password flow
   - Add sign up page

3. **Security**
   - Add CSRF token handling
   - Implement proper session management
   - Add 2FA support (optional)

## API Endpoint Expected Format

### Request
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Success Response (200 OK)
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name",
    "role": "admin"
  }
}
```

### Error Response (401 Unauthorized)
```json
{
  "error": "Invalid credentials"
}
```

---

**Created**: 2024
**System**: Animal Bite Management & Monitoring System
**Color Scheme**: Mint Green
