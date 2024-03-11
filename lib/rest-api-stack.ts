import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import { generateBatch } from "../shared/util";
import { movies, movieCasts, movieReviews } from "../seed/movies";
import * as apig from "aws-cdk-lib/aws-apigateway";

export class RestAPIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Tables 
    const moviesTable = new dynamodb.Table(this, "MoviesTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Movies",
    });
    const movieCastsTable = new dynamodb.Table(this, "MovieCastTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "actorName", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "MovieCast",
    });
    const movieReviewsTable = new dynamodb.Table(this, "MovieReviewsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "MovieId", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "MovieReviews",
    });
    movieCastsTable.addLocalSecondaryIndex({
      indexName: "roleIx",
      sortKey: { name: "roleName", type: dynamodb.AttributeType.STRING },
    });
    
    // Functions 
    const getMovieByIdFn = new lambdanode.NodejsFunction(
      this,
      "GetMovieByIdFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/getMovieById.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: moviesTable.tableName,
          MOVIE_CAST_TABLE:movieCastsTable.tableName,
          REGION: 'eu-west-1',
        },
      }
      );
      
      const getAllMoviesFn = new lambdanode.NodejsFunction(
        this,
        "GetAllMoviesFn",
        {
          architecture: lambda.Architecture.ARM_64,
          runtime: lambda.Runtime.NODEJS_18_X,
          entry: `${__dirname}/../lambdas/getAllMovies.ts`,
          timeout: cdk.Duration.seconds(10),
          memorySize: 128,
          environment: {
            TABLE_NAME: moviesTable.tableName,
            REGION: 'eu-west-1',
          },
        }
        );
        
        new custom.AwsCustomResource(this, "moviesddbInitData", {
          onCreate: {
            service: "DynamoDB",
            action: "batchWriteItem",
            parameters: {
              RequestItems: {
                [moviesTable.tableName]: generateBatch(movies),
                [movieCastsTable.tableName]: generateBatch(movieCasts), 
                [movieReviewsTable.tableName]: generateBatch(movieReviews), // Added
              },
            },
            physicalResourceId: custom.PhysicalResourceId.of("moviesddbInitData"), //.of(Date.now().toString()),
          },
          policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
            resources: [moviesTable.tableArn, movieCastsTable.tableArn,movieReviewsTable.tableArn],  // Includes movie cast
          }),
        });

         //... other lambda functions ...

   const newMovieFn = new lambdanode.NodejsFunction(this, "AddMovieFn", {
    architecture: lambda.Architecture.ARM_64,
    runtime: lambda.Runtime.NODEJS_16_X,
    entry: `${__dirname}/../lambdas/addMovie.ts`,
    timeout: cdk.Duration.seconds(10),
    memorySize: 128,
    environment: {
      TABLE_NAME: moviesTable.tableName,
      REGION: "eu-west-1",
    },
  });

  const deleteMovieFn = new lambdanode.NodejsFunction(this, "DeleteMovieFn", {
    architecture: lambda.Architecture.ARM_64,
    runtime: lambda.Runtime.NODEJS_16_X,
    entry: `${__dirname}/../lambdas/deleteMovie.ts`,
    timeout: cdk.Duration.seconds(10),
    memorySize: 128,
    environment: {
      TABLE_NAME: moviesTable.tableName,
      REGION: "eu-west-1",
    },
  });


  const getMovieCastMembersFn = new lambdanode.NodejsFunction(
    this,
    "GetCastMemberFn",
    {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/getMovieCastMember.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: movieCastsTable.tableName,
        REGION: "eu-west-1",
      },
    }
  );
  const addMovieReviewsFn = new lambdanode.NodejsFunction(
    this, 
    "AddMovieReviewsFn", 
    {
      architecture: lambda.Architecture.ARM_64, 
      runtime: lambda.Runtime.NODEJS_16_X, 
      entry: `${__dirname}/../lambdas/addMovieReviews.ts`, 
      timeout: cdk.Duration.seconds(10), 
      memorySize: 128, 
      environment: { 
        TABLE_NAME: movieReviewsTable.tableName, 
        REGION: "eu-west-1", 
      },
    }
  );
  const getMovieReviewsFn = new lambdanode.NodejsFunction(
    this, 
    "GetMovieReviewsFn", 
    {
      architecture: lambda.Architecture.ARM_64, 
      runtime: lambda.Runtime.NODEJS_16_X, 
      entry: `${__dirname}/../lambdas/getMovieReviews.ts`, 
      timeout: cdk.Duration.seconds(10), 
      memorySize: 128, 
      environment: { 
        TABLE_NAME: movieReviewsTable.tableName, 
        REGION: "eu-west-1", 
      },
    }
  );
  const getReviewsFn = new lambdanode.NodejsFunction(this, "GetReviewsFn", {
    architecture: lambda.Architecture.ARM_64,
    runtime: lambda.Runtime.NODEJS_18_X,
    entry: `${__dirname}/../lambdas/getReviews.ts`, 
    timeout: cdk.Duration.seconds(10),
    memorySize: 128,
    environment: {
      TABLE_NAME: movieReviewsTable.tableName,
      REGION: process.env.CDK_DEFAULT_REGION || 'eu-west-1',
    },
  });
  const updateMovieReviewFn = new lambdanode.NodejsFunction(this, "UpdateMovieReviewFn", {
    architecture: lambda.Architecture.ARM_64,
    runtime: lambda.Runtime.NODEJS_18_X,
    entry: `${__dirname}/../lambdas/updateMovieReview.ts`, 
    timeout: cdk.Duration.seconds(10),
    memorySize: 128,
    environment: {
      TABLE_NAME: movieReviewsTable.tableName,
      REGION: "eu-west-1",
    },
  });
  const getReviewsByReviewerFn = new lambdanode.NodejsFunction(this, 'GetReviewsByReviewerFunction', {
    architecture: lambda.Architecture.ARM_64,
    runtime: lambda.Runtime.NODEJS_16_X,
    entry: `${__dirname}/../lambdas/getReviewsByReviewer.ts`,
    timeout: cdk.Duration.seconds(10),
    memorySize: 128,
    environment: {
        TABLE_NAME: movieReviewsTable.tableName,
        REGION: 'eu-west-1',
    },
});
        // Permissions 
        moviesTable.grantReadData(getMovieByIdFn)
        moviesTable.grantReadData(getAllMoviesFn)
        moviesTable.grantReadWriteData(newMovieFn)
        moviesTable.grantReadWriteData(deleteMovieFn)
        movieCastsTable.grantReadData(getMovieCastMembersFn);
        movieCastsTable.grantReadData(getMovieByIdFn);
        movieReviewsTable.grantReadData(getMovieReviewsFn);
        movieReviewsTable.grantReadData(getReviewsFn);
        movieReviewsTable.grantReadWriteData(addMovieReviewsFn);
        movieReviewsTable.grantReadWriteData(updateMovieReviewFn);
        movieReviewsTable.grantReadData(getReviewsByReviewerFn);
        const api = new apig.RestApi(this, "RestAPI", {
          description: "demo api",
          deployOptions: {
            stageName: "dev",
          },
          defaultCorsPreflightOptions: {
            allowHeaders: ["Content-Type", "X-Amz-Date"],
            allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
            allowCredentials: true,
            allowOrigins: ["*"],
          },
        });
    
        const moviesEndpoint = api.root.addResource("movies");
        moviesEndpoint.addMethod(
          "GET",
          new apig.LambdaIntegration(getAllMoviesFn, { proxy: true })
        );
    
        const movieEndpoint = moviesEndpoint.addResource("{movieId}");
        movieEndpoint.addMethod(
          "GET",
          new apig.LambdaIntegration(getMovieByIdFn, { proxy: true })
        );
        moviesEndpoint.addMethod(
          "POST",
          new apig.LambdaIntegration(newMovieFn, { proxy: true })
        );
        movieEndpoint.addMethod(
          "DELETE",
          new apig.LambdaIntegration(deleteMovieFn, {proxy: true})
        )
        const movieCastEndpoint = moviesEndpoint.addResource("cast");
        movieCastEndpoint.addMethod(
            "GET",
            new apig.LambdaIntegration(getMovieCastMembersFn, { proxy: true })
        );
        const movieReviewsEndpoint = movieEndpoint.addResource("reviews");
        movieReviewsEndpoint.addMethod(
          "GET",
          new apig.LambdaIntegration(getMovieReviewsFn, { proxy: true })
        );
        movieReviewsEndpoint.addMethod(
          "POST",
          new apig.LambdaIntegration(addMovieReviewsFn, { proxy: true })
        );
        
        const reviewerSubEndpoint = movieReviewsEndpoint.addResource("{reviewerName}");
        reviewerSubEndpoint.addMethod(
          "PUT",
          new apig.LambdaIntegration(updateMovieReviewFn, { proxy: true })
        );
        reviewerSubEndpoint.addMethod(
          "GET",
          new apig.LambdaIntegration(getReviewsByReviewerFn, { proxy: true })
        );
        
        const reviewsEndpoint = api.root.addResource("reviews");
        reviewsEndpoint.addMethod("GET",
         new apig.LambdaIntegration(getReviewsFn, { proxy: true }));

      }
    }
    