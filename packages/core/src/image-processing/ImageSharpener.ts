const sharpenKernel = [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0],
]

export function sharpen(imageData: ImageData, threshold: number) {
    const applicator = new ConvolutionApplicator(sharpenKernel)
    return applicator.apply(imageData, threshold)
}


export class ConvolutionApplicator {
    protected kernel: number[][]
    protected kernelWeight: number

    constructor(kernel: number[][]) {
        this.kernel = kernel
        this.kernelWeight = kernel.flat().reduce((sum, v) => sum + v, 0)
    }

    apply(imageData: ImageData, threshold: number): ImageData {
        const res = new Uint8ClampedArray(4 * imageData.width * imageData.height);

        for (let rowIx = 0; rowIx < imageData.height; rowIx++) {
            for (let colIx = 0; colIx < imageData.width; colIx++) {
                this.applyKernelToPixel(imageData, colIx, rowIx, res)
            }
        }

        this.applyThreshold(imageData, res, threshold)

        return {
            width: imageData.width,
            height: imageData.height,
            colorSpace: imageData.colorSpace,
            data: res,
        }
    }

    applyKernelToPixel(
        image: ImageData,
        x: number,
        y: number,
        target: Uint8ClampedArray
    ): void {

        const radius = Math.floor(this.kernel.length / 2)
        const pixelIx = (y * image.width + x) * 4

        for (let channelIx = 0; channelIx < 4; channelIx++) {
            let channelValue = 0
            let weight = 0
            for (let rowOffset = -radius; rowOffset <= radius; rowOffset++) {
                if (y + rowOffset < 0 || y + rowOffset >= image.height) {
                    continue
                }
                for (let colOffset = -radius; colOffset <= radius; colOffset++) {
                    if (x + colOffset < 0 || x + colOffset >= image.width) {
                        continue
                    }
                    const ix = ((y + rowOffset) * image.width + (x + colOffset)) * 4 + channelIx
                    const kernelValue = this.kernel[rowOffset + radius][colOffset + radius]
                    channelValue += image.data[ix] * kernelValue
                    weight += kernelValue
                }
            }
            if (weight !== this.kernelWeight) {
                channelValue *= (this.kernelWeight === 0) ? 0 : (weight / this.kernelWeight)
            }

            target[pixelIx + channelIx] = channelValue
        }
    }

    applyThreshold(
        image: ImageData,
        target: Uint8ClampedArray,
        threshold: number
    ): void {
        if (threshold <= 0 || threshold === 1 || threshold >= 1024) {
            return
        }
        threshold = (threshold < 1) ? 1024 * threshold : threshold
        for (let ix = 0; ix < image.data.length; ix += 4) {
            let diff = 0
            for (let channelIx = ix; channelIx < ix + 4; channelIx++) {
                diff += Math.abs(image.data[channelIx] - target[channelIx])
            }
            if (diff <= threshold) {
                continue
            }
            for (let channelIx = ix; channelIx < ix + 4; channelIx++) {
                target[channelIx] = image.data[channelIx]
            }
        }
    }
}