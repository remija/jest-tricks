const { EventEmitter } = require("events");

class GameNotifier extends EventEmitter {
  checkResults(teamId) {
    // Game notifier will check results and send events in order to notify team
    // ...
  }

  whenWon(game) {
    this.emit("won", game);
  }

  whenLost(game) {
    this.emit("lost", game);
  }

  // ...
}

module.exports = GameNotifier;
