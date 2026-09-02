# Credi Marketplace

Plataforma de marketplace orientada a producción para comercio electrónico, vendedores, afiliados, operaciones B2B, servicios, pagos y administración.

La aplicación está construida con:

* **Next.js 15 App Router**
* **React 19**
* **TypeScript 5**
* **Tailwind CSS 4**
* **Supabase**
* **Vercel**
* **Vitest**
* **Playwright**

El proyecto está diseñado bajo principios de seguridad server-side, mínimo privilegio, validación de entradas, Row Level Security (RLS), idempotencia y defensa en profundidad.

---

## Runtime

Versiones objetivo del proyecto alineadas con el `package.json`:

| Tecnología | Versión |
| :--- | :--- |
| **Node.js** | `>=22.0.0` LTS |
| **npm** | `10.x` |
| **Next.js** | `15.1.0` |
| **React** | `19.0.0` |
| **React DOM** | `19.0.0` |
| **TypeScript** | `5.6.3` |
| **Tailwind CSS** | `4.0.0` |

La versión de Node.js se mantiene estrictamente alineada con `.nvmrc` (Node 22 LTS) y con el entorno de CI/CD en GitHub Actions.

---

## Architecture

Credi Marketplace utiliza una arquitectura modular basada en Next.js App Router.

```text
Browser
   │
   ▼
Next.js App Router
   │
   ├── Server Components
   ├── Client Components
   ├── Server Actions / Route Handlers
   ├── Authentication
   └── Authorization
          │
          ▼
      Supabase
          │
          ├── Auth
          ├── PostgreSQL
          ├── RLS
          ├── RPC
          └── Storage
