// Build du widget « Bon de travail ». Même sources partagées (lib/, data/, services/),
// entrée séparée (index-bt.html → src/bt/) et sortie dans le projet zet bontravail/.
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
    outDir: "bontravail/app",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "index-bt.html"),
    },
  },
  plugins: [
    react(),
    {
      // vite écrit `index-bt.html` — zet attend `index.html` à la racine de app/
      name: "bt-renommer-index",
      closeBundle() {
        const dir = path.resolve(__dirname, "bontravail/app");
        const src = path.join(dir, "index-bt.html");
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
