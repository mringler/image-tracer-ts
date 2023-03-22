import { ColorDistanceBuffering } from "./ColorIndex";
import { InterpolationMode } from "./PointInterpolator";
import { RgbColorData } from "./RgbColor"
import { SvgDrawerDefaultOptions, SvgDrawerOptions } from "./svg-drawer/SvgDrawerOptions"

export { InterpolationMode, RgbColorData, SvgDrawerOptions, SvgDrawerDefaultOptions }

export interface Options extends BaseOptions, SvgDrawerOptions { }

export enum CreatePaletteMode {
    GENERATE = 'generate',
    SAMPLE = 'sample',
    SCAN = 'scan',
    PALETTE = 'palette',
}

export enum LayeringMode {
    SEQUENTIAL = 1,
    PARALLEL = 2,
}

export interface BaseOptions {
    /**
     * Line tracer error margin.
     * Gives the squared maximum distance a point can be off a trajectory to be
     * still put on a line.
     * 
     * Default: 1
     */
    lineErrorMargin: number,

    /**
     * Curve tracer error margin.
     * Gives the squared maximum distance a point can be off a trajectory to be
     * still put on a curve.
     * 
     * Default: 1
     */
    curveErrorMargin: number,


    /**
     * Sets interpolation mode.
     */
    interpolation: InterpolationMode,

    /**
     * Do not interpolate right angles.
     * 
     * A right angle consists of five points on an outline: the corner point
     * and two adjacent edge points in either direction.
     * 
     * Default: true
     */
    enhanceRightAngles: boolean,

    /**
     * Areas on the image with an outline of less than the given number of
     * points will be discarded.
     */
    minShapeOutline: number,


    // Color quantization

    /**
     * CreatePaletteMode.GENERATE: Generate colors along the spectrum independent of image colors.
     * CreatePaletteMode.SAMPLE: Randomly access image for colors.
     * CreatePaletteMode.SCAN: Step through the image along a raster.
     */
    colorSamplingMode: CreatePaletteMode,

    /**
     * Use custom palette
     */
    palette?: RgbColorData[] | null,

    /**
     * Number of colors in the palette.
     * 
     * CreatePaletteMode.GENERATE:
     *  - uses grayscale if less than 8 colors
     *  - otherwise number of points on color cube
     * 
     * CreatePaletteMode.SAMPLE:
     *  - number of random samples (can give same color)
     * 
     * CreatePaletteMode.SCAN:
     *  - defines step width of scanner
     *  - stop scanning when given number of colors are found
     * 
     * Colors will be adjusted during color clustering.
     * 
     * Default: 16
     */
    numberOfColors: number,

    /**
     * Number of color clustering cycles. 
     */
    colorClusteringCycles: number,


    /**
     * Buffers color distances during clustering.
     * 
     * Buffering is very efficient when working with larger palettes sizes
     * (more than 30 colors). On smaller palettes, building the buffer is more
     * expensive than what is saved.
     * The number of distinct colors in the image determines the buffer size
     * and number of skipped calculations.
     * 
     * Unless buffering causes issues, the default setting of `reasonable
     * should be fine.    
     */
    colorDistanceBuffering: ColorDistanceBuffering,

    /**
     * Threshold for color pruning during color clustering.
     * 
     * If ratio between pixels of a color and all pixels is below the given
     * number, the color will be replaced by a random color.
     */
    minColorQuota: number,

    // Layering method

    /**
     * Used for old debug output.
     */
    layeringMode: LayeringMode,

    // Blur

    /**
     * Disabled below 1, capped at 5
     */
    blurRadius: number,

    /**
     * Maximum allowed difference between original pixel and blurred pixel when summing up RGBA values.
     * If a blurred pixel exceeds delta, the original pixel is used instead.
     */
    blurDelta: number,

    /**
     * Sharpen pixels
     */
    sharpen: boolean,

