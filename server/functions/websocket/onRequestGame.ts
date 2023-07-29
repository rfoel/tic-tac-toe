import { randomUUID } from 'crypto'

import { SQS } from '@aws-sdk/client-sqs'

import db from '../../utils/db'
import { sendMessage } from '../../utils/websocket'

const sqs = new SQS({})

const getConnectionFromQueue = async () => {
  const response = await sqs.receiveMessage({
    QueueUrl: process.env.QUEUE_URL,
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 2,
  })

  if (response.Messages) {
    return response.Messages[0]
  }

  return null
}

const removeConnectionFromQueue = async (receiptHandle: string) => {
  await sqs.deleteMessage({
    QueueUrl: process.env.QUEUE_URL,
    ReceiptHandle: receiptHandle,
  })
}

const addConnectionToQueue = async (connectionId: string) => {
  await sqs.sendMessage({
    QueueUrl: process.env.QUEUE_URL,
    MessageBody: connectionId,
  })
}

const isPlayerConnected = async (connectionId: string) => {
  const response = await db.get({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk: `connection#${connectionId}`,
      sk: 'sk',
    },
  })
  return Boolean(response.Item)
}

const createGame = async (
  gameId: string,
  players: { player1: string; player2: string },
) => {
  const game = {
    pk: `game#${gameId}`,
    sk: 'sk',
    ttl: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    players: {
      player1: {
        connectionId: players.player1,
        marker: 'X',
      },
      player2: {
        connectionId: players.player2,
        marker: 'O',
      },
    },
    state: {
      whosTurn: 'player1',
      gameOver: false,
      winner: null,
      board: [
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
      ],
    },
  }

  await db.put({
    TableName: process.env.TABLE_NAME,
    Item: game,
  })

  return game
}

const addGameToConnections = async (
  gameId: string,
  connectionIds: string[],
) => {
  await Promise.all(
    connectionIds.map((id) => {
      return db.update({
        TableName: process.env.TABLE_NAME,
        Key: {
          pk: `connection#${id}`,
          sk: 'sk',
        },
        UpdateExpression: 'SET gameId = :gameId',
        ExpressionAttributeValues: {
          ':gameId': gameId,
        },
      })
    }),
  )
}

export default async (connectionId: string) => {
  const message = await getConnectionFromQueue()

  if (message) {
    if (connectionId === message.Body) return

    if (!(await isPlayerConnected(message.Body))) {
      await removeConnectionFromQueue(message.ReceiptHandle)
      await addConnectionToQueue(connectionId)
      await sendMessage([connectionId], { event: 'WAITING_FOR_GAME' })
      return
    }

    const gameId = randomUUID()
    const player1 = connectionId
    const player2 = message.Body
    const [game] = await Promise.all([
      createGame(gameId, { player1, player2 }),
      removeConnectionFromQueue(message.ReceiptHandle),
      addGameToConnections(gameId, [player1, player2]),
    ])
    await Promise.all([
      sendMessage([player1], {
        event: 'START_GAME',
        gameId,
        state: game.state,
        player: 'player1',
        marker: 'X',
      }),
      sendMessage([player2], {
        event: 'START_GAME',
        gameId,
        state: game.state,
        player: 'player2',
        marker: 'O',
      }),
    ])
    await sendMessage([player1], {
      event: 'BEGIN_TURN',
    })
  } else {
    await addConnectionToQueue(connectionId)
    await sendMessage([connectionId], { event: 'WAITING_FOR_GAME' })
  }

  return {}
}
