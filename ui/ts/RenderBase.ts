import {Renderer} from "./layerDef";
import {PubData} from "./types";
import VectorSource from "ol/source/Vector";
import {Fill, Stroke, Style} from "ol/style";
import CircleStyle from "ol/style/Circle";
import {Feature} from "ol";
import {Point} from "ol/geom";
import {fromLonLat} from "ol/proj";

export abstract class RenderBase implements Renderer {
    protected source: VectorSource;
    private featureMap = new Map<number, Feature>();

    constructor(source: VectorSource) {
        this.source = source;
    }

    render(pubs: PubData[]) {
        this.sort(pubs).forEach((p) => {
            const featureConfig = {
                geometry: new Point(fromLonLat([p.lon, p.lat])),
                pub: p,
            };
            const feature = new Feature(featureConfig);
            this.featureMap.set(p.id, feature);
            this.setStyle(p, feature);
            this.source.addFeature(feature);
        });
    }

    updateStyling(pub: PubData) {
        const feature = this.featureMap.get(pub.id);
        this.setStyle(pub, feature);
    }

    abstract sort(pubs: PubData[]): PubData[];

    abstract setStyle(pub: PubData, feature: Feature): void;
}

export const STYLE_BROWN = new Style({
    image: new CircleStyle({
        radius: 7,
        fill: new Fill({color: "saddlebrown"}),
        stroke: new Stroke({color: "white", width: 2}),
    }),
});

export const STYLE_GREY = new Style({
    image: new CircleStyle({
        radius: 5,
        fill: new Fill({color: "#C0C0C0"}),
        stroke: new Stroke({color: "white", width: 2}),
    }),
});
