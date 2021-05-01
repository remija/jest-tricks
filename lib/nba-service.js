const request = require("request");

const getTeamByShortname = (shortName) => {
  const getCityUrl = `https://api-nba-v1.p.rapidapi.com/teams/shortName/${shortName}`;

  const options = {
    method: "GET",
    url: getCityUrl,
    headers: {
      "x-rapidapi-key": "my-api-key",
      "x-rapidapi-host": "api-nba-v1.p.rapidapi.com",
      useQueryString: true,
    },
  };

  return new Promise((resolve, reject) => {
    request(options, function (error, response, body) {
      if (error) {
        reject(error);
      }

      const bodyJson = JSON.parse(body);

      resolve(bodyJson.api.teams[0]);
    });
  });
};

const getPlayersByTeamId = (teamId) => {
  const getCityUrl = `https://api-nba-v1.p.rapidapi.com/players/teamId/${teamId}`;

  const options = {
    method: "GET",
    url: getCityUrl,
    headers: {
      "x-rapidapi-key": "my-api-key",
      "x-rapidapi-host": "api-nba-v1.p.rapidapi.com",
      useQueryString: true,
    },
  };

  return new Promise((resolve, reject) => {
    request(options, function (error, response, body) {
      if (error) {
        reject(error);
      }

      const bodyJson = JSON.parse(body);

      resolve(bodyJson.api.players);
    });
  });
};

module.exports = {
  getTeamByShortname,
  getPlayersByTeamId,
};
