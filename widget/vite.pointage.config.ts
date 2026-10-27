// Build du widget « Pointage » (déclaration des temps). Mêmes sources partagées
// (services/), entrée séparée (index-pointage.html → src/pointage/) et sortie dans le
// projet zet pointage/.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

export default defineConfig({
  base: "./",
  // horodatage de build injecté dans le bundle : permet de savoir, depuis Creator,
  // QUELLE version du widget est réellement déployée (bandeau « build … »).
  define: {
    __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC"),
  },
  build: {
    outDir: "pointage/app",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "index-pointage.html"),
    },
  },
  plugins: [
    react(),
    {
      // vite écrit `index-pointage.html` — zet attend `index.html` à la racine de app/
      name: "pointage-renommer-index",
      closeBundle() {
        const dir = path.resolve(__dirname, "pointage/app");
        const src = path.join(dir, "index-pointage.html");
        if (fs.existsSync(src)) fs.renameSync(src, path.join(dir, "index.html"));
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
