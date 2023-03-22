
export type RgbColorData = { r: number, g: number, b: number, a?: number }
export namespace RgbColorData {
    export function toString(c: RgbColorData): string {
        return `RgbColor(${c.r},${c.g},${c.b})`;
    }
}

export type RgbColorCounter = RgbColorData & { a: number, n: number }
export type ColorCounts = RgbColorCounter[]

export class RgbColor implements RgbColorData {
    /**
     * If the `a` value is below this value, a color is considered invisible.
     */
    static readonly MINIMUM_A = 13; // that is 0.05

    public constructor(
        public r = 0,
        public g = 0,
        public b = 0,
        public a = 255
    ) { }

    public static fromRgbColorData(c: RgbColorData) {
        return new RgbColor(c.r, c.g, c.b, c.a ?? 255);
    }

    public static createRandomColor() {
        const color = new RgbColor();
        color.randomize();
        return color;
    }

    public static fromPixelArray(pixelData: ArrayLike<number>, pixelIndex: number, isRgba = true) {
        const color = new RgbColor();
        color.setFromPixelArray(pixelData, pixelIndex, isRgba);
        return color;
    }

    public static fromHex(hex: string) {
        const values = hex.substring(1).match(/.{1,2}/g)?.map(n => parseInt(n, 16)) as number[];
        return RgbColor.fromPixelArray(values, 0, values.length > 3)
    }

    public static buildColorAverage(counter: RgbColorCounter) {
        const r = Math.floor(counter.r / counter.n);
        const g = Math.floor(counter.g / counter.n);
        const b = Math.floor(counter.b / counter.n);
        const a = Math.floor(counter.a / counter.n);

        return new RgbColor(r, g, b, a);
    }

    public isInvisible(): boolean {
        return this.a < RgbColor.MINIMUM_A;
    }

    public hasOpacity(): boolean {
        return this.a < 255;
    }

    public setFromColorCounts(counter: RgbColorCounter) {
        this.r = Math.floor(counter.r / counter.n)
        this.g = Math.floor(counter.g / counter.n)
        this.b = Math.floor(counter.b / counter.n)
        this.a = Math.floor(counter.a / counter.n)
    }

    public randomize() {
        this.r = Math.floor(Math.random() * 256);
        this.g = Math.floor(Math.random() * 256);
        this.b = Math.floor(Math.random() * 256);
        this.a = Math.floor(Math.random() * 128) + 128;
    }

    public setFromPixelArray(pixelData: ArrayLike<number>, pixelIndex: number, isRgba = true) {
        const pixelWidth = isRgba ? 4 : 3;
        const offset = pixelIndex * pixelWidth;
        this.r = pixelData[offset + 0];
        this.g = pixelData[offset + 1];
        this.b = pixelData[offset + 2];
        this.a = isRgba ? pixelData[offset + 3] : 255;
    }

    get [Symbol.toStringTag]() {
        return `RgbaColor(${this.r},${this.g},${this.b},${this.a})`;
    }

    public calculateDistanceToPixelInArray(pixelData: ArrayLike<number>, pixelIndex: number, isRgba = true): number {
        const a = isRgba ? pixelData[pixelIndex + 3] : 255;

        // In my experience, https://en.wikipedia.org/wiki/Rectilinear_distance works better than https://en.wikipedia.org/wiki/Euclidean_distance
        return Math.abs(this.r - pixelData[pixelIndex])
            + Math.abs(this.g - pixelData[pixelIndex + 1])
            + Math.abs(this.b - pixelData[pixelIndex + 2])
            + Math.abs(this.a - a)
            ;
    }

    public equals(color: RgbColorData): boolean {
        return this.r === color.r
            && this.g === color.g
            && this.b === color.b
            && this.a === (color.a ?? 255)
    }

    public toCssColor(): string {
        return !this.hasOpacity() ? `rgb(${this.r},${this.g},${this.b})` : `rgba(${this.r},${this.g},${this.b},${this.a})`;
    }

    public toCssColorHex(): `#${number}` {
        const int = this.toInt32()
        let hex = int.toString(16)
        const leadingZeros = (this.hasOpacity() ? 8 : 6) - hex.length
        if (leadingZeros > 0) {
            hex = '0'.repeat(leadingZeros) + hex;
        }
        return '#' + hex.toUpperCase() as `#${number}`;
    }

    public toInt32(): number {
        if(!this.hasOpacity()){
            return ((this.r << 16) | (this.g << 8) | (this.b )) >>> 0 // keep unsigned
        }
        return ((this.r << 24) | (this.g << 16) | (this.b << 8) | this.a) >>> 0 // keep unsigned
    }
}