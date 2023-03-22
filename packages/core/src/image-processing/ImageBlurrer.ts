
// Gaussian kernels for blur
const GAUSSIAN_KERNELS = [
    [0.27901, 0.44198, 0.27901],
    [0.135336, 0.228569, 0.272192, 0.228569, 0.135336],
    [0.086776, 0.136394, 0.178908, 0.195843, 0.178908, 0.136394, 0.086776],
    [0.063327, 0.093095, 0.122589, 0.144599, 0.152781, 0.144599, 0.122589, 0.093095, 0.063327],
    [0.049692, 0.069304, 0.089767, 0.107988, 0.120651, 0.125194, 0.120651, 0.107988, 0.089767, 0.069304, 0.049692],
]
export class ImageBlurrer {

    // Selective Gaussian blur for preprocessing
    public static blur(imageData: ImageData, radius: number, delta: number): ImageData {

        radius = Math.floor(radius);
        if (radius < 1) {
            return imageData;
        }

        if (radius > 5) {
            radius = 5;
        }

        delta = Math.abs(delta);
        if (delta > 1024) {
            delta = 1024;
        }

        const kernel = GAUSSIAN_KERNELS[radius - 1];
        const output = {
            width: imageData.width,
            height: imageData.height,
            colorSpace: imageData.colorSpace,
            data: new Uint8ClampedArray(imageData.width * imageData.height * 4)
        };

        ImageBlurrer.blurHorizontally(imageData, radius, kernel, output.data)
        ImageBlurrer.blurVertically(output, radius, kernel)
        ImageBlurrer.checkDelta(imageData, output.data, delta)

        return output;
    }

    protected static blurHorizontally(imageData: ImageData, radius: number, kernel: number[], target: Uint8ClampedArray) {
        for (let rowIx = 0; rowIx < imageData.height; rowIx++) {
            for (let colIx = 0; colIx < imageData.width; colIx++) {
                const pixelId = rowIx * imageData.width + colIx

                let racc = 0, gacc = 0, bacc = 0, aacc = 0, wacc = 0;
                // gauss kernel loop
                for (let r = -radius; r <= radius; r++) {
                    if ((colIx + r < 0) || (colIx + r >= imageData.width)) {
                        continue
                    }
                    // add weighted color values
                    const idx = (pixelId + r) * 4;
                    const ratio = kernel[r + radius]
                    racc += imageData.data[idx + 0] * ratio;
                    gacc += imageData.data[idx + 1] * ratio;
                    bacc += imageData.data[idx + 2] * ratio;
                    aacc += imageData.data[idx + 3] * ratio;
                    wacc += ratio;
                }
                // The new pixel
                const idx = pixelId * 4;
                target[idx + 0] = Math.floor(racc / wacc);
                target[idx + 1] = Math.floor(gacc / wacc);
                target[idx + 2] = Math.floor(bacc / wacc);
                target[idx + 3] = Math.floor(aacc / wacc);
                const r = target[idx + 0]
            }
        }
    }

    protected static blurVertically(image: ImageData, radius: number, kernel: number[]) {
        // work on copy
        const inputData = new Uint8ClampedArray(image.data);

        // vertical blur
        for (let rowIx = 0; rowIx < image.height; rowIx++) {
            for (let colIx = 0; colIx < image.width; colIx++) {

                let racc = 0, gacc = 0, bacc = 0, aacc = 0, wacc = 0;

                for (let r = -radius; r <= radius; r++) {
                    const rowOffset = rowIx + r
                    if ((rowOffset < 0) || (rowOffset >= image.height)) {
                        continue
                    }
                    const idx = (rowOffset * image.width + colIx) * 4;
                    const ratio = kernel[r + radius]
                    racc += inputData[idx + 0] * ratio;
                    gacc += inputData[idx + 1] * ratio;
                    bacc += inputData[idx + 2] * ratio;
                    aacc += inputData[idx + 3] * ratio;
                    wacc += ratio;
                }
                // The new pixel
                const idx = (rowIx * image.width + colIx) * 4;
                image.data[idx + 0] = Math.floor(racc / wacc);
                image.data[idx + 1] = Math.floor(gacc / wacc);
                image.data[idx + 2] = Math.floor(bacc / wacc);
                image.data[idx + 3] = Math.floor(aacc / wacc);
            }

        }
    }

    protected static checkDelta(original: ImageData, target: Uint8ClampedArray, delta: number){
        for (let rowIx = 0; rowIx < original.height; rowIx++) {
            for (let colIx = 0; colIx < original.width; colIx++) {

                const idx = (rowIx * original.width + colIx) * 4;

                // d is the difference between the blurred and the original pixel
                const d = Math.abs(target[idx + 0] - original.data[idx + 0])
                    + Math.abs(target[idx + 1] - original.data[idx + 1])
                    + Math.abs(target[idx + 2] - original.data[idx + 2])
                    + Math.abs(target[idx + 3] - original.data[idx + 3]);

                // selective blur: if d>delta, put the original pixel back
                if (d > delta) {
                    target[idx + 0] = original.data[idx];
                    target[idx + 1] = original.data[idx + 1];
                    target[idx + 2] = original.data[idx + 2];
                    target[idx + 3] = original.data[idx + 3];
                }
            }
        }
    }
}