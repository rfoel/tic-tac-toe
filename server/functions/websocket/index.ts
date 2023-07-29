import {
  APIGatewayProxyWebsocketHandlerV2,
  APIGatewayProxyWebsocketEventV2,
} from 'aws-lambda'

import onConnect from './onConnect'
import onDisconnect from './onDisconnect'
import onMarkSquare from './onMarkSquare'
import onRequestGame from './onRequestGame'

const parseBody = (body: APIGatewayProxyWebsocketEventV2['body']) => {
  try {
    if (body) {
      const parsed = JSON.parse(body)
      return parsed
    }
    return {}
  } catch {
    return {}
  }
}

const actions = {
  $connect: onConnect,
  $disconnect: onDisconnect,
  markSquare: onMarkSquare,
  requestGame: onRequestGame,
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  try {
    if (event.requestContext) {
      const { connectionId, routeKey } = event.requestContext
      const body = parseBody(event.body)
      if (actions[routeKey]) await actions[routeKey](connectionId, body)
    }
  } catch (error) {
    console.log(error)
  } finally {
    return {}
  }
}
