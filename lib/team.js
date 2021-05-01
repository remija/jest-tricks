class Team {
  name;
  players = [];

  constructor(name) {
    this.name = name;
  }

  addPlayer(player) {
    this.players.push(player);
  }

  async register() {
    return Promise.resolve(true);
  }
}

module.exports = Team;
