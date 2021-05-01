const { Readable, Writable } = require("stream");
const { EOL } = require("os");
const { EventEmitter } = require("events");

const mockRegisterTeam = jest.fn();

const mockNbaChampionship = {
  registerTeam: mockRegisterTeam,
};

const championshipFactory = () => {
  const originalChampionship = jest.requireActual("./championship");
  return {
    ...originalChampionship,
    NBA: mockNbaChampionship,
  };
};

jest.mock("./championship", () => championshipFactory());

const mockRequest = jest.fn();

jest.mock("request", () => mockRequest);

const mockGetTeamByShortname = jest.fn();

const nbaServiceFactory = () => {
  const originalNbaService = jest.requireActual("./nba-service");
  return {
    ...originalNbaService,
    getTeamByShortname: mockGetTeamByShortname,
  };
};

jest.mock("./nba-service", () => nbaServiceFactory());

const mockGameNotifier = new EventEmitter();
mockGameNotifier.checkResults = jest.fn();

const gameNotifierFactory = () =>
  jest.fn().mockImplementation(() => mockGameNotifier);

jest.mock("./game-notifier", () => gameNotifierFactory());

const mockReadStream = jest.fn();
const mockWriteStream = jest.fn();

jest.mock("fs", () => ({
  createReadStream: mockReadStream,
  createWriteStream: mockWriteStream,
}));

