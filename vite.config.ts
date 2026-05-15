import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL || "https://diaydeyqbcseufpbwpki.supabase.co";
  const supabasePublishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpYXlkZXlxYmNzZXVmcGJ3cGtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NTEzOTgsImV4cCI6MjA4OTAyNzM5OH0.ifIgZSZDTCB8eWdYLeQCjeizbWNbpaZi7K2CwzEIdaM";

  return {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(env.VITE_SUPABASE_PROJECT_ID || "diaydeyqbcseufpbwpki"),
    },
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
  };
});
