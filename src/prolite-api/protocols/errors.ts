export class ProliteNackError extends Error {
  constructor() {
    super('NACK');
    this.name = "ProliteNackError";
    this.stack = (<any>new Error()).stack;
  }
}

export class ProliteChecksumError extends Error {
  constructor() {
    super('Checksum does not match');
    this.name = "ProliteChecksumError";
    this.stack = (<any>new Error()).stack;
  }
}

export class ProliteUnsupportedCommandError extends Error {
  constructor() {
    super('Unsupported Command');
    this.name = "UnsupportedCommandError";
    this.stack = (<any>new Error()).stack;
  }
}

export class ProliteUnknownResponseError extends Error {
  constructor() {
    super('Unknown Response');
    this.name = "UnknownResponseError";
    this.stack = (<any>new Error()).stack;
  }
}
