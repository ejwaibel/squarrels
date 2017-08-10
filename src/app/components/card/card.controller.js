export default class CardController {
	constructor($rootScope, $scope, $log, _, playerModel, cardsApi) {
		'ngInject';

		this.$rootScope = $rootScope;
		this.$scope = $scope;
		this.$log = $log;

		this._ = _;
		this.cardsApi = cardsApi;
		this.playerModel = playerModel.model;

		this.$log.info('constructor()', this);
	}

	$onInit() {
		let onSuccess = (res => {
				this.$log.info('onSuccess()', res, this);

				if (res.status === 200) {
					this.$scope.cardData = res.data[0];
				}
			}),
			onError = (err => {
				this.$log.error(err);
			});

		this.$log.info('$onInit()', this);

		this.$scope.cardData = {};

		if (this.cardId) {
			this.cardsApi
				.get(this.cardId)
				.then(onSuccess, onError);
		}
	}

	$onDestroy() {
		return () => {
			this.$log.info('$onDestroy()', this);
		};
	}

	canDrag() {
		if (this.player) {
			return this.player.isCurrent && this.player.isActive && !this.player.isFirstTurn;
		}

		return false;
	}

	isDisabled() {
		if (this.player) {
			return !this.cardId || this.cardType === 'storage' || !this.player.isActive;
		}

		return true;
	}

	onClick($e) {
		this.$log.info('onClick()', this);

		$e.preventDefault();
	}
};
