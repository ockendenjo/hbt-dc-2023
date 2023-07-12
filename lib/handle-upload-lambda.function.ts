import {PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {
    APIGatewayEventRequestContextV2,
    APIGatewayProxyEventV2WithRequestContext,
    APIGatewayProxyStructuredResultV2,
} from "aws-lambda/trigger/api-gateway-proxy";

const config = {region: process.env.AWS_REGION};
const s3 = new S3Client(config);

export type UploadInputEvent = APIGatewayProxyEventV2WithRequestContext<APIGatewayEventRequestContextV2>;

export const handler = async (event: UploadInputEvent, context: any): Promise<APIGatewayProxyStructuredResultV2> => {
    return runLogic(event, writeFile);
};

const MAX_LENGTH = 192 * 80;

export const runLogic = async (
    event: UploadInputEvent,
    writeS3File: S3Writer
): Promise<APIGatewayProxyStructuredResultV2> => {
    const rawPath = event.rawPath;
    const split = rawPath.split("/");
    if (split.length != 3) {
        return getER(400, "Unexpected URL path");
    }
    const id = split[2];
    const s = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    if (!s.test(id)) {
        return getER(400, "Unexpected upload ID");
    }

    if ((event.body?.length || 0) > MAX_LENGTH) {
        return getER(413, "Request too large");
    }

    try {
        await writeS3File(`${id}.json`, event.body ?? "");
        return {statusCode: 204};
    } catch (e) {
        return {statusCode: 500, body: "Something went wrong"};
    }
};

type S3Writer = (key: string, payload: string) => Promise<void>;

function getER(statusCode: number, errMsg: string) {
    return {body: `{"error":"${errMsg}"`, statusCode, headers: {"Content-Type": "application/json"}};
}

async function writeFile(key: string, payload: string): Promise<void> {
    return s3
        .send(
            new PutObjectCommand({
                Bucket: process.env.DATA_BUCKET_NAME,
                Key: key,
                Body: payload,
            })
        )
        .then();
}
