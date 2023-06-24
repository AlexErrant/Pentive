import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-minification";
import copy from "rollup-plugin-copy";

import pkg from "./package.json";

export default {
  name: "prosemirror-image-plugin",
  input: "src/index.ts",
  output: [
    {
      file: pkg.main,
      format: "cjs",
    },
    { file: pkg.module, format: "es" },
  ],
  external: [...Object.keys(pkg.dependencies || {})],
  plugins: [
    copy({
      targets: [{ src: "src/styles/**/*", dest: "dist/styles" }],
    }),
    typescript(),
    terser(),
  ],
  sourcemap: true,
};
