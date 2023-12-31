import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import {Bucket} from "aws-cdk-lib/aws-s3";
import {
    AllowedMethods,
    BehaviorOptions,
    CachedMethods,
    CachePolicy,
    Distribution,
    HttpVersion,
    OriginAccessIdentity,
    PriceClass,
    ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import {HttpOrigin, S3Origin} from "aws-cdk-lib/aws-cloudfront-origins";
import {Certificate} from "aws-cdk-lib/aws-certificatemanager";
import {ARecord, HostedZone, RecordTarget} from "aws-cdk-lib/aws-route53";
import {CloudFrontTarget} from "aws-cdk-lib/aws-route53-targets";
import {Role, WebIdentityPrincipal} from "aws-cdk-lib/aws-iam";
import {Duration} from "aws-cdk-lib";
import {HandleUploadLambda} from "./handle-upload-lambda";
import {getRole} from "./lambda-role";
import {HttpApi} from "@aws-cdk/aws-apigatewayv2-alpha";
import {AggregateDataLambda} from "./aggregate-data-lambda";
import {Rule, Schedule} from "aws-cdk-lib/aws-events";
import {LambdaTarget} from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import {LambdaFunction} from "aws-cdk-lib/aws-events-targets";

export class HbtDc2023Stack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const bucket = new Bucket(this, "Bucket", {
            bucketName: "dc2023.hbt.ockenden.io",
        });
        const dataBucket = new Bucket(this, "DataBucket", {
            bucketName: "data.dc2023.hbt.ockenden.io",
        });
        const role = getRole(this, dataBucket);
        bucket.grantWrite(role);

        const httpApi = new HttpApi(this, "HttpApi", {
            apiName: "hbt-dc",
        });

        const uploader = new HandleUploadLambda(this, "HandleUploadLambda", httpApi, role, dataBucket);
        const aggregateLambda = new AggregateDataLambda(this, "AggregateDataLambda", role, bucket, dataBucket);

        const hostedZone = HostedZone.fromLookup(this, "HostedZone", {domainName: "ockenden.io"});

        const originAccessIdentity = new OriginAccessIdentity(this, "MyOriginAccessIdentity", {});
        const s3Origin = new S3Origin(bucket, {originAccessIdentity: originAccessIdentity});
        const noCacheBehaviour: BehaviorOptions = {
            origin: s3Origin,
            compress: true,
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
            cachedMethods: CachedMethods.CACHE_GET_HEAD,
            cachePolicy: CachePolicy.CACHING_DISABLED,
        };

        const uploadBehaviour: BehaviorOptions = {
            origin: new HttpOrigin(httpApi.apiId + ".execute-api.eu-west-1.amazonaws.com", {}),
            compress: true,
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: AllowedMethods.ALLOW_ALL,
            cachePolicy: CachePolicy.CACHING_DISABLED,
        };

        const OIDC_PROVIDER_ARN = "arn:aws:iam::574363388371:oidc-provider/token.actions.githubusercontent.com";

        const cicdRole = new Role(this, "CICDRole", {
            roleName: "HBTDrinkingChallengeCICDRole",
            assumedBy: new WebIdentityPrincipal(OIDC_PROVIDER_ARN, {
                StringEquals: {
                    "token.actions.githubusercontent.com:sub": "repo:ockendenjo/hbt-dc-2023:ref:refs/heads/main",
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
                },
            }),
            description: "Used by GitHub actions to upload files to S3 bucket",
            maxSessionDuration: Duration.hours(1),
        });
        bucket.grantReadWrite(cicdRole, "*");

        const domainNames = ["dc.hbt.ockenden.io", "drinking.hbt.ockenden.io"];
        const cfDist = new Distribution(this, "CFDistribution", {
            defaultBehavior: {
                origin: s3Origin,
                compress: true,
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
                cachedMethods: CachedMethods.CACHE_GET_HEAD,
                cachePolicy: CachePolicy.CACHING_OPTIMIZED,
            },
            additionalBehaviors: {
                "pubs.json": noCacheBehaviour,
                "aggregate.json": noCacheBehaviour,
                "upload/*": uploadBehaviour,
            },
            priceClass: PriceClass.PRICE_CLASS_100,
            httpVersion: HttpVersion.HTTP2_AND_3,
            domainNames: domainNames,
            certificate: Certificate.fromCertificateArn(
                this,
                "Certificate",
                "arn:aws:acm:us-east-1:574363388371:certificate/cb2155dc-e84e-4fb2-8d18-5030060c98e3"
            ),
            defaultRootObject: "index.html",
        });
        cfDist.grantCreateInvalidation(cicdRole);

        domainNames.forEach((dn) => {
            const id = "ARecord-" + dn.split(".")[0];
            new ARecord(this, id, {
                target: RecordTarget.fromAlias(new CloudFrontTarget(cfDist)),
                zone: hostedZone,
                recordName: dn + ".",
            });
        });

        new Rule(this, "AggregationRule", {
            schedule: Schedule.cron({day: "*", hour: "0", minute: "0", month: "*", year: "*"}),
            targets: [new LambdaFunction(aggregateLambda.function, {retryAttempts: 1})],
        });
    }
}
