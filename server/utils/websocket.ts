import { ApiGatewayManagementApi } from '@aws-sdk/client-apigatewaymanagementapi'

const client = new ApiGatewayManagementApi({
  endpoint: process.env.WEBSOCKET_ENDPOINT,
})

export const sendMessage = (
  connectionIds: string[],
  data: Record<string, unknown>,
) => {
  return Promise.all(
    connectionIds.map(id => {
      return client.postToConnection({
        ConnectionId: id,
        Data: Buffer.from(JSON.stringify(data)),
      })
    }),
  )
}
