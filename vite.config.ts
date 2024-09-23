import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { libInjectCss } from "vite-plugin-lib-inject-css";

import { extname, relative, resolve } from "path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";
import packageJson from './package.json';

const fullNameComponent = packageJson.name;
const entryPathLib = "src/lib";


// const excludeFiles = ['**/*.stories.js'];

// const filesPathToExclude = excludeFiles.map((src) => {
//   return fileURLToPath(new URL(src, import.meta.url));
// });



export default defineConfig({
  plugins: [
    dts({ include: entryPathLib }),
    libInjectCss()
  ],
  resolve: {
    alias: {
      [`@lib`]: resolve(__dirname, `./src/lib/index`),
    },
  },
  server: {
    open: true,
  },
  css: {
    modules: {
      localsConvention: 'camelCase'
    },
  },
  build: {
    copyPublicDir: false,
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, entryPathLib),
      formats: ["es"],
      name: fullNameComponent,
    },
    rollupOptions: {
      //В пакет не входит external. Пользователь сам это ставит
      external: [
        "react/jsx-runtime",
        ...Object.keys(packageJson.dependencies),
        ...Object.keys(packageJson.devDependencies),
      ], 
      input: Object.fromEntries(
        glob
          .sync(entryPathLib + "/**/*.{ts,tsx}")
          .map((file) => [relative(entryPathLib, file.slice(0, file.length - extname(file).length)), fileURLToPath(new URL(file, import.meta.url))])
      ),
      output: {
        // inlineDynamicImports: false,
        assetFileNames: ({originalFileName, name}) => {
          
          if(originalFileName){
            const itemsPath = originalFileName.replace('src/lib/', '').split('/');
            const currentPath =  itemsPath.slice(0, itemsPath.length - 1).join('/');
            return `${currentPath}/${name}`;
          }
          return "";
        },
        entryFileNames: "[name].js",
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          "styled-components": "styled"
        }
      },
    },
  },
});
