# GitHub Copilot Coding Instructions (Next.js)

Follow these rules when generating or editing code in this repository:

1. File & Component Naming
    - Each React component file must export exactly one component as its default export.
    - The filename (PascalCase) must exactly match the component name (e.g., Button.tsx exports default function Button()).
    - For route segments in app/ (Next.js App Router), use folder + page.tsx/layout.tsx conventions; still keep component names matching their purpose (e.g., Page, Layout).

2. Component Structure
    - One top-level component per file; small internal helper functions are allowed but no extra exported React components.
    - Prefer function components with named function syntax over anonymous arrow default exports.

3. Imports & Exports
    - Default export only for the main component.
    - No wildcard ( * ) imports.
    - Maintain sorted imports: React/next, third-party libs, absolute app imports, relative imports. Group with blank lines.

4. Styling
    - Prefer CSS Modules or Tailwind (if configured) over inline styles.
    - Class name constants go above the component.

5. Props
    - Define a Props interface/type directly above the component.
    - Destructure props in the function signature.
    - Avoid using any; use explicit types or generics.

6. Hooks & Logic
    - Place all hooks at the top of the component.
    - Extract non-UI logic into /lib when reusable.

7. Server vs Client
    - Default to server components. Add "use client" only when required (state, effects, browser APIs).

8. Files & Organization
    - Co-locate component-specific tests (Component.test.tsx) and stories (Component.stories.tsx) next to the component file.
    - Do not place multiple component variants in one file—create separate files.

9. Async & Data
    - Use async server components or route handlers for data fetching.
    - For client fetching, use SWR or React Query (if configured), not manual fetch in useEffect unless necessary.

10. Accessibility & Semantics
     - Use semantic HTML tags.
     - Always provide alt text for images, aria-* where needed.

11. Error & Loading UI
     - Use Next.js loading.tsx and error.tsx per segment where appropriate; do not inline large loading states into page components.

12. Testing
     - Export only the component; test via public interface.
     - Avoid implementation-detail selectors; prefer role/text.

13. Performance
     - Avoid unnecessary client components.
     - Use React.lazy or dynamic() only when code splitting is justified.
     - Memoize expensive calculations (useMemo/useCallback) only when profiled need exists.

14. Lint & Format
     - Assume ESLint + Prettier; do not disable rules unless justified with a comment.

15. Comments
     - Keep comments concise; prefer self-expressive code over comments.

If a user request conflicts with these rules, explain the conflict before proceeding.

End of instructions.