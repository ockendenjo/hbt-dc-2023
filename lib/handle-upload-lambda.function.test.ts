import {runLogic, UploadInputEvent} from "./handle-upload-lambda.function";
import {fail} from "assert";

describe("HandleUploadLambda", () => {
    it("should reject path with too many nested parts", async () => {
        const input = {rawPath: "/upload/foo/1234"};
        const response = await runLogic(input as UploadInputEvent, fail);
        expect(response.statusCode).toBe(400);
    });

    it("should reject path with too few nested parts", async () => {
        const input = {rawPath: "/upload"};
        const response = await runLogic(input as UploadInputEvent, fail);
        expect(response.statusCode).toBe(400);
    });

    it("should reject path with empty ID", async () => {
        const input = {rawPath: "/upload/"};
        const response = await runLogic(input as UploadInputEvent, fail);
        expect(response.statusCode).toBe(400);
    });

    it("should reject path with bad upload ID", async () => {
        const input = {rawPath: "/upload/foobarbaz"};
        const response = await runLogic(input as UploadInputEvent, fail);
        expect(response.statusCode).toBe(400);
    });

    it("should write file to S3", async () => {
        const input = {rawPath: "/upload/01fe01f7-f1b2-4556-a5ff-baef2433e654", body: `{"foo":2}`};
        const response = await runLogic(input as UploadInputEvent, (key, body) => {
            expect(key).toBe("01fe01f7-f1b2-4556-a5ff-baef2433e654.json");
            expect(body).toBe(`{"foo":2}`);
            return Promise.resolve();
        });
        expect(response.statusCode).toBe(204);
    });

    it("should handle error writing to S3", async () => {
        const input = {rawPath: "/upload/01fe01f7-f1b2-4556-a5ff-baef2433e654", body: `{"foo":2}`};
        const response = await runLogic(input as UploadInputEvent, (key, body) => {
            return Promise.reject("S3 error");
        });
        expect(response.statusCode).toBe(500);
    });
});
