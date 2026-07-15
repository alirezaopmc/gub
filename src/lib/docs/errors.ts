export class DocPathError extends Error {
  constructor(message = "Invalid doc path") {
    super(message)
    this.name = "DocPathError"
  }
}

export class DocNotFoundError extends Error {
  constructor(relativePath: string) {
    super(`Doc not found: ${relativePath}`)
    this.name = "DocNotFoundError"
  }
}
