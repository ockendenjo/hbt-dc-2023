import VectorSource from "ol/source/Vector";
import {CombinedDataEvent} from "../../lib/combined-data";
import {Feature} from "ol";
import {Point} from "ol/geom";
import {fromLonLat} from "ol/proj";
import {Style} from "ol/style";
import CircleStyle from "ol/style/Circle";

export abstract class Renderer {
    protected vectorSource: VectorSource;

    protected dataMap = new Map<CombinedDataEvent, Feature<Point>>();

    protected invisible = new Style({
        image: new CircleStyle({
            radius: 0,
        }),
    });

    constructor(vectorSource: VectorSource) {
        this.vectorSource = vectorSource;
    }

    abstract setFeatureStyles(): void;

    private addFeature(e: CombinedDataEvent) {
        const featureConfig = {
            geometry: new Point(fromLonLat([e.lon, e.lat])),
            event: e,
        };
        const iconFeature = new Feature(featureConfig);
        this.vectorSource.addFeature(iconFeature);

        this.dataMap.set(e, iconFeature);
    }

    abstract sortEvents(events: CombinedDataEvent[]): CombinedDataEvent[];

    public addEvents(events: CombinedDataEvent[]): void {
        const sorted = this.sortEvents(events);
        sorted.forEach((e) => {
            this.addFeature(e);
        });
        this.setFeatureStyles();
    }
}
