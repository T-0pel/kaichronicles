
/**
 * Special book sections with complex mechanics
 */
const specialSectionsMechanics = {

    /**
     * Cartwheel game
     */
    book2Sect238: function(rule) {
        // Cartwheel game UI:
        var $gameUI = mechanicsEngine.getMechanicsUI('mechanics-book2Sect238');
        gameView.appendToSection( $gameUI );

        // Bind number pickers events
        $('#mechanics-moneyToBet').bindNumberEvents();
        $('#mechanics-numberToBet').bindNumberEvents();

        // Get the game state
        var sectionState = state.sectionStates.getSectionState();
        var gameState = sectionState.ruleHasBeenExecuted(rule);
        if( !gameState ) {
            gameState = {
                moneyToBet: 1,
                numberToBet: 5,
                moneyWon: 0
            };
            sectionState.markRuleAsExecuted(rule, gameState);
        }

        $('#mechanics-moneyToBet').val( gameState.moneyToBet );
        $('#mechanics-numberToBet').val( gameState.numberToBet );

        /**
         * Function to update the UI
         */
        var updateUI = function(gameState, doNotAnimate ) {
            template.animateValueChange( $('#mechanics-moneyWon') , gameState.moneyWon , 
                doNotAnimate );
            template.animateValueChange( $('#mechanics-currentMoney') ,
                state.actionChart.beltPouch , doNotAnimate); 

            var noMoney = ( state.actionChart.beltPouch === 0 );
            if( gameState.moneyWon >= 40 || noMoney )
                // Maximum money won
                $('#mechanics-play').hide();

            mechanicsEngine.setChoiceState('sect169' , !noMoney);
            mechanicsEngine.setChoiceState('sect186' , noMoney);
        };
        
        updateUI( gameState , true );

        $('#mechanics-play').click(function(e) {
            e.preventDefault();

            // Checks
            if( !$('#mechanics-moneyToBet').isValid() || 
                !$('#mechanics-numberToBet').isValid() )
                return;
            
            var money = $('#mechanics-moneyToBet').getNumber();
            var number = $('#mechanics-numberToBet').getNumber();

            // Play the game
            randomTable.getRandomValueAsync()
            .then(function(random) {
                var moneyInc;
                if( random == number )
                    moneyInc = money * 8;
                else if ( randomTable.module10( random + 1 ) == number || 
                        randomTable.module10( random - 1 ) == number ) {
                    moneyInc = money * 5;
                }
                else
                    moneyInc = -money;

                // Limit money won to 40
                if( gameState.moneyWon + moneyInc > 40 )
                    moneyInc = 40 - gameState.moneyWon;
                    
                actionChartController.increaseMoney(moneyInc);

                // Update game state:
                gameState.moneyToBet = money;
                gameState.numberToBet = number;
                gameState.moneyWon += moneyInc;
                var msg = translations.text('randomTable') + ': ' + random + '. ';
                if( moneyInc >= 0 )
                    msg += translations.text('msgGetMoney' , [moneyInc] );
                else
                    msg += translations.text('msgDropMoney' , [-moneyInc] );
                $('#mechanics-gameStatus').text( msg );

                updateUI( gameState , false );
            });
            
        });
    },

    /**
     * Portholes game
     */
    book2sect308: function() {

        // Portholes game UI:
        var $gameUI = mechanicsEngine.getMechanicsUI('mechanics-book2Sect308');
        gameView.appendToSection( $gameUI );

        /**
         * Function to update the UI
         */
        var updateUI = function(doNotAnimate) {
            template.animateValueChange( $('#mechanics-currentMoney') ,
                state.actionChart.beltPouch , doNotAnimate); 
        };
        updateUI(true);

        /**
         * Function to get a game player result
         */
        var playerResult = function(playerName) {
            var result = {
                dice1: randomTable.getRandomValue(),
                dice2: randomTable.getRandomValue(),
                status: null,
                total: null
            };
            result.status = translations.text( 'playerDices' , [playerName] )  + ': ' + 
                result.dice1 + ' + ' + result.dice2 + ' = ';
            if( result.dice1 === 0 && result.dice2 === 0 ) {
                result.total = 100;
                result.status += ' Portholes!';
            }
            else {
                result.total = result.dice1 + result.dice2;
                result.status += result.total;
            } 
            return result;
        };

        $('#mechanics-play').click(function(e) {
            e.preventDefault();

            if( state.actionChart.beltPouch < 3 ) {
                alert( translations.text('noEnoughMoney') );
                return;
            }

            var player1 = playerResult( translations.text('playerNumber' , [1]) ), 
                player2 = playerResult( translations.text('playerNumber' , [2]) ),
                lw = playerResult( translations.text('loneWolf') );
            var status = player1.status + '<br/>' + 
                player2.status + '<br/>' + lw.status + '<br/>';
            if( lw.total > player1.total && lw.total > player2.total ) {
                status += translations.text('msgGetMoney' , [6]);
                actionChartController.increaseMoney(6);
            }
            else {
                status += translations.text('msgDropMoney' , [3]);
                actionChartController.increaseMoney(-3);
            }

            $('#mechanics-gameStatus').html( status );
            updateUI(false);
        });
    },

    /**
     * Javek venom test
     */
    book3sect88: function() {

        // Replace the combat turns generation:
        var sectionState = state.sectionStates.getSectionState();

        var nextTurnAsyncFunction = function() : Promise<CombatTurn> {
            return Combat.prototype.nextTurnAsync.call(this)
            .then(function(turn : CombatTurn) {
                // Check the bite:
                if( turn.loneWolf > 0 && turn.loneWolf != combatTable_DEATH ) {
                    var biteRandomValue = randomTable.getRandomValue();
                    turn.playerLossText = '(' + turn.playerLossText + ')';
                    turn.playerLossText += ' Random: ' + biteRandomValue;
                    if( biteRandomValue == 9 )
                        turn.loneWolf = combatTable_DEATH;
                    else
                        turn.loneWolf = 0;
                }

                return jQuery.Deferred().resolve(turn).promise();
            });
        };
        
        for(var i=0; i<sectionState.combats.length; i++) {
            var combat = sectionState.combats[i];
            combat.nextTurnAsync = nextTurnAsyncFunction;
        }
    },

    book6sect26: function() {
        
    }

};

