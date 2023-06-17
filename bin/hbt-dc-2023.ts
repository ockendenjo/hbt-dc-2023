#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {HbtDc2023Stack} from '../lib/hbt-dc-2023-stack';

const app = new cdk.App();
new HbtDc2023Stack(app, 'HbtDc2023Stack', {
    env: {account: "574363388371", region: "eu-west-1"}
});
