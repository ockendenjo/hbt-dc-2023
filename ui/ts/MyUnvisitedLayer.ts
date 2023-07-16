import {RenderBase, STYLE_BROWN, STYLE_GREY} from "./RenderBase";
import VectorSource from "ol/source/Vector";
import {PubData} from "./types";
import {Feature} from "ol";

export class MyUnvisitedLayer extends RenderBase {
    constructor(source: VectorSource) {
        super(source);
    }

    setStyle(pub: PubData, feature: Feature): void {
        if ([-1, 1, 3].includes(pub.points)) {
            feature.setStyle(STYLE_GREY);
        } else {
            feature.setStyle(STYLE_BROWN);
        }
    }

    sort(pubs: PubData[]): PubData[] {
        return pubs;
    }
}
