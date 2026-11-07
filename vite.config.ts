import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { outDir: "dist" },
  define: {
    // Số phiên bản lấy từ package.json; số build là github.run_number do CI truyền vào (khớp tên bản trên Releases)
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD__: JSON.stringify(process.env.BUILD_NUMBER ?? ""),
  },
});
