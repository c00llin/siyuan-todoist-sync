import { defineConfig } from "vite";
import { resolve } from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        { src: "plugin.json", dest: "./" },
        { src: "i18n/*", dest: "./i18n/" },
        { src: "README*.md", dest: "./" },
        { src: "CHANGELOG.md", dest: "./" },
        { src: "LICENSE", dest: "./" },
        { src: "icon.svg", dest: "./" },
        { src: "icon.png", dest: "./" },
        { src: "preview.png", dest: "./" },
      ],
    }),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["cjs"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: ["siyuan"],
      output: {
        entryFileNames: "[name].js",
        assetFileNames: (assetInfo) => {
          return assetInfo.name as string;
        },
      },
    },
  },
});