/** Bow tournament final */
class Book6sect26 {

    public constructor() {

        // Replace the combat turns generation:
        const sectionState = state.sectionStates.getSectionState();
        for(let combat of sectionState.combats) {
            combat.nextTurnAsync = Book6sect26.nextTurnAsync;
            combat.applyTurn = Book6sect26.applyTurn;
        }

        // Add UI
        var $UI = mechanicsEngine.getMechanicsUI('mechanics-book6sect26');
        $('.combat').append( $UI );
        Book6sect26.updatePlayerTargetPointsUI(true);
    }

    /** Replacement for combat turns generation */
    private static nextTurnAsync() : Promise<CombatTurn> {
        return Combat.prototype.nextTurnAsync.call(this)
        .then(function(turn : CombatTurn) {
            // Do not remove EP to the player. Do a backup of the real loss at turn.loneWolfExtra
            turn.loneWolfExtra = turn.loneWolf;
            turn.loneWolf = turn.loneWolfBase = 0;
            return jQuery.Deferred().resolve(turn).promise();
        });
    }

    /** Replacement for turns application */
    private static applyTurn( turn : CombatTurn ) {
        // Apply normal combat
        Combat.prototype.applyTurn.call(this, turn);

        // Remove player target points (stored at turn.loneWolfExtra)
        let targetPoints = Book6sect26.getPlayerTargetPoints();
        targetPoints = Combat.applyLoss( targetPoints , turn.loneWolfExtra );
        Book6sect26.setPlayerTargetPoints( targetPoints );

        // Combat is finished?
        var self : any = this;
        if( targetPoints <= 0 )
            self.combatFinished = true;

        // Update player target points
        Book6sect26.updatePlayerTargetPointsUI(false);
    }

    private static getPlayerTargetPoints() : any {
        let targetPoints = state.sectionStates.otherStates['book6sect26TargetPoints'];
        if( targetPoints === undefined || targetPoints === null )
            return 50;
        return targetPoints;
    }

    private static setPlayerTargetPoints( targetPoints : any ) {
        state.sectionStates.otherStates['book6sect26TargetPoints'] = targetPoints;
    }

    private static updatePlayerTargetPointsUI( doNotAnimate : boolean ) {
        const targetPoints = Book6sect26.getPlayerTargetPoints();
        const color = ( targetPoints <= 0 ? 'red' : null );
        template.animateValueChange( $('#mechanics-targetpoins') , targetPoints , doNotAnimate , color );
    }

}