import db from '../../utils/db'
import { sendMessage } from '../../utils/websocket'

type Marker = '' | 'X' | 'O'

type Board = [
  [Marker, Marker, Marker],
  [Marker, Marker, Marker],
  [Marker, Marker, Marker],
]

const checkForWin = (marker: Marker, board: Board) => {
  const conditions = [
    [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [2, 0],
      [2, 1],
      [2, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [0, 2],
      [1, 2],
      [2, 2],
    ],
    [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
    [
      [0, 2],
      [1, 1],
      [2, 0],
    ],
  ]

  return conditions.some((condition) =>
    condition.every(([x, y]) => board[x][y] === marker),
  )
}

const checkForDraw = (board: Board) => {
  return board.every((row) => {
    return row.every((square) => {
      return square !== ''
    })
  })
}

const updateGameWinner = async (pk: string, winner: string) => {
  await db.update({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk,
      sk: 'sk',
    },
    UpdateExpression:
      'SET #state.#winner = :winner, #state.#gameOver = :gameOver',
    ExpressionAttributeNames: {
      '#state': 'state',
      '#winner': 'winner',
      '#gameOver': 'gameOver',
    },
    ExpressionAttributeValues: {
      ':winner': winner,
      ':gameOver': true,
    },
  })
}

export default async (
  connectionId: string,
  {
    gameId,
    square,
  }: {
    gameId: string
    square: [number, number]
  },
) => {
  const response = await db.get({
    TableName: process.env.TABLE_NAME,
    Key: { pk: `game#${gameId}`, sk: 'sk' },
  })

  const game = response.Item

  if (game.state.gameOver) {
    await sendMessage([connectionId], { message: 'This game has ended.' })
    return
  }

  if (game.players[game.state.whosTurn].connectionId !== connectionId) {
    await sendMessage([connectionId], { message: 'Not your turn.' })
    return
  }

  if (game.state.board[square[0]][square[1]] !== '') {
    await sendMessage([connectionId], {
      message: 'Square already taken. Please try again.',
    })
    return
  }

  game.state.board[square[0]][square[1]] =
    game.players[game.state.whosTurn].marker

  if (checkForWin(game.players[game.state.whosTurn].marker, game.state.board)) {
    game.state.gameOver = true
    game.state.winner = game.state.whosTurn
    await updateGameWinner(game.pk, game.state.winner)
    await sendMessage([connectionId], {
      event: 'WIN',
      state: game.state,
    })
    const loser =
      game.players[game.state.whosTurn === 'player1' ? 'player2' : 'player1']
    await sendMessage([loser.connectionId], {
      event: 'LOSE',
      state: game.state,
    })
    return
  }

  if (checkForDraw(game.state.board)) {
    game.state.gameOver = true
    game.state.winner = 'draw'
    await updateGameWinner(game.pk, 'draw')
    await sendMessage(
      [game.players.player1.connectionId, game.players.player2.connectionId],
      {
        event: 'DRAW',
        state: game.state,
      },
    )
    return
  }

  game.state.whosTurn =
    game.state.whosTurn === 'player1' ? 'player2' : 'player1'

  await db.update({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk: game.pk,
      sk: 'sk',
    },
    UpdateExpression:
      'SET #state.#board = :board, #state.#whosTurn = :whosTurn',
    ExpressionAttributeNames: {
      '#state': 'state',
      '#board': 'board',
      '#whosTurn': 'whosTurn',
    },
    ExpressionAttributeValues: {
      ':board': game.state.board,
      ':whosTurn': game.state.whosTurn,
    },
  })

  await sendMessage(
    [game.players.player1.connectionId, game.players.player2.connectionId],
    { event: 'GAME_UPDATED', state: game.state },
  )

  await sendMessage([game.players[game.state.whosTurn].connectionId], {
    event: 'BEGIN_TURN',
  })
}
