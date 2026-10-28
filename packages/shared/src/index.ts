// Domain
export * from './domain/factions.js'
export * from './domain/archetypes.js'
export * from './domain/roles.js'
export * from './domain/win-conditions.js'

// DTOs (Zod schemas + types)
export * from './dto/auth.js'
export * from './dto/player.js'
export * from './dto/game.js'
export * from './dto/dev.js'
export * from './dto/errors.js'

// Events (event-sourcing envelope)
export * from './events/events.js'

// i18n (locales and translated domain texts)
export * from './i18n/index.js'

// Engine (event-sourcing reducer, death cascades, win evaluation)
export * from './engine/index.js'

// Statistics (pure functions)
export * from './stats/types.js'
export * from './stats/scoring.js'
export * from './stats/compute.js'
export * from './stats/analysis.js'
export * from './stats/sets.js'
