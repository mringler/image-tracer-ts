import { ColorIndex } from "./ColorIndex";
import { DivRenderer } from "./DivRenderer";
import { EdgeRasterBuilder, EdgeTypeId } from "./EdgeRasterBuilder";
import { LayeringMode, Options } from "./Options";
import { PointInterpolator, Trajectory } from "./PointInterpolator";
import { BoundingBox, AreaScanner } from "./AreaScanner";
import { PathTracer, SvgLineAttributes } from "./PathTracer";
import { SvgDrawer } from "./svg-drawer/SvgDrawer";
import { ImageDrawer } from "./svg-drawer/ImageDrawer";
import { RgbColor } from "./RgbColor";
import { ColorQuantizeFunction, getColorQuantizeFunction } from "./color-quantize-functions";
import { ImageToRgba } from "./util/image-to-rgba";
import { ImageBlurrer } from "./image-processing/ImageBlurrer";
import { sharpen } from "./image-processing/ImageSharpener";

export type TraceData = {
    colors: RgbColor[],
    areasByColor: OutlinedArea[][],
    width: number,
    height: number
};

export namespace TraceData {
    export function toString(td: TraceData): string {
        const output: string[] = [];
        for (let colorIx = 0; colorIx < td.areasByColor.length; colorIx++) {
            const areas = td.areasByColor[colorIx];
            if (areas.length === 0) {
                continue;
            }
            output.push(td.colors[colorIx].toString());
            for (const area of areas) {
                const d = area.lineAttributes
                    .map(la => SvgLineAttributes.toString(la))
                    .join(' ');
                output.push(d)
            }
        }

        return output.join("\n");
    }
}

export interface Point<PointData = any> {
    x: number,
    y: number,
    data: PointData,
}

export type EdgePoint = Point<EdgeTypeId>
export type TrajectoryPoint = Point<Trajectory>

export interface AreaData {
    boundingBox: BoundingBox,
    childHoles: number[], // color ids of layers with areas contained in this area
    isHole: boolean
}

export interface PointedArea<PointData> extends AreaData {
    points: Point<PointData>[],
}

export type EdgeArea = PointedArea<EdgeTypeId>
export type TrajectoryArea = PointedArea<Trajectory>

export interface OutlinedArea extends AreaData {
    lineAttributes: SvgLineAttributes[]
}


export class ImageTracer {

    protected options: Options
    protected colorQuantizeFunction: ColorQuantizeFunction;

    public constructor(options: Partial<Options> | null = null) {
        this.options = Options.buildFrom(options);
        this.colorQuantizeFunction = getColorQuantizeFunction(this.options.colorSamplingMode, this.options.palette)
    }

    /**
     * Set a custom color quantize function.
     */
    public setColorQuantizeFunction(fun: ColorQuantizeFunction): this {
        this.colorQuantizeFunction = fun;
        return this
    }

    /**
     * Trace image data and render to SVG
     *
     * @param imageData 
     * @returns 
     */
    public traceImageToSvg(imageData: ImageData): string {
        const drawer = new SvgDrawer(this.options)
        return this.traceImage<string>(imageData, drawer);
    }

    /**
     * Allows to draw traced image with a custom renderer.
     *
     * @param imageData
     * @param drawer 
     * @returns 
     */
    public traceImage<OutputType = string>(
        imageData: ImageData, 
        drawer: ImageDrawer<OutputType | string> | null = null
    ): OutputType | string {

        if (!drawer) {
            drawer = new SvgDrawer(this.options);
        }
        const isVerbose = this.isVerbose();

        isVerbose && console.time(' - Preprocessing time');
        imageData = this.preProcessImage(imageData);
        isVerbose && console.timeEnd(' - Preprocessing time');

        isVerbose && console.time(' - Color indexing time');
        const colorIndex = new ColorIndex(imageData, this.options, this.colorQuantizeFunction)
        isVerbose && console.timeEnd(' - Color indexing time');

        isVerbose && console.time(' - Trace time');
        const traceData = this.imageDataToTraceData(imageData, colorIndex);
        isVerbose && console.timeEnd(' - Trace time');

        isVerbose && console.time(' - Draw time');
        const output = drawer.draw(traceData);
        isVerbose && console.timeEnd(' - Draw time');

        return output;
    }

