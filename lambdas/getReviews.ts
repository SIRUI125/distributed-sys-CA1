import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", event);

    const commandOutput = await docClient.send(new ScanCommand({
      TableName: "MovieReviews",
    }));

    if (!commandOutput.Items) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "No movie reviews found" }),
      };
    }

    const reviews = commandOutput.Items.map(item => ({
      MovieId: item.MovieId,
      Reviewername: item.Reviewername,
      ReviewDate: item.ReviewDate,
      Content: item.Content,
      Rating: item.Rating,
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reviews),
    };

  } catch (error) {
    console.error("Error: ", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};