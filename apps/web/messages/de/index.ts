import common from './common.json'
import errors from './errors.json'
import nav from './nav.json'
import login from './login.json'
import rules from './rules.json'
import home from './home.json'
import players from './players.json'
import testMode from './testMode.json'
import ui from './ui.json'
import games from './games.json'
import gameForm from './gameForm.json'
import gameSetup from './gameSetup.json'
import sets from './sets.json'
import liveConsole from './liveConsole.json'
import liveTable from './liveTable.json'
import leaderboard from './leaderboard.json'
import stats from './stats.json'
import playerStats from './playerStats.json'
import roleSettings from './roleSettings.json'
import type { Messages } from '../en'

// Typed against the English messages: a missing key is a type error.
const messages: Messages = {
  common,
  errors,
  nav,
  login,
  rules,
  home,
  players,
  testMode,
  ui,
  games,
  gameForm,
  gameSetup,
  sets,
  liveConsole,
  liveTable,
  leaderboard,
  stats,
  playerStats,
  roleSettings,
}

export default messages
