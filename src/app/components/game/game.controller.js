export default class GameController {
	constructor($rootScope, $scope, $state, $log, $q, _, deckStore, decksApi, gamesApi, gameModel, playerModel, playersApi, playersStore) {
		'ngInject';

		this.$rootScope = $rootScope;
		this.$scope = $scope;
		this.$state = $state;
		this.$log = $log.getInstance(this.constructor.name);
		this.$q = $q;

		this._ = _;
		this.deckStore = deckStore;
		this.decksApi = decksApi;
		this.gamesApi = gamesApi;
		this.gameModel = gameModel;
		this.playerModel = playerModel;
		this.playersApi = playersApi;
		this.playersStore = playersStore;

		this.$log.debug('constructor()', this);
	}

	$onInit() {
		let onSuccess = (res => {
				this.$log.info('onSuccess()', res, this);

				if (res.status === 200) {
					let gameData = res.data[0],
						decks = gameData.decks;

					this.gameModel.update(gameData);

					decks.forEach(deck => {
						this.insertDeck(deck);
					});
				}
			}),
			onError = (res => {
				this.$log.error(res);
			});

		// FIXME: This won't work when starting new game
		this.$scope.model = this.gameModel.model;
		this.$scope.playersModel = this.playersStore.model;

		// Should only fire for clients that didn't click 'New Game'
		this.$rootScope.$on('websocket:games:create', (event, data) => {
			this.$log.info('$on -> websocket:games:create', data);
			this.gameModel.update(data);
		});

		this.$rootScope.$on('websocket:games:update', (event, data) => {
			this.$log.info('$on -> websocket:games:update', data);
			this.gameModel.update(data);
		});

		this.$rootScope.$on('websocket:games:remove', (event, data) => {
			this.$log.info('$on -> websocket:games:remove', data);
			this.gameModel.clear(data);
		});

		// Should only fire for external clients
		this.$rootScope.$on('websocket:decks:create', (event, data) => {
			this.$log.info('$on -> websocket:decks:create', data);

			this.insertDeck(data.id, data);
		});

		// Will fire for ALL clients
		this.$rootScope.$on('websocket:decks:update', (event, data) => {
			this.$log.info('$on -> websocket:decks:update', data);

			if (data.id) {
				this.deckStore.update(data.id, data);
			}
		});

		this.$rootScope.$on('websocket:decks:remove', (event, data) => {
			this.$log.info('$on -> websocket:decks:remove', data);

			this.deckStore.empty();
		});

		this.gameModel
			.get()
			.then(onSuccess, onError);

		this.$log.debug('$onInit()', this);
	}

	$onDestroy() {
		return () => {
			this.$log.debug('$onDestroy()', this);
		};
	}

	/**
	 * TEMPORARY
	 * Resets the current game
	 */
	reset() {
		this.gamesApi
			.remove(this.gameModel.model.game.id);
	}

	create() {
		var playersData = this.playersStore.get(),
			players = [],
			onSuccess = (res => {
				if (res.status === 201) {
					let gameData = res.data,
						decks = gameData.decks,
						deckUpdates = [];

					// Will only fire for the client that clicked 'New Game'
					this.gameModel.update(gameData);

					decks.forEach(deck => {
						deckUpdates.push(this.insertDeck(deck));
					});

					this.$q.all(deckUpdates)
						.then(deck => {
							this.$log.debug('decksApi:update()', deck);

							this.dealCards();
						})
						.catch(err => {
							this.$log.error(err);
						});
				}
			}),
			onError = (err => {
				this.$log.error(err);
			});

		_.forEach(playersData, function(obj) {
			players.push(obj.id);
		});

		this.gamesApi
			.create(players)
			.then(onSuccess, onError);
	}

	dealCards() {
		let dealPromises = [];

		_.forEach(this.playersStore.model.players, (pl) => {
			// Loop through each player and draw random set of cards, which will
			// return a promise so we can wait for all cards to be dealt before
			// the round starts.
			dealPromises.push(this.deckStore.drawCard(pl, this.playerModel.numDrawCards));
		});

		this.$q
			.all(dealPromises)
			.then(() => {
				// After all cards have been dealt, set the starting player
				this.playersStore.nextPlayer(-1);
			})
			.catch(err => {
				this.$log.error(err);
				this.toastr.error('Problem dealing cards', err);
			});
	}

	getDecks() {
		let decks = this._.orderBy(this.deckStore.model.deck, ['deckType'], ['desc']);

		return decks;
	}

	insertDeck(id) {
		var deckPromise = this.$q.defer(),
			onSuccessDeck = (res => {
				this.$log.debug('onSuccessDeck()', res, this);

				if (res.status === 200) {
					let deckData = res.data[0];

					this.deckStore.insert(deckData);

					deckPromise.resolve(deckData);
				}
			}),
			onErrorDeck = (res => {
				this.$log.error(res);

				deckPromise.reject(res);
			});

		this.decksApi
			.get(id)
			.then(onSuccessDeck, onErrorDeck);

		return deckPromise.promise;
	}

	isGameStarted() {
		return this.gameModel.isGameStarted();
	}
}
