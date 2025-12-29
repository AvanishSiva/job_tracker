import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as event from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";


export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const googleClientId = this.node.tryGetContext('googleClientId');
    const googleRedirectUri = this.node.tryGetContext('googleRedirectUri');
    const googleClientSecret = this.node.tryGetContext('googleClientSecret');
    const geminiApiKey = this.node.tryGetContext('geminiApiKey');

    if (!googleClientId || !googleRedirectUri || !googleClientSecret) {
      throw new Error("Missing Google OAuth configuration in CDK context");
    }


    const jobsTable = new dynamodb.Table(this, 'JobsTable', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const eventsTable = new dynamodb.Table(this, 'EventsTable', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userTokensTable = new dynamodb.Table(this, "UserTokensTable", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // OK for MVP; change to RETAIN later
    });

    const processedEmailsTable = new dynamodb.Table(this, "ProcessedEmailsTable", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl", // TTL auto-delete
      removalPolicy: cdk.RemovalPolicy.DESTROY, // MVP only
    });
    
    const api = new apigw.RestApi(this, 'JobTrackerApi', {
      restApiName: 'job-tracker-api',
      deployOptions: { stageName: 'dev' },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    });

    const mkLambda = (name: string, folder: string) => {
      const fn = new lambda.Function(this, name, {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', folder)),
        environment: {
          JOBS_TABLE: jobsTable.tableName,
          EVENTS_TABLE: eventsTable.tableName,
          GOOGLE_CLIENT_ID: googleClientId,
          GOOGLE_REDIRECT_URI: googleRedirectUri,
          USER_TOKENS_TABLE: userTokensTable.tableName,
          GOOGLE_CLIENT_SECRET: googleClientSecret,
          PROCESSED_EMAILS_TABLE: processedEmailsTable.tableName,
          GEMINI_API_KEY: geminiApiKey
        },
        timeout: cdk.Duration.seconds(60),
        memorySize: 256,
      });

      jobsTable.grantReadWriteData(fn);
      eventsTable.grantReadWriteData(fn);
      return fn;
    };

    const createJobFn = mkLambda('CreateJobFn', 'create-job');
    const listJobsFn = mkLambda('ListJobsFn', 'list-jobs');
    const getJobFn = mkLambda('GetJobFn', 'get-job');
    const addEventFn = mkLambda('AddEventFn', 'add-event');
    const listEventsFn = mkLambda('ListEventsFn', 'list-events');

    const googleAuthStartFn = mkLambda('GoogleAuthStartFn','google-auth-start');
    const googleAuthCallbackFn = mkLambda('GoogleAuthCallbackFn', 'google-auth-callback');

    const gmailPollerFn = mkLambda("GmailPollerFn", "gmail-poller");
    
    const gmailDailyRule = new event.Rule(this, "GmailDailyPollRule", {
      schedule: event.Schedule.rate(cdk.Duration.days(1)),
    });

    gmailDailyRule.addTarget(new targets.LambdaFunction(gmailPollerFn));

    


    const jobs = api.root.addResource('jobs');
    jobs.addMethod('POST', new apigw.LambdaIntegration(createJobFn));
    jobs.addMethod('GET', new apigw.LambdaIntegration(listJobsFn));

    const job = jobs.addResource('{jobId}');
    job.addMethod('GET', new apigw.LambdaIntegration(getJobFn));

    const events = job.addResource('events');
    events.addMethod('POST', new apigw.LambdaIntegration(addEventFn));
    events.addMethod('GET', new apigw.LambdaIntegration(listEventsFn));

    const auth = api.root.addResource('auth');
    const google = auth.addResource('google');

    google
    .addResource('start')
    .addMethod('GET', new apigw.LambdaIntegration(googleAuthStartFn));

    google
    .addResource('callback')
    .addMethod('GET', new apigw.LambdaIntegration(googleAuthCallbackFn));

    userTokensTable.grantReadWriteData(googleAuthCallbackFn);
    userTokensTable.grantReadData(gmailPollerFn);
    processedEmailsTable.grantReadWriteData(gmailPollerFn);

    gmailPollerFn.addEnvironment("JOBS_TABLE", jobsTable.tableName);
    gmailPollerFn.addEnvironment("EVENTS_TABLE", eventsTable.tableName);

    jobsTable.grantReadWriteData(gmailPollerFn);
    eventsTable.grantReadWriteData(gmailPollerFn);

    

  }
}
