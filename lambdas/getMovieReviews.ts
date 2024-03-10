import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("Event: ", event);
    const movieId = event.pathParameters?.movieId;
    const minRating = event.queryStringParameters?.minRating;
    const maxRating = event.queryStringParameters?.maxRating;

    if (!movieId) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing movieId path parameter" }),
      };
    }

    let filterExpression = "";
    let expressionAttributeValues = {
      ":movieId": movieId,
    };

    if (minRating) {
      filterExpression += "rating >= :minRating";
      expressionAttributeValues[":minRating"] = minRating;
    }

    if (maxRating) {
      if (filterExpression.length > 0) {
        filterExpression += " AND ";
      }
      filterExpression += "rating <= :maxRating";
      expressionAttributeValues[":maxRating"] = maxRating;
    }

    const commandOutput = await docClient.send(
      new QueryCommand({
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: "movieId = :movieId",
        ExpressionAttributeValues: expressionAttributeValues,
        FilterExpression: filterExpression.length > 0 ? filterExpression : undefined,
      })
    );

    if (!commandOutput.Items || commandOutput.Items.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "No reviews found for this movieId" }),
      };
    }

    const body = {
      data: commandOutput.Items,
    };

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
    };
  }
};
