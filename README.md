# NodeJS: quelques trucs et astuces pour vos tests avec Jest

## Introduction

Il y a quelques semaines, j'ai réalisé une migration des tests unitaires et des scénarios Gherkin des librairies de
tests Mocha, Sinon, Chai vers la librairie Jest.

Je connaissais déjà Jest pour l'avoir pratiqué à plus petite échelle par le passé. Ce travail de migration fut de longue
haleine mais cela m'a permet de développer mes compétences et connaissances autour de cette librairie.

Je souhaite donc faire part de quelques trucs et astuces basés sur des exemples concrets pour aider à la prise en main
de Jest

Jest présente de nombreux avantages :

- permet de se configurer de manière simple
- permet d'éxécuter les tests en parallèle et de manière isolée (les tests s'éxécutent ainsi plus rapidement)
- possède une communauté d'utilisateurs et de contributeurs très importante
- compatible avec la syntaxe Jasmine (la migration est ainsi facilitée)

## Un projet d'exemple

J'ai conçu un petit projet NodeJS autour du championnat de basket de la NBA afin d'exposer différentes situations
emblématiques lorsque l'on cherche à tester une application NodeJS :

- comment "mocker" en partie un module ?
- comment "mocker" un module externe ?
- comment "mocker" des méthodes asynchrones avec promesses ?
- comment "mocker" des méthodes asynchrones avec callback ?
- comment "mocker" des Streams en lecture ?
- comment "mocker" des Streams en écriture ?
- comment "mocker" un EventEmitter ?

Le module *championship* expose une classe ES6 Championship ainsi qu'un objet Championship NBA. Le module *team* expose
une classe ES6 Team permettant de modéliser une équipe sportive. 
Le module *nba-team* expose une classe ES6 étendant Team, NBATeam.
Le module *nba-service* expose des services permettant de récupérer des données concernant les équipes et joueurs NBA.
Le module *game-notifier* expose une classe GameNotifier étendant un EventEmitter, permettant de se renseigner sur les résultats NBA.

J'ai écrit plusieurs tests unitaires autour des :four_leaf_clover: <span style="color:green">Boston Celtics</span> :four_leaf_clover: pour le module *nba-team* qui permettent de découvrir comment tester tous les cas de
figure cités plus haut.

Allez, on regarde tout ça !

<p style="text-align: center;">
    <img src="https://media.giphy.com/media/sQpl7yebgk3Pq/giphy.gif">
</p>

## Comment "mocker" en partie un module ?

NBATeam requiert l'objet Championship NBA du module *championship*.

**nba-team.js**
```javascript
...
const {NBA} = require("./championship");
...

class NbaTeam extends Team {
...

    constructor(shortName) {
        super(shortName);
    ...
    }

...

    async register() {
        return await NBA.registerTeam(this);
    }

...

}

```

On souhaite tester la méthode *register* qui fait appel à la méthode *registerTeam*. 
Pour cela nous allons devoir "mocker" le championnat NBA et modifier le comportement de la méthode *registerTeam* suivant les cas de figure.
Par contre, on ne souhaite pas "mocker" tout le module *championship*.

```javascript
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
```

Pour cela, Jest propose la méthode *requireActual* qui permet de récupérer l'implémentation originale du module puis
ensuite on peut surcharger ce que l'on a réellement besoin de "mocker".

## Comment "mocker" des méthodes asynchrones avec promesses ?

La méthode *registerTeam* du championnat NBA est asynchrone. Il nous faut donc définir le comportement de celle-ci dans
tous les cas à couvrir.

```javascript
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
```

Pour cela, on va notamment s'appuyer de sur les méthodes *mockResolvedValue* et *mockRejectedValue* qui permettent de
simuler le résultat de méthodes asynchrones à base de promesses Javascript natives.

> Attention, il ne faut pas utiliser ces méthodes raccourcies si vos méthodes se basent sur une librairie de promesses type Bluebird.
> ex :
> ```javascript
> mockRegisterTeam.mockImplementation(() => BluebirdPromise.resolves(true));
> ```

## Comment "mocker" un module externe ?

