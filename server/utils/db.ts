import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb'

import { logger } from './logger'

export const client = new DynamoDBClient({
  logger,
  region: process.env.AWS_REGION,
})

export default DynamoDBDocument.from(client, {
  marshallOptions: { removeUndefinedValues: true },
})
