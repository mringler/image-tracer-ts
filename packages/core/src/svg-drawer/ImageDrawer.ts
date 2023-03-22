import { TraceData } from "../ImageTracer";

export interface ImageDrawer<OutputType>{
    /**
     * Convert traced data to an image.
     *
     * @param traceData 
     */
    draw(traceData: TraceData): OutputType;
}