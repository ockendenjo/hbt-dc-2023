import VectorSource from "ol/source/Vector";
import {Renderer} from "./Renderer";
import {CombinedDataEvent} from "../../lib/combined-data";
import {Fill, Stroke, Style} from "ol/style";
import CircleStyle from "ol/style/Circle";
import {interpolateRdYlGn} from "d3-scale-chromatic";

const getStyle = (n: number) => {
    return new Style({
        image: new CircleStyle({
            radius: 7,
            fill: new Fill({color: interpolateRdYlGn(n)}),
            stroke: new Stroke({color: "white", width: 2}),
        }),
    });
};

export class RecentlyUpdatedRenderer extends Renderer {
    constructor(vectorSource: VectorSource) {
        super(vectorSource);
    }

    sortEvents(events: CombinedDataEvent[]): CombinedDataEvent[] {
        return events.sort((a, b) => {
            return a.last_modified - b.last_modified;
        });
    }

    setFeatureStyles() {
        const now = Date.now();
        const max = 7 * 24 * 60 * 60 * 1000;

        this.dataMap.forEach((feature, dataEvent) => {
            if (!dataEvent.hbt_run_count) {
                feature.setStyle(this.invisible);
                return;
            }

            const colorFract = (now - dataEvent.last_modified) / max;
            feature.setStyle(getStyle(1 - colorFract));
        });
    }
}
