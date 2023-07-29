import db from '../../utils/db'

export default async (connectionId: string) => {
  await db.put({
    TableName: process.env.TABLE_NAME,
    Item: {
      pk: `connection#${connectionId}`,
      sk: 'sk',
      connected: new Date().toISOString(),
    },
    ConditionExpression: 'attribute_not_exists(pk)',
  })

  await db.update({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk: 'connections',
      sk: 'sk',
    },
    UpdateExpression: 'SET #n = if_not_exists(#n, :start) + :increment',
    ExpressionAttributeNames: {
      '#n': 'n',
    },
    ExpressionAttributeValues: {
      ':increment': 1,
      ':start': 0,
    },
  })
}
