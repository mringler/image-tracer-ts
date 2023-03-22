export namespace ImageToRgba{
    export function process(imageData: ImageData, isVerbose = false): ImageData {
        if (isRgba(imageData)) {
            return imageData;
        }

        isVerbose && console.log('Transforming image data from RGB to RGBA')

        const numPixels = imageData.width * imageData.height;
        const rgbaSize = numPixels * 4;
        const rgbaData = new Uint8ClampedArray(rgbaSize);

        for (let pixelIx = 0; pixelIx < numPixels; pixelIx++) {
            const dataPixelOffset = pixelIx * 3;
            const rgbaPixelOffset = pixelIx * 4;
            rgbaData[rgbaPixelOffset + 0] = imageData.data[dataPixelOffset + 0];
            rgbaData[rgbaPixelOffset + 1] = imageData.data[dataPixelOffset + 1];
            rgbaData[rgbaPixelOffset + 2] = imageData.data[dataPixelOffset + 2];
            rgbaData[rgbaPixelOffset + 3] = 255;
        }
        return {
            width: imageData.width,
            height: imageData.height,
            colorSpace: imageData.colorSpace,
            data: rgbaData
        }
    }

    function isRgba(imageData: ImageData): boolean {
        const numPixels = imageData.width * imageData.height;
        const rgbaSize = numPixels * 4;

        return imageData.data.length >= rgbaSize;
    }
}