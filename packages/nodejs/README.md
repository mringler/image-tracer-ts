# @image-tracer-ts/nodejs

Trace images into SVG in nodejs.

![alt Bitmap to Svg](https://raw.githubusercontent.com/jankovicsandras/imagetracerjs/HEAD/docimages/s1.png)

Adds nodejs-specific convenience methods to [@image-tracer-ts/core](https://www.npmjs.com/package/@image-tracer-ts/core) to load data from different image types (PNG, JPEG, etc.) and locations (mainly filenames), as well as command line support.

Provides ESM and CJS packages.

A similar package is available for browser usage in [@image-tracer-ts/browser](https://www.npmjs.com/package/@image-tracer-ts/browser).

---

## Basic Usage


```
import { ImageTracerNodejs } from '@image-tracer-ts/nodejs' 
const svgString = ImageTracerNodejs.fromFileName(
  fileName: string,
  options: Partial<ImageTracerNodejsOptions> | null = null,
  drawer: ImageDrawer<string> | null = null
): Promise<void>
```

### CLI

To trace images from the command line, run the `.cjs` module with a path to an image along with the desired options (prefixed with `--`): 
```
$ node ./packages/nodejs/dist/image-tracer-nodejs.cjs ./image.png --out image.svg --fillStyle stroke
```

---

## Options

For tracer options see [@image-tracer-ts/core](https://www.npmjs.com/package/@image-tracer-ts/core).

When passed as command line parameter, options have to be prefixed with `--` (i.e. `--blurRadius 5`).

Package specific options:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| output | `png`  \| `svg` \| `(png\|svg)[]` | `svg` | Output file type |
| out | string | input file name | Output filename (file type extension will be added if necessary) |
| preset | Preset name from core package | `null` | Use a named preset | 
