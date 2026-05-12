import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // Pas de dossier "publicDir" séparé (on n'a pas besoin d'assets statiques à copier)
  publicDir: false,

  // En développement : proxy les appels /api vers Express (port 3000)
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // Build de production → dist/ (Express servira ce dossier)
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
