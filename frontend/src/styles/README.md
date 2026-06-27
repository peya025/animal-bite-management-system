# Frontend styling

The application uses MUI's theme system as its styling foundation.

## Rules

- Preserve the existing design while migrating styles.
- Use `sx` for short, one-off declarations.
- Use a colocated `*.styles.ts` file with MUI `styled` for reusable elements,
  pseudo states, and complex responsive styling.
- Add shared colors, typography, spacing, radii, and shadows to `theme.ts` only
  when a migrated component consumes them.
- Keep `index.css` for truly global browser and root rules only.
- Do not add new page- or component-specific CSS files.
- Delete an existing CSS file only after its whole surface has passed visual
  parity checks at 375, 768, 1024, and 1440 pixels.

`CssBaseline` is intentionally deferred until the existing global reset has
been audited visually. Enabling it prematurely could change current rendering.