    protected isVerbose(): boolean{
        return this.options.verbose ?? false;
    }

    protected preProcessImage(imageData: ImageData): ImageData {

        imageData = ImageToRgba.process(imageData, this.isVerbose())

        // Selective Gaussian blur preprocessing
        if (this.options.blurRadius > 0) {
            imageData = ImageBlurrer.blur(imageData, this.options.blurRadius, this.options.blurDelta);
        }
        if (this.options.sharpen) {
            imageData = sharpen(imageData, this.options.sharpenThreshold);
        }
        return imageData
    }

    protected imageDataToTraceData(imageData: ImageData, colorIndex: ColorIndex): TraceData {

        if (this.options.layeringMode === LayeringMode.SEQUENTIAL) {
            return this.imageDataToTraceDataWithSequentialLayering(imageData, colorIndex);
        } else {
            return this.imageDataToTraceDataWithParallelLayering(imageData, colorIndex);
        }
    }

    protected imageDataToTraceDataWithSequentialLayering(imageData: ImageData, colorIndex: ColorIndex): TraceData {

        const colorLayers = [];

        const areaScanner = new AreaScanner()
        const pathInterpolator = new PointInterpolator();
        const pathTracer = new PathTracer();

        for (let colorIx = 0; colorIx < colorIndex.palette.length; colorIx++) {
            const edgeRaster = EdgeRasterBuilder.buildForColor(colorIndex, colorIx)
            const areas = areaScanner.scan(edgeRaster, this.options.minShapeOutline)
            const interpolatedPath = pathInterpolator.interpolate(this.options.interpolation, areas, this.options.enhanceRightAngles)
            const outlinedAreas = interpolatedPath.map(path => pathTracer.trace(path, this.options.lineErrorMargin, this.options.curveErrorMargin))

            colorLayers.push(outlinedAreas);
        }

        return {
            areasByColor: colorLayers,
            colors: colorIndex.palette,
            width: colorIndex.rows[0].length - 2,
            height: colorIndex.rows.length - 2
        };
    }

    protected imageDataToTraceDataWithParallelLayering(imageData: ImageData, colorIndex: ColorIndex): TraceData {

        // 2. Layer separation and edge detection
        const edgeRaster = EdgeRasterBuilder.buildForColors(colorIndex);

        // Optional edge node visualization
        if (this.options.layerContainerId) {
            const divRenderer = new DivRenderer();
            divRenderer.drawLayersToDiv(edgeRaster, this.options.scale, this.options.layerContainerId);
        }

        // 3. Batch path scan
        const areaScanner = new AreaScanner()
        const areasByColor = edgeRaster.map(layer => areaScanner.scan(layer, this.options.minShapeOutline))

        // 4. Batch interpolation
        const pathInterpolator = new PointInterpolator();
        const interpolation = this.options.interpolation;
        const enhanceRightAngle = this.options.enhanceRightAngles;
        const interpolatedAreasByColor = areasByColor.map(pathBatch => pathInterpolator.interpolate(interpolation, pathBatch, enhanceRightAngle));

        // 5. Batch tracing and creating traceData object
        const pathTracer = new PathTracer();
        const traceMapper = (path: TrajectoryArea) => pathTracer.trace(path, this.options.lineErrorMargin, this.options.curveErrorMargin)
        const outlinedAreasByColor = interpolatedAreasByColor.map(pathBatch => pathBatch.map(traceMapper));

        return {
            areasByColor: outlinedAreasByColor,
            colors: colorIndex.palette,
            width: imageData.width,
            height: imageData.height
        };
    }
}
