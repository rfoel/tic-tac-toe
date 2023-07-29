import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb'

export const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
})

export default DynamoDBDocument.from(client, {
  marshallOptions: { removeUndefinedValues: true },
})
