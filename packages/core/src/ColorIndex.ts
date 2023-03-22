import { ColorQuantizeFunction } from "./color-quantize-functions"
import { ImageBlurrer } from "./image-processing/ImageBlurrer"
import { Options } from "./Options"
import { ColorCounts, RgbColor } from "./RgbColor"

export enum ColorDistanceBuffering {
    OFF = 'off',
    ON = 'on',
    REASONABLE = 'reasonable'
}

type ImageColorIndex = number[][]

export class ColorIndex {

    rows: ImageColorIndex // palette color index for each pixel in the image
    palette: RgbColor[]
    options: Options
    verbose: boolean

    public constructor(
        imageData: ImageData,
        options: Options,
        quantizeFunction: ColorQuantizeFunction
    ) {
        this.options = options
        this.verbose = options.verbose ?? false;

        this.palette = this.buildPalette(imageData, quantizeFunction);

        this.verbose && console.time(' - Color Quantization');
        this.rows = this.buildColorData(imageData, this.palette)
        this.verbose && console.timeEnd(' - Color Quantization');
    }

    /**
     * @param imageData 
     * @returns 
     */
    protected buildPalette(imageData: ImageData, quantizeFunction: ColorQuantizeFunction): RgbColor[] {
        const numberOfColors = Math.max(this.options.numberOfColors, 2);
        const palette = quantizeFunction(imageData, numberOfColors);
        if (this.options.verbose) {
            console.log(`Created palette with ${palette.length} colors.`);
        }
        return palette.map(c => (c instanceof RgbColor) ? c : RgbColor.fromRgbColorData(c));
    }

    /**
     * Using a form of k-means clustering repeated options.colorClusteringCycles times. http://en.wikipedia.org/wiki/Color_quantization
     * 
     * 
     * @param imageData 
     * @returns 
     */
    protected buildColorData(
        imageData: ImageData,
        palette: RgbColor[]
    ): ImageColorIndex {

        let imageColorIndex !: ImageColorIndex;

        const numberOfCycles = Math.max(this.options.colorClusteringCycles, 1);

        for (let cycle = 1; cycle <= numberOfCycles; cycle++) {
            const isLastCycle = cycle === numberOfCycles;
            const nextImageColorIndex = this.runClusteringCycle(imageData, palette, isLastCycle)
            const isFinished = isLastCycle || (imageColorIndex && this.colorIndexesEqual(imageColorIndex, nextImageColorIndex))
            imageColorIndex = nextImageColorIndex
            if (isFinished) {
                this.options.verbose && console.log(`Ran ${cycle} clustering cycles`)
                break
            }
        }

        return imageColorIndex;
    }

    protected runClusteringCycle(
        imageData: ImageData,
        palette: RgbColor[],
        isLastCycle: boolean,
    ): ImageColorIndex {
        const colorIndex = this.buildImageColorIndex(imageData, palette);
        const colorCounts = this.buildColorCounts(imageData, colorIndex, palette.length);
        const numPixels = imageData.width * imageData.height
        this.adjustPaletteToColorAverages(palette, colorCounts, numPixels, isLastCycle);

        return colorIndex
    }

    protected colorIndexesEqual(i1: ImageColorIndex, i2: ImageColorIndex): boolean {
        if (i1.length !== i2.length) {
            return false
        }
        for (let rowIx = 0; rowIx < i1.length; rowIx++) {
            const row1 = i1[rowIx]
            const row2 = i2[rowIx]
            if (row1.length !== row2.length) {
                return false
            }
            for (let colIx = 0; colIx < row1.length; colIx++) {
                if (row1[colIx] !== row2[colIx]) {
                    return false
                }
            }
        }
        return true
    }


    protected adjustPaletteToColorAverages(palette: RgbColor[], colorCounters: ColorCounts, numPixels: number, isLastCycle: boolean) {
        for (let k = 0; k < palette.length; k++) {

            const counter = colorCounters[k]

            const colorBelowThreshold = this.options.minColorQuota > 0 && counter.n / numPixels < this.options.minColorQuota
            if (colorBelowThreshold && !isLastCycle) {
                palette[k].randomize();
            } else if (counter.n > 0) {
                palette[k].setFromColorCounts(counter);
            }
        }
    }

    /**
     * Maps each pixel in the image to the palette index of the closest color. 
     *  
     * @param imageData 
     * @param palette 
     * @returns 
     */
    protected buildImageColorIndex(imageData: ImageData, palette: RgbColor[]): ImageColorIndex {
        const bufferingMode = this.options.colorDistanceBuffering
        const useBuffer = bufferingMode === ColorDistanceBuffering.ON ||
            (bufferingMode === ColorDistanceBuffering.REASONABLE && palette.length >= 32)

        return useBuffer ?
            this.buildImageColorIndexBuffered(imageData, palette) :
            this.buildImageColorIndexUnbuffered(imageData, palette)
            ;
    }

