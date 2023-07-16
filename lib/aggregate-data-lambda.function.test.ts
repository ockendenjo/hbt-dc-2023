import {AggregateDataLambda} from "./aggregate-data-lambda";
import {runLogic, S3File} from "./aggregate-data-lambda.function";
import {PubsStatsFile, PubStats, UploadPub} from "../ui/ts/types";

describe(AggregateDataLambda.name, () => {
    const tests = [
        {
            name: "Should ignore zero-value scores",
            writeFile: (payload: PubsStatsFile) => {
                const pub = payload.pubs.find((p) => p.id === 1) as PubStats;
                expect(pub.minRating).toBe(0);
                expect(pub.maxRating).toBe(0);
                expect(pub.meanRating).toBe(0);
                return Promise.resolve();
            },
        },
        {
            name: "Should calculate min/max/mean score",
            writeFile: (payload: PubsStatsFile) => {
                const pub = payload.pubs.find((p) => p.id === 2) as PubStats;
                expect(pub.minRating).toBe(3);
                expect(pub.maxRating).toBe(4);
                expect(pub.meanRating).toBe(3.5);
                return Promise.resolve();
            },
        },
        {
            name: "Should calculate visit count",
            writeFile: (payload: PubsStatsFile) => {
                const pub = payload.pubs.find((p) => p.id === 2) as PubStats;
                expect(pub.visitCount).toBe(2);
                return Promise.resolve();
            },
        },
        {
            name: "Should set visitCount to zero for pubs without points",
            writeFile: (payload: PubsStatsFile) => {
                const pub = payload.pubs.find((p) => p.id === 1) as PubStats;
                expect(pub.visitCount).toBe(0);
                return Promise.resolve();
            },
        },
        {
            name: "Should set visitCount to zero for unvisited pubs",
            writeFile: (payload: PubsStatsFile) => {
                const pub = payload.pubs.find((p) => p.id === 12) as PubStats;
                expect(pub.visitCount).toBe(0);
                return Promise.resolve();
            },
        },
    ];

    tests.forEach((tc) => {
        it(tc.name, async () => {
            await runLogic(listS3Files, getFile, tc.writeFile);
        });
    });
});

const listS3Files = (): Promise<S3File[]> => {
    const f1: S3File = {
        ETag: "",
        Key: "db5f2aa9-6224-43ff-982d-fb0b25e14af0.json",
        LastModified: new Date(),
        Size: 0,
        StorageClass: "",
    };
    const f2: S3File = {
        ETag: "",
        Key: "c2733d06-3691-48c2-a139-f7ee8de60637.json",
        LastModified: new Date(),
        Size: 0,
        StorageClass: "",
    };
    return Promise.resolve([f1, f2]);
};
const getFile = (key: string): Promise<UploadPub[]> => {
    if (key === "db5f2aa9-6224-43ff-982d-fb0b25e14af0.json") {
        return Promise.resolve([
            {id: 1, score: 0, points: 0, form: true},
            {id: 2, score: 4, points: 1, form: true},
            {id: 4, score: 1, points: 1, form: true},
        ]);
    }
    return Promise.resolve([
        {id: 2, score: 3, points: 1, form: true},
        {id: 3, score: 2, points: 1, form: true},
    ]);
};
