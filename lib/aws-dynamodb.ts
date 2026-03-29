import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export const docClient = DynamoDBDocumentClient.from(client);

export async function getItem<T>(tableName: string, key: Record<string, any>): Promise<T | null> {
  try {
    const response = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: key,
      })
    );
    return response.Item as T | null;
  } catch (error) {
    console.error('DynamoDB GetItem error:', error);
    throw error;
  }
}

export async function putItem(tableName: string, item: Record<string, any>): Promise<void> {
  try {
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
      })
    );
  } catch (error) {
    console.error('DynamoDB PutItem error:', error);
    throw error;
  }
}

export async function updateItem(
  tableName: string,
  key: Record<string, any>,
  updates: Record<string, any>
): Promise<void> {
  try {
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.keys(updates).forEach((field, index) => {
      const placeholder = `#field${index}`;
      const valuePlaceholder = `:value${index}`;
      updateExpression.push(`${placeholder} = ${valuePlaceholder}`);
      expressionAttributeNames[placeholder] = field;
      expressionAttributeValues[valuePlaceholder] = updates[field];
    });

    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: key,
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );
  } catch (error) {
    console.error('DynamoDB UpdateItem error:', error);
    throw error;
  }
}

export async function deleteItem(tableName: string, key: Record<string, any>): Promise<void> {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: key,
      })
    );
  } catch (error) {
    console.error('DynamoDB DeleteItem error:', error);
    throw error;
  }
}

export async function queryItems<T>(
  tableName: string,
  keyConditionExpression: string,
  expressionAttributeValues: Record<string, any>,
  indexName?: string
): Promise<T[]> {
  try {
    const response = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        IndexName: indexName,
      })
    );
    return (response.Items || []) as T[];
  } catch (error) {
    console.error('DynamoDB Query error:', error);
    throw error;
  }
}

export async function scanItems<T>(tableName: string): Promise<T[]> {
  try {
    const response = await docClient.send(
      new ScanCommand({
        TableName: tableName,
      })
    );
    return (response.Items || []) as T[];
  } catch (error) {
    console.error('DynamoDB Scan error:', error);
    throw error;
  }
}
