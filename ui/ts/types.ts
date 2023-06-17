export type PubFile = {
    pubs: Pub[];
};

export type Pub = {
    id: number;
    lat: number;
    lon: number;
    x: number;
    y: number;
    name: string;
    address: string;
};
