<!-- @source: dog-frontier/phase-2 -->
<!-- @phase: design-system -->
<!-- @date: 2026-06-30 -->
<!-- @based_on: dog-diary -->
<!-- @design_system_version: 1.0.0 -->

# Dog-Diary Design System

## 1. Style

```yaml
style:
  primary: quiet productivity workbench
  secondary: editorial notes
  mode: light
  source_skills:
    - dog-frontier
```

## 2. Colors

```yaml
colors:
  bg_primary: { hex: "#F7F7F2", token: "--color-bg" }
  bg_secondary: { hex: "#FFFFFF", token: "--color-panel" }
  accent_primary: { hex: "#0F766E", token: "--color-accent" }
  accent_secondary: { hex: "#B45309", token: "--color-amber" }
  text_primary: { hex: "#171717", token: "--color-text" }
  text_secondary: { hex: "#5F6268", token: "--color-muted" }
  semantic:
    success: { hex: "#15803D", token: "--color-success" }
    error: { hex: "#B42318", token: "--color-error" }
    warning: { hex: "#A16207", token: "--color-warning" }
```

## 3. Typography

```yaml
typography:
  display: { family: "Geist", weight: "600", source: "next/font" }
  body: { family: "Geist", weight: "400;500;600", source: "next/font" }
  mono: { family: "Geist Mono", weight: "400;500", source: "next/font" }
```

## 4. Effects

```yaml
effects:
  shadows:
    panel: "0 1px 2px rgba(23, 23, 23, 0.05)"
    focus: "0 0 0 3px rgba(15, 118, 110, 0.18)"
  radius:
    sm: "4px"
    md: "8px"
  motion:
    standard: "160ms ease"
```

## 5. Antipatterns

```yaml
antipatterns:
  - Avoid marketing hero layouts; the first screen must be the writing workspace.
  - Avoid decorative charts when API data is absent.
  - Avoid overwriting hand-written diary fields from automated imports.
  - Avoid oversized cards and nested card structures.
```

## 6. Iconography

```yaml
iconography:
  wrapper: "src/components/ui/icon.tsx"
  libraries:
    - name: "Font Awesome (free-solid)"
      package: "@fortawesome/free-solid-svg-icons"
      usage: "Navigation, command palette, settings, global chrome"
    - name: "lucide-react"
      usage: "Today workspace, entry detail, review pages (content-heavy areas)"
  rules:
    - "Do NOT mix FA and lucide in the same UI block (e.g., same sidebar, same button group)"
    - "All icon-only buttons MUST have aria-label"
    - "No emoji as functional icons"
    - "Use the <Icon> wrapper component; do NOT import icon libraries directly in business components"
  component_api:
    props:
      icon: "lucide-react LucideIcon (exclusive with faIcon)"
      faIcon: "FontAwesome IconDefinition (exclusive with icon)"
      size: "number (px, default 20)"
      label: "string (required for meaningful icons)"
      decorative: "boolean (hides from screen readers)"
      className: "string"
```

## 7. Component Tokens

```yaml
component_tokens:
  panel:
    bg: "var(--color-panel)"
    border: "var(--color-border)"
    radius: "var(--radius-md)"
  input:
    bg: "var(--color-panel)"
    border: "var(--color-border)"
    focus: "var(--shadow-focus)"
  button:
    bg: "var(--color-accent)"
    text: "var(--color-accent-contrast)"
    radius: "var(--radius-sm)"
```
