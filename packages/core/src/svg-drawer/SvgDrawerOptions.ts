
export enum TrimMode {
    OFF = 'off',
    KEEP_RATIO = 'ratio',
    ALL = 'all',
}

export enum FillStyle {
    FILL = 'fill',
    STROKE = 'stroke',
    STROKE_FILL = 'stroke+fill',
}

export interface SvgDrawerOptions{
    
    /**
     * Stroke width written to SVG path.
     */
    strokeWidth: number,

    /**
     * Do not draw lines (areas with less than 3 points).
     */
    lineFilter: boolean,

    /**
     * Multiply all coordinates by this number.
     */
    scale: number,

    /**
     * Number of decimal places in svg values 
     */
    decimalPlaces: number,

    /**
     * If enabled, the viewBox attribute will be set on the SVG tag element.
     */
    viewBox: boolean,

    /**
     * Enables control output, draws white dots with given radius at segment borders.
     */
    segmentEndpointRadius: number,

    /**
     * Enables control output, draws curve control points as cyan dots with given radius.
     */
    curveControlPointRadius: number,
    
    /**
     * Stroke, fill, or stroke + fill
     */
    fillStyle: FillStyle

    /**
     * Removes empty border from the image.
     */
    trim: TrimMode,

    // Debug
    desc: boolean, // add a `desc` attribute to SVG edges

    verbose?: boolean,
}

export const SvgDrawerDefaultOptions: SvgDrawerOptions = {
    strokeWidth: 1,
    lineFilter: false,
    scale: 1,
    decimalPlaces: 1,
    viewBox: true,
    desc: false,
    segmentEndpointRadius: 0,
    curveControlPointRadius: 0,
    fillStyle: FillStyle.STROKE_FILL,
    trim: TrimMode.OFF,
}