class Championship {
  teams = [];

  constructor() {}

  registerTeam(team) {
    return new Promise((resolve, reject) => {
      if (team) {
        resolve(true);
      }

      reject(new Error("unable to register team"));
    });
  }
}

const nbaChampionship = new Championship();

module.exports = {
  Championship,
  NBA: nbaChampionship,
};