    protected buildImageColorIndexUnbuffered(imageData: ImageData, palette: RgbColor[]): ImageColorIndex {
        const imageColorIndex = this.initColorIndexArray(imageData.width, imageData.height);

        for (let h = 0; h < imageData.height; h++) {
            for (let w = 0; w < imageData.width; w++) {
                const pixelOffset = (h * imageData.width + w) * 4;
                const closestColorIx = this.findClosestPaletteColorIx(imageData, pixelOffset, palette);
                imageColorIndex[h + 1][w + 1] = closestColorIx;
            }
        }

        return imageColorIndex;
    }

    protected buildImageColorIndexBuffered(imageData: ImageData, palette: RgbColor[]): ImageColorIndex {
        const imageColorIndex = this.initColorIndexArray(imageData.width, imageData.height);
        const closestColorMap: number[] = [];
        let skips = 0, distinctValues = 0;
        for (let h = 0; h < imageData.height; h++) {
            for (let w = 0; w < imageData.width; w++) {
                const pixelOffset = (h * imageData.width + w) * 4;
                const colorId = this.getPixelColorId(imageData, pixelOffset)

                if (closestColorMap[colorId] !== undefined) {
                    skips++
                } else {
                    closestColorMap[colorId] = this.findClosestPaletteColorIx(imageData, pixelOffset, palette);
                    distinctValues++
                }
                imageColorIndex[h + 1][w + 1] = closestColorMap[colorId];
            }
        }
        this.verbose && console.log(`Buffered ${distinctValues} colors to skip ${skips} comparisons (`, Math.round(100 * skips / (skips + distinctValues)), '%)')
        return imageColorIndex;
    }

    protected getPixelColorId(imageData: ImageData, pixelOffset: number) {
        return ((imageData.data[pixelOffset] << 24)
            | (imageData.data[pixelOffset + 1] << 16)
            | (imageData.data[pixelOffset + 2] << 8)
            | (imageData.data[pixelOffset + 3])
        ) >>> 0;
    }


    protected initColorIndexArray(imgWidth: number, imgHeight: number): ImageColorIndex {

        const imageColorIndex: ImageColorIndex = []
        for (let h = 0; h < imgHeight + 2; h++) {
            imageColorIndex[h] = new Array(imgWidth + 2).fill(-1);
        }
        return imageColorIndex
    }

    protected buildColorCounts(imageData: ImageData, imageColorIndex: ImageColorIndex, numberOfColors: number): ColorCounts {
        const colorCounts: ColorCounts = this.initColorCounts(numberOfColors);

        for (let h = 0; h < imageData.height; h++) {
            for (let w = 0; w < imageData.width; w++) {
                const closestColorIx = imageColorIndex[h + 1][w + 1];
                const colorCounter = colorCounts[closestColorIx];
                const pixelOffset = (h * imageData.width + w) * 4;
                colorCounter.r += imageData.data[pixelOffset];
                colorCounter.g += imageData.data[pixelOffset + 1];
                colorCounter.b += imageData.data[pixelOffset + 2];
                colorCounter.a += imageData.data[pixelOffset + 3];
                colorCounter.n++;
            }
        }
        return colorCounts;
    }

    protected initColorCounts(numberOfColors: number): ColorCounts {
        const colorCounts: ColorCounts = [];
        for (let i = 0; i < numberOfColors; i++) {
            colorCounts[i] = { r: 0, g: 0, b: 0, a: 0, n: 0 };
        }
        return colorCounts;
    }

    /**
     * find closest color from palette by measuring (rectilinear) color distance between this pixel and all palette colors
     * @param palette 
     * @param color 
     * @param pixelOffset 
     * @returns 
     */
    protected findClosestPaletteColorIx(imageData: ImageData, pixelOffset: number, palette: RgbColor[]): number {
        let closestColorIx = 0;
        let closestDistance = 1024; // 4 * 256 is the maximum RGBA distance

        for (let colorIx = 0; colorIx < palette.length; colorIx++) {

            const color = palette[colorIx];
            const distance = color.calculateDistanceToPixelInArray(imageData.data, pixelOffset);

            if (distance >= closestDistance) {
                continue
            }
            closestDistance = distance;
            closestColorIx = colorIx;
        }
        return closestColorIx;
    }
}
