// Build du 2e widget de soumission (refonte). Même sources partagées (lib/, data/, services/),
// entrée séparée (index-soumission2.html → src/s2/) et sortie dans le projet zet soumission2/.
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
    outDir: "soumission2/app",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "index-soumission2.html"),
    },
  },
  plugins: [
    react(),
    {
      // vite écrit `index-soumission2.html` — zet attend `index.html` à la racine de app/
      name: "s2-renommer-index",
      closeBundle() {
        const dir = path.resolve(__dirname, "soumission2/app");
        const src = path.join(dir, "index-soumission2.html");
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
