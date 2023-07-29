import { Box } from 'caixa'
import { useEffect, useState } from 'react'
import useWebSocket from 'react-use-websocket'

enum ConnectionState {
  CONNECTING = 'CONNECTING',
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

enum QueueState {
  WAITING_FOR_GAME = 'WAITING_FOR_GAME',
  START_GAME = 'START_GAME',
  PLAYING = 'PLAYING',
  GAME_UPDATED = 'GAME_UPDATED',
  WIN = 'WIN',
  LOSE = 'LOSE',
  DRAW = 'DRAW',
}

type Marker = '' | 'X' | 'O'

type Board = [
  [Marker, Marker, Marker],
  [Marker, Marker, Marker],
  [Marker, Marker, Marker],
]

type Game = {
  gameId: string
  player: string
  marker: Marker
  state?: {
    gameOver: boolean
    whosTurn: string
    winner?: string
    board: Board
  }
}

const connectionStatesColors = {
  [ConnectionState.OFFLINE]: 'var(--dark-purple)',
  [ConnectionState.CONNECTING]: 'var(--blue)',
  [ConnectionState.ONLINE]: 'var(--green)',
}

const App = () => {
  const [started, setStarted] = useState<boolean>(false)
  const [message, setMessage] = useState('')
  const [queueState, setQueueState] = useState<QueueState | null>(null)
  const [game, setGame] = useState<Game>({
    gameId: '',
    player: '',
    marker: '',
  })
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.OFFLINE,
  )

  const { sendJsonMessage, lastJsonMessage } = useWebSocket<
    {
      event: string
      message?: string
    } & Game
  >(
    'wss://ws.tic-tac-toe.rafaelfranco.com',
    {
      onOpen: () => {
        setConnectionState(ConnectionState.ONLINE)
        setQueueState(QueueState.WAITING_FOR_GAME)
      },
      onClose: () => {
        setConnectionState(ConnectionState.OFFLINE)
      },
    },
    started,
  )

  useEffect(() => {
    if (started) {
      setConnectionState(ConnectionState.CONNECTING)
      sendJsonMessage({ action: 'requestGame' })
    }
  }, [sendJsonMessage, started])

  useEffect(() => {
    setTimeout(() => {
      setMessage('')
    }, 3000)
  }, [message])
  useEffect(() => {
    if (lastJsonMessage) {
      if (lastJsonMessage.event) {
        switch (lastJsonMessage.event) {
          case QueueState.WAITING_FOR_GAME:
            setQueueState(lastJsonMessage.event as QueueState)
            break
          case QueueState.START_GAME:
            setQueueState(lastJsonMessage.event as QueueState)
            setGame({
              gameId: lastJsonMessage.gameId,
              player: lastJsonMessage.player,
              marker: lastJsonMessage.marker,
              state: lastJsonMessage.state,
            })
            break
          case QueueState.GAME_UPDATED:
          case QueueState.WIN:
          case QueueState.LOSE:
          case QueueState.DRAW:
            setQueueState(lastJsonMessage.event as QueueState)
            setGame({
              gameId: game.gameId,
              player: game.player,
              marker: game.marker,
              state: lastJsonMessage.state,
            })
            break
        }
      }
      if (lastJsonMessage.message) {
        setMessage(lastJsonMessage.message)
      }
    }
  }, [game.gameId, game.marker, game.player, lastJsonMessage])

  const onSetMarker = (rowIndex: number, columnIndex: number) => {
    sendJsonMessage({
      action: 'markSquare',
      gameId: game.gameId,
      square: [rowIndex, columnIndex],
    })
  }

  const onRestartGame = () => {
    sendJsonMessage({ action: 'requestGame' })
    setGame({
      gameId: '',
      player: '',
      marker: '',
    })
    setQueueState(QueueState.WAITING_FOR_GAME)
  }