    /**
     * Maximum allowed difference between original pixel and sharpened pixel when summing up RGBA values.
     * If a sharpened pixel exceeds threshold, the original pixel is used instead.
     */
    sharpenThreshold: number,

    // TODO move
    layerContainerId?: string, // id of HTML element where edge rasters should be rendered to

    /**
     * Write status data to console during trace.
     */
    verbose?: boolean,
}

export namespace Options {
    /**
     * Create full options object from partial
     */
    export function buildFrom(options: Partial<Options> | null): Options {
        return Object.assign({}, defaultOptions, options ?? {});
    }

    const defaultOptions: Options = Object.assign(SvgDrawerDefaultOptions, {

        // Tracing
        lineErrorMargin: 1,
        curveErrorMargin: 1,
        minShapeOutline: 8,
        enhanceRightAngles: true,

        // Color quantization
        colorSamplingMode: CreatePaletteMode.SCAN,
        palette: null,
        numberOfColors: 16,
        minColorQuota: 0,
        colorClusteringCycles: 3,
        colorDistanceBuffering: ColorDistanceBuffering.REASONABLE,

        // Layering method
        layeringMode: LayeringMode.PARALLEL,

        interpolation: InterpolationMode.INTERPOLATE,

        // Blur
        blurRadius: 0,
        blurDelta: 20,

        sharpen: false,
        sharpenThreshold: 20,

    })

    const asPresets = <T extends Record<string,Partial<Options>>>(o: T): Readonly<{[K in keyof T]: T[K]}> => o

    export const Presets = asPresets({
       default: defaultOptions,
       posterized1: { colorSamplingMode: CreatePaletteMode.GENERATE, numberOfColors: 2},
       posterized2: { numberOfColors: 4, blurRadius: 5 },
       curvy: { lineErrorMargin: 0.01, lineFilter: true, enhanceRightAngles: false },
       sharp: { curveErrorMargin: 0.01, lineFilter: false },
       detailed: { minShapeOutline: 0, decimalPlaces: 2, lineErrorMargin: 0.5, curveErrorMargin: 0.5, numberOfColors: 64 },
       smoothed: { blurRadius: 5, blurDelta: 64 },
       grayscale: { colorSamplingMode: CreatePaletteMode.GENERATE, colorClusteringCycles: 1, numberOfColors: 7 },
       fixedpalette: { colorSamplingMode: CreatePaletteMode.GENERATE, colorClusteringCycles: 1, numberOfColors: 27 },
       randomsampling1: { colorSamplingMode: CreatePaletteMode.SAMPLE, numberOfColors: 8 },
       randomsampling2: { colorSamplingMode: CreatePaletteMode.SAMPLE, numberOfColors: 64 },
       artistic1: { colorSamplingMode: CreatePaletteMode.GENERATE, colorClusteringCycles: 1, minShapeOutline: 0, blurRadius: 5, blurDelta: 64, lineErrorMargin: 0.01, lineFilter: true, numberOfColors: 16, strokeWidth: 2 },
       artistic2: { curveErrorMargin: 0.01, colorSamplingMode: CreatePaletteMode.GENERATE, colorClusteringCycles: 1, numberOfColors: 4, strokeWidth: 0 },
       artistic3: { curveErrorMargin: 10, lineErrorMargin: 10, numberOfColors: 8 },
       artistic4: { curveErrorMargin: 10, lineErrorMargin: 10, numberOfColors: 64, blurRadius: 5, blurDelta: 256, strokeWidth: 2 },
       posterized3: {
            lineErrorMargin: 1, curveErrorMargin: 1, minShapeOutline: 20, enhanceRightAngles: true, colorSamplingMode: CreatePaletteMode.GENERATE, numberOfColors: 3,
            minColorQuota: 0, colorClusteringCycles: 3, blurRadius: 3, blurDelta: 20, strokeWidth: 0, lineFilter: false,
            decimalPlaces: 1, palette: [{ r: 0, g: 0, b: 100, a: 255 }, { r: 255, g: 255, b: 255, a: 255 }]
        }
    })
}