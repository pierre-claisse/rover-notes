export class ConfigurationError extends Error {
  readonly name = "ConfigurationError";
}

export class IntegrityError extends Error {
  readonly name = "IntegrityError";
  constructor() {
    super("Intégrité refusée");
  }
}
