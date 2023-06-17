import VectorSource from "ol/source/Vector";
import {Renderer} from "./Renderer";
import {CombinedDataEvent} from "../../lib/combined-data";
import {Fill, Stroke, Style} from "ol/style";
import CircleStyle from "ol/style/Circle";

const style = new Style({
    image: new CircleStyle({
        radius: 7,
        fill: new Fill({color: "#C80537"}),
        stroke: new Stroke({color: "white", width: 2}),
    }),
});

export class UnvisitedRenderer extends Renderer {
    constructor(vectorSource: VectorSource) {
        super(vectorSource);
    }

    sortEvents(events: CombinedDataEvent[]): CombinedDataEvent[] {
        return events;
    }

    setFeatureStyles() {
        this.dataMap.forEach((feature, dataEvent) => {
            if (dataEvent.hbt_run_count) {
                feature.setStyle(this.invisible);
            } else {
                feature.setStyle(style);
            }
        });
    }
}