NBATeam requiert certaines méthodes du module *nba-service*. Ce service effectue des appels à une API exposée sur
Internet (voir [l'API NBA](https://rapidapi.com/api-sports/api/api-nba)).

On utilise la librairie *request* pour effectuer les appels REST vers cette API.

**nba-team.js**
```javascript
...
const {getTeamByShortname, getPlayersByTeamId} = require("./nba-service");
...

class NbaTeam extends Team {
...

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

...

}

```

Nous allons donc devoir "mocker" les appels pour couvrir tous les cas de figure.

```javascript
const mockRequest = jest.fn();

jest.mock("request", () => mockRequest);
```

> Le nommage des objets pour "mocker" un module est important. En effet il faut absolument les préfixer par "mock".
> Dans le cas contraire, Jest provoque une erreur.

## Comment "mocker" des méthodes asynchrones avec callback ?

La méthode *request* permet de faire des appels HTTP asynchrones. On récupère le résultat grâce à une méthode callback.

**nba-service.js**
```javascript
const request = require("request");

const getPlayersByTeamId = (teamId) => {
    const getCityUrl = `https://api-nba-v1.p.rapidapi.com/players/teamId/${teamId}`;

    const options = {
        method: "GET",
        url: getCityUrl,
        headers: {
            "x-rapidapi-key": "xxx",
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
```

Nous allons tester la méthode *buildPlayersByTeamId* de NbaTeam qui fait elle-même appel à la méthode
*getPlayersByTeamId* qui utilise *request* pour charger les données.

```javascript
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
```

La méthode *request* prend deux paramètres, dont la méthode callback. Il suffit de surcharger *request*
grâce à *mockImplementation* et faire en sorte d'appeler le callback (une méthode avec trois paramètres) avec les bons
paramètres suivant les situations testées.

## Comment "mocker" des Streams en lecture ?

NbaTeam propose une méthode *importHistoricPlayers* pour importer une liste de joueurs historiques dans l'équipe à
partir d'un fichier JSON. On utilise pour cela la méthode *createReadStream* du module *fs*.

**nba-team.js**
```javascript
...
const fs = require("fs");
const JSONStream = require("JSONStream");
...

class NbaTeam extends Team {
...

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

...

}

```

On commence par "mocker" la méthode *createReadStream* du module *fs*.

```javascript
const mockReadStream = jest.fn();
const mockWriteStream = jest.fn();

jest.mock("fs", () => ({
    createReadStream: mockReadStream,
    createWriteStream: mockWriteStream,
}));
```

On simule la lecture d'un fichier JSON en créant un stream de lecture simple dans lequel on insère plusieurs "chunks" de
données.

```javascript
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
            ...
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
```

On simule une erreur dans la lecture d'un fichier JSON en émettant une erreur (les Streams héritent d'un EventEmitter).

```javascript
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
```

## Comment "mocker" des Streams en écriture ?

NbaTeam propose une méthode *exportPlayers* pour exporter la liste des joueurs de l'équipe dans un fichier JSON. On
utilise pour cela la méthode *createWriteStream* du module *fs*.

**nba-team.js**
```javascript
class NbaTeam extends Team {
...

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

...

}
```

Comme vu précédemment, on avait "mocké" la méthode *createWriteStream* du module *fs*.

On simule l'écriture d'un fichier JSON en créant un stream d'écriture simple dans lequel on va concaténer le contenu à
écrire. La méthode de callback permet d'indiquer que le chunk a été traité. Dans le cas d'une erreur, on appelle la
callback avec l'erreur en paramètre.

```javascript
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

...
});
```

## Comment "mocker" un EventEmitter ?

NbaTeam propose une méthode *checkLatestResult* qui permet de récupérer le dernier résultat de l'équipe et d'incrémenter
les compteurs de victoires et de défaites. Pour cela, un GameNotifier émet des événements qui sont ensuite traités par
NbaTeam.

**nba-team.js**
```javascript
class NbaTeam extends Team {
...

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

...

}
```

On commence par "mocker" le module *game-notifier*. On déclare le GameNotifier "mocké" comme EventEmitter pour profiter
du prototype. On va ensuite "mocker" avec Jest les méthodes supplémentaires qui le nécessite.

```javascript
const mockGameNotifier = new EventEmitter();
mockGameNotifier.checkResults = jest.fn();

const gameNotifierFactory = () =>
    jest.fn().mockImplementation(() => mockGameNotifier);

jest.mock("./game-notifier", () => gameNotifierFactory());
```

La méthode *checkLatestResult* est asynchrone. Il faut donc faire en sorte d'émettre les événements à tester avant de
résoudre la promesse.

```javascript
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
});
```

Nous avons vu comment tester différentes situations avec le framework Jest !

J'espèce que cela vous aidera dans l'écriture de vos tests avec Jest ;)

<p style="text-align: center;">
    <img src="https://media.giphy.com/media/UoduyxX0Xsz3nMGW7J/giphy.gif">
</p>

Vous trouverez les sources de mon projet [ici](https://github.com/remija/jest-tricks)

<p style="text-align: right;">
<b>Rémi JACQUART</b>
</p>