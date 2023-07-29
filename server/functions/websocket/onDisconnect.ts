import db from '../../utils/db'
import { sendMessage } from '../../utils/websocket'

export default async (connectionId: string) => {
  const connection = await db.get({
    TableName: process.env.TABLE_NAME,
    Key: { pk: `connection#${connectionId}`, sk: 'sk' },
    AttributesToGet: ['gameId'],
  })

  if (connection.Item.gameId) {
    const { Item } = await db.get({
      TableName: process.env.TABLE_NAME,
      Key: { pk: `connection#${connectionId}`, sk: 'sk' },
      AttributesToGet: ['gameId'],
    })

    const { pk, players, sk, state } = Item

    if (!state.gameOver) {
      const remainingPlayer =
        players.player1.connectionId === connectionId ? 'player2' : 'player1'

      state.gameOver = true
      state.winner = remainingPlayer

      await sendMessage([players[remainingPlayer].connectionId], {
        event: 'OPPONENT_DISCONNECTED',
        state,
      })

      await db.update({
        TableName: process.env.TABLE_NAME,
        Key: {
          pk,
          sk,
        },
        UpdateExpression:
          'SET #state.#gameOver = :gameOver, #state.#winner = :winner',
        ExpressionAttributeNames: {
          '#state': 'state',
          '#gameOver': 'gameOver',
          '#winner': 'winner',
        },
        ExpressionAttributeValues: {
          ':gameOver': true,
          ':winner': remainingPlayer,
        },
      })
    }
  }

  await db.update({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk: 'connections',
      sk: 'sk',
    },
    UpdateExpression: 'SET #n = if_not_exists(#n, :start) - :decrement',
    ExpressionAttributeNames: {
      '#n': 'n',
    },
    ExpressionAttributeValues: {
      ':decrement': 1,
      ':start': 0,
    },
    ReturnValues: 'UPDATED_NEW',
  })

  await db.delete({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk: `connection#${connectionId}`,
      sk: 'sk',
    },
  })
}
