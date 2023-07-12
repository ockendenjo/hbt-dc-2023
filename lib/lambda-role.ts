import {Construct} from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import {Effect} from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib";
import {Bucket} from "aws-cdk-lib/aws-s3";

export function getRole(construct: Construct, dataBucket: Bucket): iam.Role {
    const stackData = cdk.Stack.of(construct);
    const stackRegion = stackData.region;
    const accountId = stackData.account;

    const policyDocument = new iam.PolicyDocument({
        statements: [
            new iam.PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["logs:CreateLogGroup"],
                resources: [`arn:aws:logs:${stackRegion}:${accountId}:*`],
            }),
            new iam.PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["logs:CreateLogStream", "logs:PutLogEvents"],
                resources: [`arn:aws:logs:${stackRegion}:${accountId}:log-group:/aws/lambda/*`],
            }),
        ],
    });

    const role = new iam.Role(construct, "HBTDCLambdaRole", {
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        path: "/service-role/",
        roleName: "HBTDCLambdaRole",
        inlinePolicies: {
            HBTDCLambdaPolicy: policyDocument,
        },
    });

    dataBucket.grantReadWrite(role);
    return role;
}
