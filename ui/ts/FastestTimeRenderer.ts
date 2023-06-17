import VectorSource from "ol/source/Vector";
import {Renderer} from "./Renderer";
import {CombinedDataEvent} from "../../lib/combined-data";
import {Fill, Stroke, Style} from "ol/style";
import CircleStyle from "ol/style/Circle";
import {interpolateRdYlGn} from "d3-scale-chromatic";
import {RunTime} from "../../lib/run-time";

const getStyle = (n: number) => {
    return new Style({
        image: new CircleStyle({
            radius: 7,
            fill: new Fill({color: interpolateRdYlGn(n)}),
            stroke: new Stroke({color: "white", width: 2}),
        }),
    });
};

export class FastestTimeRenderer extends Renderer {
    private readonly id: string;

    constructor(vectorSource: VectorSource, identifier: string) {
        super(vectorSource);
        this.id = identifier;
    }

    sortEvents(events: CombinedDataEvent[]): CombinedDataEvent[] {
        return events.sort((a, b) => {
            const aRecord = a.records.find((r) => r.age_category === this.id);
            const bRecord = b.records.find((r) => r.age_category === this.id);
            const aTime = aRecord ? new RunTime(aRecord.time).getSeconds() : Number.MAX_VALUE;
            const bTime = bRecord ? new RunTime(bRecord.time).getSeconds() : Number.MAX_VALUE;
            return bTime - aTime;
        });
    }

    setFeatureStyles() {
        const events = [...this.dataMap.keys()];

        const times = events.reduce((acc, val) => {
            const record = val.records.find((r) => r.age_category === this.id);
            if (record) {
                acc.push(new RunTime(record.time).getSeconds());
            }
            return acc;
        }, []);
        const max = Math.max(...times);
        const min = Math.min(...times);
        const diff = max - min;

        this.dataMap.forEach((feature, dataEvent) => {
            if (!dataEvent.hbt_run_count) {
                feature.setStyle(this.invisible);
                return;
            }

            const record = dataEvent.records.find((r) => r.age_category === this.id);
            if (record) {
                const colorFract = 1 - (new RunTime(record.time).getSeconds() - min) / diff;
                feature.setStyle(getStyle(colorFract));
            } else {
                feature.setStyle(getStyle(0));
            }
        });
    }
}
