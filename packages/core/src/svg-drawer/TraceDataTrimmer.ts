import { TraceData } from "../ImageTracer";

type Offsets = {
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
}
export namespace TraceDataTrimmer{
    export function trim(traceData: TraceData, strokeWidth: number, keepAspectRatio: boolean, verbose = false )
    {
        const offsets = getOffsets(traceData, strokeWidth);

        if(keepAspectRatio){
            applyAspectRatio(offsets, traceData)
        }

        if(
            offsets.minX === 0 && 
            offsets.maxX === traceData.width && 
            offsets.minY === 0 && 
            offsets.maxY === traceData.height
        ){
            return
        }

        verbose && console.log(`Trimming x[${offsets.minX}|${offsets.maxX}]/${traceData.width}, y[${offsets.minY}|${offsets.maxY}]/${traceData.height}`)

        updateData(traceData, offsets)
    }

    function getOffsets(traceData: TraceData, strokeWidth: number): Offsets
    {
        let minX = traceData.width, minY = traceData.height, maxX = 0, maxY = 0;

        for(let colorId = 0; colorId < traceData.areasByColor.length; colorId++){
            const color = traceData.colors[colorId]
            if(color.a === 0){
                continue;
            }

            const colorArea = traceData.areasByColor[colorId]

            for(const area of colorArea){
                for(const line of area.lineAttributes){
                    const isLineQ = line.type === "Q";
                    minX = Math.min(minX, line.x1, line.x2, isLineQ ? line.x3 : minX);
                    maxX = Math.max(maxX, line.x1, line.x2, isLineQ ? line.x3 : 0);
                    minY = Math.min(minY, line.y1, line.y2, isLineQ ? line.y3 : minY);
                    maxY = Math.max(maxY, line.y1, line.y2, isLineQ ? line.y3 : 0);
                }
            }
        }

        const strokeBorder = Math.floor(strokeWidth / 2);
        minX -= strokeBorder;
        minY -= strokeBorder;
        maxX += strokeBorder;
        maxY += strokeBorder;
        
        return {minX, maxX, minY, maxY};
    }

    function applyAspectRatio(offsets: Offsets, traceData: TraceData)
    {
        const trimmedWidth = offsets.maxX - offsets.minX;
        const trimmedHeight = offsets.maxY - offsets.minY;
        const oldWidth = traceData.width;
        const oldHeight = traceData.height;

        const expectedTrimmedWidth = Math.ceil(trimmedHeight * oldWidth / oldHeight);
        if(trimmedWidth === expectedTrimmedWidth){
            return;
        }

        if(expectedTrimmedWidth > trimmedWidth){
            const diff = (expectedTrimmedWidth - trimmedWidth) /2;
            offsets.minX -= Math.ceil(diff);
            offsets.maxX += Math.floor(diff);
            return
        }

        const expectedTrimmedHeight = Math.ceil(trimmedWidth * oldHeight / oldWidth);
        const diff = (expectedTrimmedHeight - trimmedHeight) /2;
        offsets.minY -= Math.ceil(diff);
        offsets.maxY += Math.floor(diff);
    }

    function updateData(traceData: TraceData, offsets: Offsets)
    {
        const {minX, maxX, minY, maxY} = offsets;

        for(const colorArea of traceData.areasByColor){
            for(const area of colorArea){
                for(const lineAttribute of area.lineAttributes){
                    lineAttribute.x1 -= minX;
                    lineAttribute.x2 -= minX;
                    lineAttribute.y1 -= minY;
                    lineAttribute.y2 -= minY;
                    if(lineAttribute.type === 'Q'){
                        lineAttribute.x3 -= minX
                        lineAttribute.y3 -= minY
                    }
                }
            }
        }
        traceData.height = maxY - minY
        traceData.width = maxX - minX
    }
}