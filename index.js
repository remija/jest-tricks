const NbaTeam = require("./lib/nba-team");

const bostonCeltics = new NbaTeam("BOS");

(async () => {
  console.log("test buildDataByName");

  await bostonCeltics.buildDataByName();

  console.log(bostonCeltics);

  console.log("test importHistoricPlayers");

  const historicPlayers = await bostonCeltics.importHistoricPlayers(
    "./historic-players.json"
  );

  console.log(historicPlayers);

  console.log("test exportPlayers");

  bostonCeltics.players = [
    {
      firstName: "Jaylen",
      lastName: "Brown",
      teamId: "2",
      yearsPro: "4",
      collegeName: "California",
      country: "USA",
      playerId: "75",
      dateOfBirth: "1996-10-24",
      affiliation: "California/USA",
      startNba: "2016",
      heightInMeters: "1.98",
      weightInKilograms: "101.2",
    },
    {
      firstName: "Evan",
      lastName: "Fournier",
      teamId: "2",
      yearsPro: "8",
      collegeName: "Poitiers Basket 86",
      country: "France",
      playerId: "177",
      dateOfBirth: "1992-10-29",
      affiliation: "Poitiers Basket 86/France",
      startNba: "2012",
      heightInMeters: "2.01",
      weightInKilograms: "93.0",
    },
    {
      firstName: "Marcus",
      lastName: "Smart",
      teamId: "2",
      yearsPro: "6",
      collegeName: "Oklahoma State",
      country: "USA",
      playerId: "486",
      dateOfBirth: "1994-03-06",
      affiliation: "Oklahoma State/USA",
      startNba: "2014",
      heightInMeters: "1.9",
      weightInKilograms: "99.8",
    },
    {
      firstName: "Jayson",
      lastName: "Tatum",
      teamId: "2",
      yearsPro: "3",
      collegeName: "Duke",
      country: "USA",
      playerId: "882",
      dateOfBirth: "1998-03-03",
      affiliation: "Duke/USA",
      startNba: "2017",
      heightInMeters: "2.03",
      weightInKilograms: "95.3",
    },
  ];
  try {
    await bostonCeltics.exportPlayers("./exported-players.json");
  } catch (error) {
    console.log(error);
  }
})();
