const fs = require("fs");
const JSONStream = require("JSONStream");
const { EOL } = require("os");

const Team = require("./team");

const { getTeamByShortname, getPlayersByTeamId } = require("./nba-service");
const { NBA } = require("./championship");
const GameNotifier = require("./game-notifier");

class NbaTeam extends Team {
  city;
  fullName;
  teamId;
  nickname;
  logoUrl;
  historicPlayers = [];
  gameNotifier;
  winCount = 0;
  defeatCount = 0;

  constructor(shortName) {
    super(shortName);
    this.gameNotifier = new GameNotifier();
  }

  async buildDataByName() {
    const teamData = await getTeamByShortname(this.name);

    this.city = teamData.city;
    this.fullName = teamData.fullName;
    this.teamId = teamData.teamId;
    this.nickname = teamData.nickname;
    this.logoUrl = teamData.logo;

    return true;
  }

  async buildPlayersByTeamId() {
    const playersData = await getPlayersByTeamId(this.name);

    this.players = playersData;

    return true;
  }

  importHistoricPlayers(historicPlayersFilePath) {
    const readStream = fs.createReadStream(historicPlayersFilePath, {
      encoding: "utf8",
    });
    const parser = JSONStream.parse("*");

    return new Promise((resolve, reject) => {
      readStream
        .on("error", function (err) {
          reject(err);
        })
        .pipe(parser)
        .on("data", (player) => {
          this.historicPlayers.push(player);
        })
        .on("end", () => {
          resolve(this.historicPlayers);
        });
    });
  }

  exportPlayers(playersDestFilePath) {
    const writeStream = fs.createWriteStream(playersDestFilePath, {
      encoding: "utf8",
    });

    return new Promise((resolve, reject) => {
      writeStream.on("finish", () => {
        resolve(true);
      });

      writeStream.on("error", (error) => {
        reject(error);
      });

      this.players.forEach((player) => {
        writeStream.write(JSON.stringify(player));
        writeStream.write(EOL);
      });

      writeStream.end();
    });
  }

  async register() {
    return await NBA.registerTeam(this);
  }

  async checkLatestResult() {
    return new Promise((resolve, reject) => {
      this.gameNotifier.on("won", () => {
        this.winCount += 1;
        resolve(`A new win :) Total : ${this.winCount}-${this.defeatCount}`);
      });

      this.gameNotifier.on("lost", () => {
        this.defeatCount += 1;
        resolve(`A new defeat :( Total : ${this.winCount}-${this.defeatCount}`);
      });

      this.gameNotifier.on("nothing", () => {
        this.defeatCount += 1;
        resolve(`No new results. Total : ${this.winCount}-${this.defeatCount}`);
      });

      this.gameNotifier.on("check_results_error", () => {
        this.defeatCount += 1;
        reject(new Error(`An error occurred when checking new results`));
      });

      this.gameNotifier.checkResults(this.teamId);
    });
  }
}

module.exports = NbaTeam;
