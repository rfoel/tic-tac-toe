import {
  APIGatewayProxyWebsocketHandlerV2,
  APIGatewayProxyWebsocketEventV2,
} from 'aws-lambda'

import onConnect from './onConnect'
import onDisconnect from './onDisconnect'
import onMarkSquare from './onMarkSquare'
import onMatchMaker from './onMatchMaker'

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
  matchMaker: onMatchMaker,
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = async event => {
  if (event.requestContext) {
    const { connectionId, routeKey } = event.requestContext
    const body = parseBody(event.body)
    if (actions[routeKey]) await actions[routeKey](connectionId, body)
  }

  return {}
}