describe("NbaTeam", () => {
  let team;

  let NbaTeam;

  const players = [
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

  beforeAll(() => {
    NbaTeam = require("./nba-team");
    team = new NbaTeam("BOS");
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("addPlayer", () => {
    it("should add player when player is defined", () => {
      // given
      const player = {
        firstName: "Jayson",
        lastName: "Tatum",
      };
      team.players = [];
      team.teamId = "2";

      // when
      team.addPlayer(player);

      // then
      expect(team.players).toEqual([
        {
          firstName: "Jayson",
          lastName: "Tatum",
        },
      ]);
    });
  });

  describe("register", () => {
    it("should register team when championship register service works", async () => {
      // given
      mockRegisterTeam.mockResolvedValue(true);

      // when
      const registrationResult = await team.register();

      // then
      expect(registrationResult).toEqual(true);
    });

    it("should throw error when championship register service does not work", async () => {
      // given
      mockRegisterTeam.mockRejectedValue(new Error("unable to register team"));

      // when - then
      await expect(team.register()).rejects.toThrow(
        new Error("unable to register team")
      );
    });
  });

  describe("buildDataByName", () => {
    it("should build team data when NBA service works", async () => {
      // given
      mockGetTeamByShortname.mockResolvedValue({
        city: "Boston",
        fullName: "Boston Celtics",
        teamId: "2",
        nickname: "Celtics",
        logo:
          "https://upload.wikimedia.org/wikipedia/fr/thumb/6/65/Celtics_de_Boston_logo.svg/1024px-Celtics_de_Boston_logo.svg.png",
        shortName: "BOS",
        allStar: "0",
        nbaFranchise: "1",
        leagues: {
          standard: { confName: "East", divName: "Atlantic" },
          vegas: { confName: "summer", divName: "" },
        },
      });

      // when
      const buildResult = await team.buildDataByName();

      // then
      expect(buildResult).toEqual(true);
    });

    it("should throw error when NBA service does not work", async () => {
      // given
      mockGetTeamByShortname.mockRejectedValue(
        new Error("unable to call service")
      );

      // when - then
      await expect(team.buildDataByName()).rejects.toThrow(
        new Error("unable to call service")
      );
    });
  });

  describe("buildPlayersByTeamId", () => {
    it("should build players data when NBA service works", async () => {
      // given
      const apiBodyResponse = {
        api: {
          status: 200,
          message: "GET players/teamId/2",
          players: players,
        },
      };

      mockRequest.mockImplementation((options, callback) => {
        callback(null, {}, JSON.stringify(apiBodyResponse));
      });

      team.players = [];
      team.teamId = "2";

      // when
      const buildResult = await team.buildPlayersByTeamId();

      // then
      expect(buildResult).toEqual(true);
      expect(team.players).toEqual(players);
      expect(mockRequest).toBeCalledTimes(1);
    });

    it("should throw error when NBA service does not work", async () => {
      // given
      mockRequest.mockImplementation((options, callback) => {
        callback(new Error("an error occurred when calling API"), {}, null);
      });
      team.players = [];

      // when - then
      await expect(team.buildPlayersByTeamId()).rejects.toThrow(
        new Error("an error occurred when calling API")
      );
      expect(team.players).toEqual([]);
      expect(mockRequest).toBeCalledTimes(1);
    });
  });

  describe("importHistoricPlayers", () => {
    it("should import historic players data when data are well formatted", async () => {
      // given
      mockReadStream.mockImplementation(() => {
        const readable = new Readable();
        readable.push(
          '[{\r\n  "firstName":"Bob",\r\n  "lastName":"Cousy",\r\n  "country":"USA",\r\n  "dateOfBirth":"1928-08-09",\r\n  "number":"14",\r\n  "period":"1950-1963"\r\n},\r\n{\r\n  "firstName":"Bill",\r\n  "lastName":"Russell",\r\n  "country":"USA",\r\n  "dateOfBirth":"1934-02-12"'
        );
        readable.push(
          ',\r\n  "number":"0",\r\n  "period":"1956-1969"\r\n},\r\n{\r\n"firstName":"John",\r\n"lastName":"Havlicek",\r\n"country":"USA",\r\n"d'
        );
        readable.push(
          'ateOfBirth":"1940-04-08",\r\n"number":"17",\r\n"period":"1962-1978"\r\n},\r\n{\r\n"firstName":'
        );
        readable.push(
          '"Larry",\r\n"lastName":"Bird",\r\n"country":"USA",\r\n"dateOfBirth":"1956-12-07",\r\n"number":"33",\r\n"period":"1979-1992"\r\n}]'
        );
        readable.push(null); // essentiel afin de signifier la fin du flux de données

        return readable;
      });

      team.historicPlayers = [];

      // when
      const historicPlayers = await team.importHistoricPlayers("my-file.json");

      // then
      expect(mockReadStream).toBeCalledTimes(1);
      expect(historicPlayers).toEqual([
        {
          firstName: "Bob",
          lastName: "Cousy",
          country: "USA",
          dateOfBirth: "1928-08-09",
          number: "14",
          period: "1950-1963",
        },
        {
          firstName: "Bill",
          lastName: "Russell",
          country: "USA",
          dateOfBirth: "1934-02-12",
          number: "0",
          period: "1956-1969",
        },
        {
          firstName: "John",
          lastName: "Havlicek",
          country: "USA",
          dateOfBirth: "1940-04-08",
          number: "17",
          period: "1962-1978",
        },
        {
          firstName: "Larry",
          lastName: "Bird",
          country: "USA",
          dateOfBirth: "1956-12-07",
          number: "33",
          period: "1979-1992",
        },
      ]);
    });

    it("should throw error when unable to import file", async () => {
      // given
      mockReadStream.mockImplementation(() => {
        const readable = new Readable({
          read(size) {
            this.emit(
              "error",
              new Error("an error occurred when reading stream")
            );
          },
        });

        return readable;
      });

      team.historicPlayers = [];

      // when
      const importPromise = team.importHistoricPlayers();

      // then
      await expect(importPromise).rejects.toThrow(
        new Error("an error occurred when reading stream")
      );
      expect(mockReadStream).toBeCalledTimes(1);
      expect(team.historicPlayers).toEqual([]);
    });
  });

  describe("exportPlayers", () => {
    it("should export players data when data are well formatted", async () => {
      // given
      let playersData = "";

      const writable = new Writable({
        write(chunk, encoding, next) {
          playersData += chunk;
          next();
        },
      });

      mockWriteStream.mockImplementation(() => {
        return writable;
      });

      team.players = players;

      // when
      await team.exportPlayers("my-export-file.json");

      // then
      expect(mockWriteStream).toBeCalledTimes(1);
      const reducerFn = (playersData, player) =>
        `${playersData}${JSON.stringify(player)}${EOL}`;
      const expectedPlayersData = players.reduce(reducerFn, "");
      expect(playersData).toEqual(expectedPlayersData);
    });

    it("should throw error when unable to export file", async () => {
      // given
      const errorWritable = new Writable({
        write(chunk, encoding, next) {
          next(new Error("an error occurred when writing stream"));
        },
      });

      mockWriteStream.mockImplementation(() => {
        return errorWritable;
      });

      team.players = players;

      // when
      const exportPromise = team.exportPlayers("my-export-file.json");

      // then
      await expect(exportPromise).rejects.toThrow(
        new Error("an error occurred when writing stream")
      );
      expect(mockWriteStream).toBeCalledTimes(1);
    });
  });

  describe("checkLatestResult", () => {
    it("should add a win to result and resolve summary message when game notifier emits a Win event", async () => {
      // given
      team.winCount = 42;
      team.defeatCount = 20;

      // when
      const checkResultPromise = team.checkLatestResult();

      team.gameNotifier.emit("won");

      // then
      await expect(checkResultPromise).resolves.toEqual(
        "A new win :) Total : 43-20"
      );
      expect(team.winCount).toEqual(43);
    });

    it("should reject with error when game notifier emits an error event", async () => {
      // given

      // when
      const checkResultPromise = team.checkLatestResult();

      team.gameNotifier.emit("check_results_error");

      // then
      await expect(checkResultPromise).rejects.toEqual(
        new Error("An error occurred when checking new results")
      );
    });
  });
});
