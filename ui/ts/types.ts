export type PubFile = {
    pubs: Pub[];
};

export type Pub = {
    id: number;
    lat: number;
    lon: number;
    name: string;
    address: string;
};

export type PubData = {
    points: number;
    gridCell: HTMLTableCellElement;
    listCell: HTMLDivElement;
} & Pub;

export type Tab = {
    tab: HTMLElement;
    contents: HTMLElement;
    name: string;
    activate?: () => void;
};

export type StoredData = Record<string, number>;
