export const log = (...content: any[]) => {
  try {
    console.log(JSON.stringify(content, null, 2))
  } catch {
    console.log(content)
  }
}

export const logger = {
  debug: log,
  error: log,
  info: log,
  warn: log,
  trace: log,
}
