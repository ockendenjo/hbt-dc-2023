import {GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {PubsStatsFile, PubStats, UploadFile, UploadPub} from "../ui/ts/types";

const config = {region: process.env.AWS_REGION};
const s3 = new S3Client(config);

export const handler = async (): Promise<void> => {
    return runLogic(listS3Files, getS3File, writeFile);
};

export const runLogic = async (
    listS3Files: S3FileLister,
    getS3File: S3FileGetter,
    writeS3File: S3Writer
): Promise<void> => {
    const objects = await listS3Files();

    const visitMap = new Map<number, number>();
    const scoreMap = new Map<number, number[]>();
    const pointsMap = new Map<number, number[]>();

    for (const s3File of objects) {
        const pubsForUser = await getS3File(s3File.Key);
        for (const p of pubsForUser) {
            if (p.score) {
                const scores = scoreMap.get(p.id) || [];
                scores.push(p.score);
                scoreMap.set(p.id, scores);
            }
            if (p.points) {
                visitMap.set(p.id, (visitMap.get(p.id) || 0) + 1);
                const points = pointsMap.get(p.id) || [];
                points.push(p.points);
                pointsMap.set(p.id, points);
            }
        }
    }

    const combinedPubs: PubStats[] = [];

    for (let i = 1; i <= 192; i++) {
        let min = 0;
        let max = 0;
        let mean = 0;
        let ratings: number[] = [];
        let points = pointsMap.get(i) || [];

        if (scoreMap.has(i)) {
            ratings = scoreMap.get(i) as number[];
            min = Math.min(...ratings);
            max = Math.max(...ratings);
            mean = ratings.reduce((a, v) => a + v) / ratings.length;
        }
        const visitCount = visitMap.get(i) || 0;

        const cp: PubStats = {
            id: i,
            maxRating: max,
            minRating: min,
            meanRating: mean,
            visitCount,
            ratings,
            ratingCount: ratings.length,
            points,
        };
        combinedPubs.push(cp);
    }

    await writeS3File({pubs: combinedPubs});
};

type S3Writer = (payload: PubsStatsFile) => Promise<void>;

async function writeFile(payload: PubsStatsFile): Promise<void> {
    return s3
        .send(
            new PutObjectCommand({
                Bucket: process.env.WEB_BUCKET_NAME,
                Key: COMBINED_FILE_KEY,
                Body: JSON.stringify(payload),
            })
        )
        .then();
}

const COMBINED_FILE_KEY = "aggregate.json";

type S3FileLister = () => Promise<S3File[]>;
type S3FileGetter = (key: string) => Promise<UploadPub[]>;

async function getS3File(key: string): Promise<UploadPub[]> {
    const res = await s3.send(new GetObjectCommand({Bucket: process.env.DATA_BUCKET_NAME, Key: key}));
    let objectData = (await res.Body?.transformToString("utf-8")) as string;
    return (JSON.parse(objectData) as UploadFile).pubs;
}

async function listS3Files(): Promise<S3File[]> {
    let files: S3File[] = [];
    const baseParams = {Bucket: process.env.DATA_BUCKET_NAME, Delimiter: "/"};

    const result = await s3.send(new ListObjectsV2Command({...baseParams}));
    files.push(...(result.Contents as S3File[]));

    let isTruncated = result.IsTruncated;
    let continuationToken = result.NextContinuationToken;

    while (isTruncated) {
        const nextResult = await await s3.send(
            new ListObjectsV2Command({...baseParams, ContinuationToken: continuationToken})
        );
        files.push(...(nextResult.Contents as S3File[]));

        isTruncated = nextResult.IsTruncated;
        continuationToken = nextResult.NextContinuationToken;
    }
    return files;
}

export interface S3File {
    ETag: string;
    Key: string;
    LastModified: Date;
    Size: number;
    StorageClass: string;
}
