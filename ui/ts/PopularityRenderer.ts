import VectorSource from "ol/source/Vector";
import {Renderer} from "./Renderer";
import {CombinedDataEvent} from "../../lib/combined-data";
import {Fill, Stroke, Style} from "ol/style";
import CircleStyle from "ol/style/Circle";
import {interpolateOranges} from "d3-scale-chromatic";

const getStyle = (n: number) => {
    return new Style({
        image: new CircleStyle({
            radius: 7,
            fill: new Fill({color: interpolateOranges(n)}),
            stroke: new Stroke({color: n < 0.25 ? "grey" : "white", width: 2}),
        }),
    });
};

export class PopularityRenderer extends Renderer {
    constructor(vectorSource: VectorSource) {
        super(vectorSource);
    }

    sortEvents(events: CombinedDataEvent[]): CombinedDataEvent[] {
        return events.sort((a, b) => a.hbt_run_count - b.hbt_run_count);
    }

    setFeatureStyles() {
        const events = [...this.dataMap.keys()].filter((e) => e.hbt_run_count);

        const max = events.reduce((acc, val) => {
            return Math.max(acc, Math.log(val.hbt_run_count || 1));
        }, 0);
        const min = events.reduce((acc, val) => {
            return Math.min(acc, Math.log(val.hbt_run_count || 1));
        }, max);
        const count = events.reduce((acc, val) => {
            return acc + val.hbt_run_count;
        }, 0);
        const diff = max - min;

        this.dataMap.forEach((feature, dataEvent) => {
            if (dataEvent.hbt_run_count) {
                const colorFract = (Math.log(dataEvent.hbt_run_count || 1) - min) / diff;
                feature.setStyle(getStyle(colorFract));
            } else {
                feature.setStyle(this.invisible);
            }
        });

        document.getElementById("total_count").textContent = String(count);
    }
}
