import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';


export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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
        },
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

    const jobs = api.root.addResource('jobs');
    jobs.addMethod('POST', new apigw.LambdaIntegration(createJobFn));
    jobs.addMethod('GET', new apigw.LambdaIntegration(listJobsFn));

    const job = jobs.addResource('{jobId}');
    job.addMethod('GET', new apigw.LambdaIntegration(getJobFn));

    const events = job.addResource('events');
    events.addMethod('POST', new apigw.LambdaIntegration(addEventFn));
    events.addMethod('GET', new apigw.LambdaIntegration(listEventsFn));


  }
}
