import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", event);
    const movieId = event.pathParameters?.movieId;
    const minRating = event.queryStringParameters?.minRating;
    const maxRating = event.queryStringParameters?.maxRating;

    if (!movieId) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing or invalid movieId" }),
      };
    }

    let expression = "movieId = :movieId";
    let expressionValues = { ":movieId": movieId };

    if (minRating) {
      expression += " and rating >= :minRating";
      expressionValues[":minRating"] = minRating;
    }

    if (maxRating) {
      expression += " and rating <= :maxRating";
      expressionValues[":maxRating"] = maxRating;
    }

    const commandOutput = await docClient.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: expression,
      ExpressionAttributeValues: expressionValues,
    }));

    if (!commandOutput.Items || commandOutput.Items.length === 0) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "No reviews found" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: commandOutput.Items }),
    };
  } catch (error: any) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
