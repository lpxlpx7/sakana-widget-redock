import { defineConfig } from 'tsdown';

const shared = {
  platform: 'browser' as const,
  outDir: './lib',
  entry: './src/index.ts',
  loader: {
    '.svg': 'text' as const,
  },
};

export default defineConfig([
  {
    ...shared,
    format: {
      esm: {
        target: ['esnext'],
        css: {
          fileName: 'index.css',
          inject: true,
        },
      },
    },
  },
  {
    ...shared,
    // the umd bundle is all-in-one, including sakana-widget itself
    deps: {
      alwaysBundle: ['sakana-widget'],
      onlyBundle: ['sakana-widget'],
    },
    format: {
      umd: {
        target: ['es2021'],
        globalName: 'SakanaReDock',
        minify: true,
        css: {
          fileName: 'index.min.css',
          minify: true,
        },
      },
    },
    clean: false,
  },
]);
