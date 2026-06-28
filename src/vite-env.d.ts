/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NEBIUS_API_KEY: string
  readonly VITE_SIA_GATEWAY: string
  readonly VITE_MESHY_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
