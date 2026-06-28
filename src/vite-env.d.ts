/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NEBIUS_API_KEY: string
  readonly VITE_NEBIUS_MODEL: string
  readonly VITE_NEBIUS_PROJECT_ID: string
  readonly VITE_NEBIUS_TENANT_USER_ID: string
  readonly VITE_NEBIUS_AI_TENANT_ID: string
  readonly VITE_INSFORGE_URL: string
  readonly VITE_INSFORGE_ANON_KEY: string
  readonly VITE_MESHY_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
