import { RgbColor, RgbColorData } from "../RgbColor";
import { OutlinedArea, TraceData } from "../ImageTracer";
import { ImageDrawer } from "./ImageDrawer";
import { FillStyle, SvgDrawerDefaultOptions, SvgDrawerOptions, TrimMode } from "./SvgDrawerOptions";
import { TraceDataTrimmer } from "./TraceDataTrimmer";
import { SvgLineAttributes } from "../PathTracer";


export class SvgDrawer implements ImageDrawer<string>
{
    protected readonly options: SvgDrawerOptions;
    protected readonly useStroke: boolean;
    protected readonly useFill: boolean;

    public constructor(options: Partial<SvgDrawerOptions>) {
        this.options = Object.assign({}, SvgDrawerDefaultOptions, options);
        this.useFill = [FillStyle.FILL, FillStyle.STROKE_FILL].includes(this.options.fillStyle);
        this.useStroke = [FillStyle.STROKE, FillStyle.STROKE_FILL].includes(this.options.fillStyle);
    }


    protected fixValue(val: number): number | string {
        if (this.options.scale !== 1) {
            val *= this.options.scale
        }
        if (this.options.decimalPlaces === -1) {
            return val;
        }
        return +val.toFixed(this.options.decimalPlaces);
    }

    public draw(traceData: TraceData): string {
        this.init(traceData)

        const tags = [];
        for (let colorId = 0; colorId < traceData.areasByColor.length; colorId++) {
            for (let areaIx = 0; areaIx < traceData.areasByColor[colorId].length; areaIx++) {
                if (traceData.areasByColor[colorId][areaIx].isHole) {
                    continue;
                }
                tags.push(...this.buildSegmentTags(traceData, colorId, areaIx));
            }
        }

        if (this.options.verbose) {
            console.log(`Adding ${tags.length} <path> tags to SVG.`);
        }

        return this.buildSvgTag(traceData, tags);
    }

    public init(traceData: TraceData): void {
        if (this.options.trim !== TrimMode.OFF) {
            const strokeWidth = (this.options.fillStyle === FillStyle.FILL) ? 0 : this.options.strokeWidth
            const keepAspectRatio = this.options.trim === TrimMode.KEEP_RATIO
            TraceDataTrimmer.trim(traceData, strokeWidth, keepAspectRatio, this.options.verbose)
        }
    }

    /**
     * Builds a <path> tag for each segment.
     *
     * @param traceData 
     * @param colorId 
     * @param segmentIx 
     * @returns 
     */
    protected buildSegmentTags(traceData: TraceData, colorId: number, segmentIx: number): string[] {
        const colorSegments = traceData.areasByColor[colorId];
        const area = colorSegments[segmentIx]
        const color = traceData.colors[colorId];

        if (!this.isValidLine(color, area.lineAttributes)) {
            return [];
        }

        const tags = [];

        const desc = (this.options.desc ? this.getDescriptionAttribute(traceData, colorId, segmentIx) : '');
        const tag = this.buildPathTag(area, colorSegments, color, desc);
        tags.push(tag);

        // Rendering control points
        if (this.options.segmentEndpointRadius || this.options.curveControlPointRadius) {
            const controlPoints = this.drawControlOutput(area, colorSegments)
            tags.push(...controlPoints)
        }

        return tags;
    }

    protected isValidLine(color: RgbColor, lineAttributes: SvgLineAttributes[]): boolean {
        const passesLineFilter = !this.options.lineFilter || lineAttributes.length >= 3;
        return !color.isInvisible() && passesLineFilter
    }

    protected getDescriptionAttribute(traceData: TraceData, colorId: number, segmentIx: number): string {
        const area = traceData.areasByColor[colorId][segmentIx]

        const isHole = area.isHole ? 1 : 0
        const color = traceData.colors[colorId]
        const colorStr = `r:${color.r} g:${color.g} b:${color.b}`
        return (this.options.desc ? (`desc="colorId:${colorId} segment:${segmentIx} ${colorStr} isHole:${isHole}" `) : '');
    }

