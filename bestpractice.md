# React Best Practices Guide for AI Code Generation

This guide provides a structured, repeatable framework for generating React applications. It emphasizes functional components, TypeScript for type safety, modular architecture, and minimal dependencies. Code should be declarative, immutable where possible, and optimized for readability and scalability. Assume Vite for setup (faster than CRA). Use ESLint + Prettier for enforcement. Generate code with consistent naming: PascalCase for components, camelCase for variables/functions, kebab-case for files/folders.

## Prerequisites
- Node.js ≥18.
- Yarn or npm (prefer Yarn for speed).
- Basic ES6+ knowledge.
- TypeScript enabled by default.

## Project Setup
1. Initialize with Vite:
   ```
   yarn create vite my-app --template react-ts
   cd my-app
   yarn
   yarn dev
   ```
2. Install core dependencies:
   ```
   yarn add react-router-dom @types/react-router-dom
   yarn add -D @vitejs/plugin-react eslint prettier eslint-config-prettier eslint-plugin-react eslint-plugin-react-hooks @typescript-eslint/eslint-plugin @typescript-eslint/parser
   ```
3. Configure ESLint (`.eslintrc.js`):
   ```js
   module.exports = {
     extends: [
       'eslint:recommended',
       'plugin:react/recommended',
       'plugin:react-hooks/recommended',
       '@typescript-eslint/recommended',
       'prettier',
     ],
     parser: '@typescript-eslint/parser',
     plugins: ['react', '@typescript-eslint'],
     rules: {
       'react/react-in-jsx-scope': 'off',
       'react/prop-types': 'off',
     },
     settings: { react: { version: 'detect' } },
   };
   ```
4. Configure Prettier (`.prettierrc`):
   ```json
   {
     "semi": true,
     "trailingComma": "es5",
     "singleQuote": true,
     "printWidth": 80,
     "tabWidth": 2
   }
   ```
5. Add scripts to `package.json`:
   ```json
   {
     "scripts": {
       "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
       "lint:fix": "prettier --write . && eslint . --ext ts,tsx --fix",
       "type-check": "tsc --noEmit"
     }
   }
   ```
6. Run `yarn lint:fix` after generation.

## Project Structure
Maintain a flat, feature-based structure for scalability. Avoid deep nesting.

```
src/
├── components/          # Reusable UI components (e.g., Button.tsx)
│   └── ui/              # Atomic components (Button, Input)
├── features/            # Feature modules (group related components, hooks, types)
│   └── auth/            # Example: AuthForm.tsx, useAuth.ts, auth.types.ts
├── hooks/               # Custom hooks (useFetch.ts)
├── lib/                 # Utilities (api.ts, constants.ts)
├── pages/               # Route-level components (HomePage.tsx)
├── types/               # Global types (global.d.ts)
├── utils/               # Helpers (formatDate.ts)
├── App.tsx
├── main.tsx
├── routes.tsx           # Centralized routes
└── vite-env.d.ts
```

- **Rules**: One file per component/hook. Co-locate tests (e.g., Button.test.tsx). Use index.ts for barrel exports in folders.

## Core Principles
- **Functional Components Only**: No classes.
- **TypeScript Everywhere**: Define interfaces for props, state, API responses.
- **Immutability**: Use `...spread` for updates; avoid mutating props/state.
- **Single Responsibility**: Components <200 lines; extract sub-components.
- **Accessibility**: Add `aria-*` attributes; use semantic HTML.
- **Error Boundaries**: Wrap app in a global error boundary.
- **Naming**: Descriptive, no abbreviations (e.g., `userProfile` not `up`).

