import {Feature} from "ol";

export type PubFile = {
    pubs: Pub[];
};

export type Pub = {
    id: number;
    lat: number;
    lon: number;
    name: string;
    address: string;
    visited?: boolean;
};

export type PubData = {
    points: number;
    gridCell: HTMLTableCellElement;
    listCell: HTMLDivElement;
    feature?: Feature;
    formDone?: boolean;
    score: number;
} & Pub;

export type Tab = {
    tab: HTMLElement;
    contents: HTMLElement;
    name: string;
    activate?: () => void;
};

export type UploadFile = {
    pubs: UploadPub[];
};

export type UploadPub = {
    id: number;
    points: number;
    form: boolean;
    score: number;
};

export type CombinedDataFile = {
    pubs: CombinedPub[];
};

export type CombinedPub = {
    id: number;
    visitCount: number;
    minRating: number;
    maxRating: number;
    meanRating: number;
};
