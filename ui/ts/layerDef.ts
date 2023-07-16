import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import {CombinedPub, PubData} from "./types";

export type LayerDef = {
    id: string;
    selectText: string;
    descText: string;
    visible: boolean;
    source?: VectorSource;
    layer?: VectorLayer<any>;
    setupRenderer: (source: VectorSource) => Renderer;
    renderer?: Renderer;
};

export interface Renderer {
    render(pubs: PubData[], stats: CombinedPub[]): void;
    updateStyling(pub: PubData): void;
}