  return (
    <Box
      alignItems="center"
      display="flex"
      justifyContent="center"
      height="100vh"
      padding="1rem"
      position="relative"
      flexDirection="column"
      gap="1rem"
    >
      <Box
        backgroundColor={connectionStatesColors[connectionState]}
        borderRadius="1rem"
        height="1.25rem"
        position="absolute"
        right="1rem"
        top="1rem"
        width="1.25rem"
      />
      <Box
        alignItems="center"
        background="var(--red)"
        borderRadius="2rem"
        display="flex"
        flexDirection="column"
        height="100%"
        justifyContent="space-evenly"
        maxHeight="30rem"
        maxWidth="22rem"
        width="100%"
      >
        {!game.state ? (
          <>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              flex="1"
            >
              <Box as="h1" color="var(--yellow)" fontSize="10rem">
                XO
              </Box>
            </Box>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              flex="1"
            >
              {!started ? (
                <Box
                  as="button"
                  backgroundColor="var(--yellow)"
                  borderRadius="1rem"
                  color="var(--red)"
                  padding="1rem 2rem"
                  fontSize="1.5rem"
                  cursor="pointer"
                  animation="pulse 1s infinite"
                  type="button"
                  onClick={() => setStarted(true)}
                >
                  Start
                </Box>
              ) : null}
              {started ? (
                <Box color="var(--yellow)">
                  {connectionState === ConnectionState.CONNECTING
                    ? 'Connecting...'
                    : null}
                  {queueState === QueueState.WAITING_FOR_GAME
                    ? 'Waiting for opponent...'
                    : null}
                </Box>
              ) : null}
            </Box>
          </>
        ) : null}
        {game.state ? (
          <>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              as="h2"
              color="var(--yellow)"
              fontSize="2rem"
              flex="1"
            >
              {!game.state.winner
                ? game.state.whosTurn === game.player
                  ? 'Your turn'
                  : 'Opponents turn'
                : null}
              {game.state.winner
                ? game.state.winner === 'draw'
                  ? "It's a draw!"
                  : game.state.winner === game.player
                  ? 'You won!'
                  : 'You lost!'
                : null}
            </Box>
            <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" flex="1">
              {game.state.board.map((row, rowIndex) =>
                row.map((column, columnIndex) => {
                  const borders = [
                    [
                      { borderRightStyle: 'solid', borderBottomStyle: 'solid' },
                      {
                        borderLeftStyle: 'solid',
                        borderBottomStyle: 'solid',
                        borderRightStyle: 'solid',
                      },
                      { borderLeftStyle: 'solid', borderBottomStyle: 'solid' },
                    ],
                    [
                      {
                        borderTopStyle: 'solid',
                        borderRightStyle: 'solid',
                        borderBottomStyle: 'solid',
                      },
                      { borderStyle: 'solid' },
                      {
                        borderLeftStyle: 'solid',
                        borderBottomStyle: 'solid',
                        borderTopStyle: 'solid',
                      },
                    ],
                    [
                      {
                        borderRightStyle: 'solid',
                        borderTopStyle: 'solid',
                      },
                      {
                        borderLeftStyle: 'solid',
                        borderRightStyle: 'solid',
                        borderTopStyle: 'solid',
                      },
                      { borderLeftStyle: 'solid', borderTopStyle: 'solid' },
                    ],
                  ] as unknown as Record<string, string>[][]
                  return (
                    <Box
                      as="button"
                      backgroundColor="transparent"
                      width="6rem"
                      height="6rem"
                      cursor={column ? 'default' : 'pointer'}
                      borderColor="var(--yellow)"
                      borderWidth="2px"
                      onClick={() => onSetMarker(rowIndex, columnIndex)}
                      type="button"
                      fontSize="6rem"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      color="var(--yellow)"
                      {...borders[rowIndex][columnIndex]}
                    >
                      {column}
                    </Box>
                  )
                }),
              )}
            </Box>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              flex="1"
            >
              {game.state.winner ? (
                <Box
                  as="button"
                  backgroundColor="var(--yellow)"
                  borderRadius="1rem"
                  color="var(--red)"
                  padding="1rem 2rem"
                  fontSize="1.5rem"
                  cursor="pointer"
                  animation="pulse 1s infinite"
                  type="button"
                  onClick={onRestartGame}
                >
                  Play again
                </Box>
              ) : null}
              {message ? <Box color="var(--yellow)">{message}</Box> : null}
            </Box>
          </>
        ) : null}
      </Box>
      <Box color="var(--dark-purple)">
        v{import.meta.env.VITE_PACKAGE_VERSION}
      </Box>
    </Box>
  )
}

export default App
