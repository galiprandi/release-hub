/// <reference types="vite/client" />

// Used by api.ts and seki.ts via import.meta.env.VITE_SEKI_API_URL
export interface ImportMetaEnv {
	readonly VITE_SEKI_API_URL: string;
}
