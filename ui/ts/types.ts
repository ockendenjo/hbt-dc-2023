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
    formDone?: boolean;
    score: number;
    stats: PubStats;
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

export type PubsStatsFile = {
    pubs: PubStats[];
};

export type PubStats = {
    id: number;
    visitCount: number;
    minRating: number;
    maxRating: number;
    meanRating: number;
    ratingCount: number;
    points: number[];
    ratings: number[];
};
