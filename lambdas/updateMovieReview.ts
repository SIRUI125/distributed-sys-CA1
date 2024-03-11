import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const movieId = event.pathParameters?.movieId;
    const reviewerName = event.pathParameters?.reviewerName;
    const { content } = JSON.parse(event.body || '{}');

    if (!movieId || !reviewerName || !content) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Missing parameters" }),
      };
    }

    const item = {
      MovieId: parseInt(movieId),
      ReviewerName: reviewerName,
      Content: content
    };

    await docClient.send(new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: item
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Review updated successfully" }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message }),
    };
  }
};