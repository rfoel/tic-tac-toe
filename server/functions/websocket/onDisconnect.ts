import db from '../../utils/db'
import { sendMessage } from '../../utils/websocket'

export default async (connectionId: string) => {
  const gameResponse = await db.get({
    TableName: process.env.TABLE_NAME,
    Key: { pk: `connection#${connectionId}` },
    AttributesToGet: ['gameId'],
  })

  if (gameResponse.Item) {
    const { players, sk, state } = gameResponse.Item

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
          pk: `game#${gameResponse.Item.gameId}`,
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
    },
  })
}