## Components
- Use FC<Props> from React.
- Destructure props inline.
- Default props via defaults in destructuring.
- Example:
  ```tsx
  import React, { FC } from 'react';

  interface ButtonProps {
    variant?: 'primary' | 'secondary';
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
  }

  const Button: FC<ButtonProps> = ({ variant = 'primary', onClick, children, disabled = false }) => (
    <button
      className={`btn btn-${variant} ${disabled ? 'btn-disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={typeof children === 'string' ? children : undefined}
    >
      {children}
    </button>
  );

  export default Button;
  ```

## Props and State
- **Props**: Typed interfaces. Use `React.FC` for type inference.
- **State**: Prefer `useState` for local; `useReducer` for complex logic.
- **Context**: For global state (e.g., theme, auth). Avoid overusing.
- Example useReducer:
  ```tsx
  import { useReducer, createContext, useContext } from 'react';

  interface State { count: number; }
  interface Action { type: 'increment' | 'decrement'; }

  const reducer = (state: State, action: Action): State => {
    switch (action.type) {
      case 'increment': return { ...state, count: state.count + 1 };
      case 'decrement': return { ...state, count: state.count - 1 };
      default: return state;
    }
  };

  const CounterContext = createContext<{ state: State; dispatch: React.Dispatch<Action> } | undefined>(undefined);

  export const useCounter = () => {
    const context = useContext(CounterContext);
    if (!context) throw new Error('useCounter must be used within CounterProvider');
    return context;
  };
  ```

## Hooks
- Custom hooks for logic reuse (prefix `use`).
- Follow Rules of Hooks: Only in components/custom hooks.
- Memoize callbacks/selectors with `useCallback`/`useMemo`.
- Example data fetching hook:
  ```tsx
  import { useState, useEffect } from 'react';

  interface UseFetchProps<T> { url: string; }
  interface ApiResponse<T> { data: T | null; loading: boolean; error: string | null; }

  export const useFetch = <T>({ url }: UseFetchProps<T>): ApiResponse<T> => {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const fetchData = async () => {
        try {
          setLoading(true);
          const res = await fetch(url);
          if (!res.ok) throw new Error('Fetch failed');
          const json = await res.json();
          setData(json);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, [url]);

    return { data, loading, error };
  };
  ```

- For complex state: Use Zustand or Jotai (lightweight). Install if needed: `yarn add zustand`.

## Routing
- Use React Router v6+.
- Centralized in `routes.tsx`:
  ```tsx
  import { createBrowserRouter, RouterProvider } from 'react-router-dom';
  import HomePage from './pages/HomePage';
  import NotFound from './pages/NotFound';

  const router = createBrowserRouter([
    { path: '/', element: <HomePage /> },
    { path: '*', element: <NotFound /> },
  ]);

  export default function Routes() {
    return <RouterProvider router={router} />;
  }
  ```
- In `App.tsx`: `<Routes />` wrapped in providers.
- Use `useParams`, `useNavigate` for logic.

## Styling
- Prefer CSS Modules for scoped styles (no external libs unless specified).
- File: `Button.module.css`.
- Example:
  ```css
  /* Button.module.css */
  .btn { padding: 0.5rem 1rem; border: none; border-radius: 4px; }
  .btnPrimary { background: blue; color: white; }
  .btnDisabled { opacity: 0.5; cursor: not-allowed; }
  ```
  ```tsx
  import styles from './Button.module.css';

  // In component: className={`${styles.btn} ${styles[`btn${capitalize(variant)}`]} ${disabled ? styles.btnDisabled : ''}`}
  ```
- For utility-first: Tailwind (add via `yarn add -D tailwindcss postcss autoprefixer; npx tailwindcss init -p`).
- Avoid inline styles.

## Data Fetching and API
- Use `useFetch` hook above for simple cases.
- For caching/mutations: React Query (`yarn add @tanstack/react-query`).
- Centralize API in `lib/api.ts` with Axios or fetch wrapper.
- Handle loading/error states uniformly.
- Optimistic updates for UX.

## Testing
- Use React Testing Library + Jest (Vite includes).
- Test behavior, not implementation.
- Example:
  ```tsx
  import { render, screen, fireEvent } from '@testing-library/react';
  import Button from './Button';

  test('renders button and calls onClick', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  ```
- Aim for 80% coverage; test components, hooks.

## Performance
- Memoize: `React.memo` for components; `useMemo` for values; `useCallback` for functions.
- Lazy load: `React.lazy` + `Suspense` for routes/code-split.
- Virtualize lists with `react-window` if >100 items.
- Avoid unnecessary re-renders: Stable deps in effects/callbacks.

## Error Handling
- Global Error Boundary:
  ```tsx
  import { Component, ErrorInfo, ReactNode } from 'react';

  interface Props { children: ReactNode; }
  interface State { hasError: boolean; }

  class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) { super(props); this.state = { hasError: false }; }

    static getDerivedStateFromError(): State { return { hasError: true }; }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
      console.error('Uncaught error:', error, errorInfo);
    }

    render() {
      if (this.state.hasError) return <h1>Something went wrong.</h1>;
      return this.props.children;
    }
  }
  ```
- Wrap `<App />` in `main.tsx`.

## Deployment
- Build: `yarn build`.
- Preview: `yarn preview`.
- Host on Vercel/Netlify (auto-deploys from Git).
- Env vars: Use `VITE_` prefix in `.env`.

## Summary of AI-Optimized Patterns
- **Generation Flow**: Start with structure → types → components → hooks → integration → tests.
- **Consistency Checks**: Run `yarn type-check && yarn lint` post-generation.
- **Scalability**: Feature folders for modularity; extract shared logic to hooks/lib.
- **Minimalism**: No fluff imports; tree-shake unused code.
- **Edge Cases**: Always handle loading, error, empty states in UI.

Follow this blueprint verbatim for consistent, production-ready React apps. Adapt only for project-specific requirements (e.g., add Redux if state >3 contexts).