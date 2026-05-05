import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — tiny, cached across all routes
          vendor: ["react", "react-dom", "react-router-dom"],
          // Data layer
          supabase: ["@supabase/supabase-js"],
          query: ["@tanstack/react-query"],
          // Heavy libs only loaded when their routes are visited
          maps: ["leaflet"],
          charts: ["recharts"],
          motion: ["framer-motion"],
          stripe: ["@stripe/stripe-js", "@stripe/react-stripe-js"],
          // Form utilities
          forms: ["react-hook-form", "@hookform/resolvers", "zod"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
}));
