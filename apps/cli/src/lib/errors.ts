/** An expected failure: printed as a message (plus optional hint) instead of a stack trace. */
export class CliError extends Error {
  readonly hint: string | undefined
  readonly exitCode: number

  constructor(message: string, hint?: string, exitCode = 1) {
    super(message)
    this.name = 'CliError'
    this.hint = hint
    this.exitCode = exitCode
  }
}

/** The user pressed Ctrl+C or Escape in a prompt. */
export class CancelledError extends Error {
  constructor() {
    super('Cancelled')
    this.name = 'CancelledError'
  }
}