    protected buildPath(segment: OutlinedArea, colorSegments: OutlinedArea[]): string {
        const lines = segment.lineAttributes;
        const pathStr = [];

        // Creating non-hole path string
        pathStr.push('M',
            this.fixValue(lines[0].x1),
            this.fixValue(lines[0].y1),
        );
        for (const line of lines) {
            pathStr.push(line.type,
                this.fixValue(line.x2),
                this.fixValue(line.y2),
            );
            if ('x3' in line) {
                pathStr.push(
                    this.fixValue(line.x3),
                    this.fixValue(line.y3),
                );
            }
        }
        pathStr.push('Z');

        // Hole children
        for (const holeIx of segment.childHoles) {
            const holeSegments = colorSegments[holeIx];
            const lastLine = holeSegments.lineAttributes[holeSegments.lineAttributes.length - 1]

            pathStr.push('M');
            // Creating hole path string
            if (lastLine.type === 'Q') {
                pathStr.push(
                    this.fixValue(lastLine.x3),
                    this.fixValue(lastLine.y3),
                );
            } else {
                pathStr.push(
                    this.fixValue(lastLine.x2),
                    this.fixValue(lastLine.y2),
                );
            }

            for (const holeLine of holeSegments.lineAttributes.reverse()) {
                pathStr.push(holeLine.type);
                if (holeLine.type === 'Q') {
                    pathStr.push(
                        this.fixValue(holeLine.x2),
                        this.fixValue(holeLine.y2)
                    );
                }
                pathStr.push(
                    this.fixValue(holeLine.x1),
                    this.fixValue(holeLine.y1)
                );
            }

            pathStr.push('Z'); // Close path
        }

        return pathStr.join(' ');
    }

    protected drawControlOutput(segment: OutlinedArea, colorSegments: OutlinedArea[]): string[] {

        const tags = this.drawControlPoint(segment);

        // Hole children control points
        for (let holeIx of segment.childHoles) {
            const holeSegment = colorSegments[holeIx];
            const holeElements = this.drawControlPoint(holeSegment);
            tags.push(...holeElements)
        }
        return tags
    }

    protected drawControlPoint(segment: OutlinedArea): string[] {
        const tags = [];
        for (const shape of segment.lineAttributes) {
            const isCurve = ('x3' in shape);

            if (this.options.segmentEndpointRadius) {
                const endX = (isCurve) ? shape.x3 : shape.x2;
                const endY = (isCurve) ? shape.y3 : shape.y2;
                const endPoint = this.buildCircleTag(endX, endY, this.options.segmentEndpointRadius, 'white');
                tags.push(endPoint);
            }

            if (isCurve && this.options.curveControlPointRadius) {
                const controlColor = 'cyan';
                const lineWidth = this.options.curveControlPointRadius * 0.2;
                tags.push(
                    this.buildCircleTag(shape.x2, shape.y2, this.options.curveControlPointRadius, controlColor),
                    this.buildLineTag(shape.x1, shape.y1, shape.x2, shape.y2, controlColor, lineWidth),
                    this.buildLineTag(shape.x2, shape.y2, shape.x3, shape.y3, controlColor, lineWidth),
                );
            }
        }
        return tags
    }

    protected buildSvgTag(traceData: TraceData, tags: string[]): string {
        const w = Math.ceil(traceData.width * this.options.scale);
        const h = Math.ceil(traceData.height * this.options.scale);
        const viewBox = (this.options.viewBox) ?
            `viewBox="0 0 ${w} ${h}"` :
            `width="${w}" height="${h}"`;

        const tagString = tags.join("\n ");

        return `<svg ${viewBox} version="1.1" xmlns="http://www.w3.org/2000/svg" desc="Created with imagetracer-ts __rollup-replace-versionNumber__" >\n ${tagString}\n</svg>`;
    }

    protected buildPathTag(area: OutlinedArea, colorSegments: OutlinedArea[], color: RgbColor, desc = ''): string {
        const d = this.buildPath(area, colorSegments);
        const colorAttributes = this.buildColorAttributes(color, area);

        return `<path ${desc}${colorAttributes}d="${d}" />`;
    }

    protected buildCircleTag(x: number, y: number, r: number, fill: string): string {
        const cx = this.fixValue(x);
        const cy = this.fixValue(y);
        const strokeWidth = r * 0.2;

        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke-width="${strokeWidth}" stroke="black" />`;
    }

    protected buildLineTag(x1: number, y1: number, x2: number, y2: number, color: string, strokeWidth: number): string {
        const tx1 = this.fixValue(x1),
            ty1 = this.fixValue(y1),
            tx2 = this.fixValue(x2),
            ty2 = this.fixValue(y2)
            ;

        return `<line x1="${tx1}" y1="${ty1}" x2="${tx2}" y2="${ty2}" stroke-width="${strokeWidth}" stroke="${color}" />`;
    }

    public buildColorAttributes(c: RgbColor, area: OutlinedArea,): string {
        const colorString = this.colorToRgbString(c)
        const fill = this.useFill ? colorString : 'none'
        let attributes = `fill="${fill}" `
        if (this.useStroke) {
            attributes += `stroke="${colorString}" stroke-width="${this.options.strokeWidth}" `
        }
        const opacity = (c.a / 255.0).toPrecision(1);
        if (opacity !== '1') {
            attributes += `opacity="${opacity}" `
        }

        return attributes
    }

    protected colorToRgbString(color: RgbColorData): string {
        return `rgb(${color.r},${color.g},${color.b})`
    }
}