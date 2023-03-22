import { CreatePaletteMode } from "./Options";
import { RgbColor, RgbColorData } from "./RgbColor";

export type ColorQuantizeFunction = (image: ImageData, numberOfColors: number) => RgbColorData[];

export function getColorQuantizeFunction(
    mode: CreatePaletteMode | undefined,
    palette: RgbColorData[] | null = null
): ColorQuantizeFunction {
    switch (mode) {
        case CreatePaletteMode.GENERATE:
            return (imageData, numberOfColors) => generatePalette(numberOfColors);
        case CreatePaletteMode.SAMPLE:
            return samplePaletteRandom;
        case CreatePaletteMode.PALETTE:
            if(!palette || palette.length === 0){
                throw new Error('No color palette in options but mode is set to palette')
            }
            return (imageData, numberOfColors) => palette.map(RgbColor.fromRgbColorData);
        case CreatePaletteMode.SCAN:
        default:
            return samplePaletteDeterministic;
    }
}

/**
 * Generating a palette with given number of colors
 */
function generatePalette(numberOfColors: number): RgbColor[] {

    if (numberOfColors < 8) {
        return generateGrayscalePalette(numberOfColors);
    }
    return generateColorCubePalette(numberOfColors)
}

function generateColorCubePalette(numberOfColors: number): RgbColor[] {
    const palette = [] as RgbColor[]

    const colorsPerEdge = Math.floor(Math.pow(numberOfColors, 1 / 3)) // Number of points on each edge on the RGB color cube
    const colorStep = Math.floor(255 / (colorsPerEdge - 1)) // distance between points

    for (let numReds = 0, r = 0; numReds < colorsPerEdge; numReds++, r += colorStep) {
        for (let numGreens = 0, g = 0; numGreens < colorsPerEdge; numGreens++, g += colorStep) {
            for (let numBlues = 0, b = 0; numBlues < colorsPerEdge; numBlues++, b += colorStep) {
                palette.push(new RgbColor(r, g, b));
            }
        }
    }

    const numRandomColors = numberOfColors - palette.length;
    for (let i = 0; i < numRandomColors; i++) {
        palette.push(RgbColor.createRandomColor());
    }

    return palette;
}

function generateGrayscalePalette(numberOfColors: number): RgbColor[] {
    const palette: RgbColor[] = []

    const grayStep = Math.floor(255 / (numberOfColors - 1));

    for (let i = 0; i < numberOfColors; i++) {
        const shade = i * grayStep;
        const color = new RgbColor(shade, shade, shade);
        palette.push(color);
    }
    return palette
}

/**
 * Sampling a palette from imagedata
 */
function samplePaletteRandom(imageData: ImageData, numColors: number): RgbColor[] {
    const palette: RgbColor[] = [];
    const numberOfPixels = imageData.data.length / 4;

    for (let numberOfTries = 4 * numColors; numberOfTries > 0; numberOfTries--) {

        const idx = Math.floor(Math.random() * numberOfPixels);
        const color = RgbColor.fromPixelArray(imageData.data, idx);
        if (palette.some(paletteColor => paletteColor.equals(color))) {
            continue;
        }
        palette.push(color);

        if (palette.length === numColors) {
            break;
        }
    }

    return palette;
}


/**
 * Get palette colors through deterministic sampling.
 * 
 * Steps through the image along a rectangular grid.
 */
function samplePaletteDeterministic(imageData: ImageData, numColors: number): RgbColor[] {
    const palette: RgbColor[] = [];
    const stepsPerRow = Math.ceil(Math.sqrt(numColors));
    const stepSizeX = imageData.width / (stepsPerRow + 1);
    const stepSizeY = imageData.height / (stepsPerRow + 1);
    for (let stepY = 1; stepY <= stepsPerRow; stepY++) {
        const widthOffset = stepY * stepSizeY * imageData.width;

        for (let stepX = 1; stepX <= stepsPerRow; stepX++) {
            const pixelIndex = Math.floor(widthOffset + (stepX * stepSizeX));
            const color = RgbColor.fromPixelArray(imageData.data, pixelIndex);
            if (palette.some(paletteColor => color.equals(paletteColor))) {
                continue;
            }
            palette.push(color);
            if (palette.length === numColors) {
                break;
            }
        }
    }
    return palette;
}
