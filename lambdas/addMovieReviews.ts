import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", event);
    const body = event.body ? JSON.parse(event.body) : undefined;
    if (!body || typeof body.movieId !== 'string' || typeof body.review !== 'string' || !Array.isArray(body.rating) || body.rating.some(r => typeof r !== 'number')) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Missing or invalid request body" }),
      };
    }

    await ddbDocClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: {
          movieId: body.movieId,
          review: body.review,
          rating: body.rating, 
          createdAt: new Date().toISOString(), 
        },
      })
    );

    return {
      statusCode: 201,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ message: "Motive review added" }),
    };
  } catch (error: any) {
    console.error(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
