import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import dts from "rollup-plugin-dts";
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const baseFile = 'src/index.ts';

const baseModuleConfig = {
  input: baseFile,
  plugins: [
    nodeResolve({
      browser: true,
    }),
    commonjs(),
    typescript(),
    /*
    terser({
      sourceMap: {
        includeSources: true
      }
    }),
    */
  ],
};

const config = defineConfig([
  {
    ...baseModuleConfig,
    output: {
      file: 'dist/image-tracer-browser.mjs',
      format: 'esm',
      sourcemap: true,
    },
  }, {
    ...baseModuleConfig,
    output: {
      file: 'dist/image-tracer-browser.js',
      format: 'iife',
      name: 'ImageTracerBrowser',
      sourcemap: true,
    },
  }, {
    input: 'src/index.ts',
    plugins: [dts({ outDir: '../lib/' })],
    output: {
      file: 'dist/image-tracer-browser.d.ts',
      format: 'es'
    },
  }
]);

/*
{
    input: 'src/index.ts',
    plugins: [
      nodeResolve({
        browser: true,
      }),
      commonjs(),
      typescript(),
      terser({sourceMap: {
        includeSources: true
      }}),
    ],
    output: {
      file: 'dist/image-tracer-browser.js',
      format: 'iife',
      name: 'ImageTracerBrowser',
      //format: 'cjs',
      sourcemap: true,
    },
  }
*/
export default config;