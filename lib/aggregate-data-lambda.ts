import {Construct} from "constructs";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {Role} from "aws-cdk-lib/aws-iam";
import {RetentionDays} from "aws-cdk-lib/aws-logs";
import {Duration} from "aws-cdk-lib";
import {Runtime} from "aws-cdk-lib/aws-lambda";
import {Bucket} from "aws-cdk-lib/aws-s3";
import {HttpApi} from "@aws-cdk/aws-apigatewayv2-alpha";
import {HttpLambdaIntegration} from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import {HttpMethod} from "aws-cdk-lib/aws-events";

export class AggregateDataLambda extends Construct {
    public function: NodejsFunction;

    constructor(scope: Construct, id: string, role: Role, webBucket: Bucket, dataBucket: Bucket) {
        super(scope, id);
        const environment = {
            WEB_BUCKET_NAME: webBucket.bucketName,
            DATA_BUCKET_NAME: dataBucket.bucketName,
        };
        this.function = new NodejsFunction(this, "function", {
            role,
            environment,
            timeout: Duration.seconds(30),
            memorySize: 1024,
            logRetention: RetentionDays.THREE_DAYS,
            runtime: Runtime.NODEJS_18_X,
        });
    }
}
