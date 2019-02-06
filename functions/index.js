var admin = require('firebase-admin')
const functions = require('firebase-functions');
var utils = require('./utils.js');

admin.initializeApp(functions.config().firebase);

var firestore = admin.firestore();

exports["add_game_result"] = functions.https.onRequest((request, response) => {
    if (request.method !== "POST") return utils.sendError(request, response, new Error("Wrong request method."), "Wrong request method");

    let { player0, player1, winner, turns } = request.body;

    let body = utils.fieldFilter(request.body, ['player0', 'player1', 'winner', 'turns']);
    if (!utils.typeCheck(request, response, body, {
        player0: "string",
        player1: "string",
        winner: "string",
        turns: "number"
    }))
        return;
    
    let batch = firestore.batch();
    let train = {set: [false, false]};
    let game = {
        player0,
        player1,
        winner,
        turns,
        playedAt: Date.now()
    }

    firestore.collection('players').doc(player0).get()
    .then(doc => {

        if( doc.exists )
            train.player0Data = doc.data();
        else{
            
            train.player0Data = {
                wins: [],
                loses: [],
                ties: [],
            }

            train.set[0] = true;
        }
        
        return firestore.collection('players').doc(player1).get();
    })
    .then(doc => {
        
        if (doc.exists)
            train.player1Data = doc.data();
        else{
            
            train.player1Data = {
                wins: [],
                loses: [],
                ties: []
            }

            train.set[1] = true;
        }

        if( winner === "TIE" ){
            train.player0Data.ties.push(game);
            train.player1Data.ties.push(game);
        }
        else if( winner === player0 ){
            train.player0Data.wins.push(game);
            train.player1Data.loses.push(game);
        }
        else{
            train.player0Data.loses.push(game);
            train.player1Data.wins.push(game);
        }

        if( train.set[0] )
            batch.set(firestore.collection('players').doc(player0), train.player0Data);
        else
            batch.update(firestore.collection('players').doc(player0), train.player0Data);
        
        if (train.set[1])
            batch.set(firestore.collection('players').doc(player1), train.player1Data);
        else
            batch.update(firestore.collection('players').doc(player1), train.player1Data);

        return batch.commit();
    })
        .then(() => utils.sendSuccess(request, response, utils.log("ADD-GAME-RESULT", player0 + player1 + winner, game)))
        .catch(err => utils.sendError(request, response, err, "Couldn't add game result."));
});

exports["update_scoreboard"] = functions.https.onRequest((request, response) => {
    if (request.method !== "POST") return utils.sendError(request, response, new Error("Wrong request method."), "Wrong request method");

    let { player0, player1, winner, scoreboard } = request.body;

    let body = utils.fieldFilter(request.body, ['player0', 'player1', 'winner', 'scoreboard']);
    if (!utils.typeCheck(request, response, body, {
        player0: "string",
        player1: "string",
        winner: "string",
        scoreboard: "string"
    }))
        return;
    
    let train = {};
    
    firestore.runTransaction(transaction => {

        return transaction.get(firestore
            .collection('scoreboards')
            .doc(scoreboard))
            .then(doc => {

                train.scoreboardData = doc.data();

                if (winner === "TIE") {
                    train.scoreboardData[player0] = (train.scoreboardData[player0] || 0) + 1;
                    train.scoreboardData[player1] = (train.scoreboardData[player1] || 0) + 1;
                }
                else if (winner === player0) 
                    train.scoreboardData[player0] = (train.scoreboardData[player0] || 0) + 3;
                else
                    train.scoreboardData[player1] = (train.scoreboardData[player0] || 0) + 3;

                return transaction.update(firestore.collection('scoreboards').doc(scoreboard), train.scoreboardData);
            })
    })
        .then(() => utils.sendSuccess(request, response, utils.log("UPDATE-SCOREBOARD", player0 + player1 + winner, {})))
        .catch(err => utils.sendError(request, response, err, "Couldn't update scoreboard."));
});

exports["get_scoreboard"] = functions.https.onRequest((request, response) => {
    if (request.method !== "POST") return utils.sendError(request, response, new Error("Wrong request method."), "Wrong request method");

    let scoreboard = request.body.scoreboard;

    let body = utils.fieldFilter(request.body, ['scoreboard']);
    if (!utils.typeCheck(request, response, body, { scoreboard: "string" }))
        return;

    firestore.collection('scoreboards').doc(scoreboard).get()
        .then(doc => {

            if( !doc.exists ){
                errorCode = 404;
                throw new Error("Scoreboard not found.");
            }

            return utils.sendSuccess(request, response, utils.log("GET-SCOREBOARD", scoreboard, {}), "Got scoreboard.", { scoreboard: doc.data() });
        })
        .catch(err => utils.sendError(request, response, err, "Couldn't get scoreboard."));
});

exports["update_current_game"] = functions.https.onRequest((request, response) => {
    if (request.method !== "POST") return utils.sendError(request, response, new Error("Wrong request method."), "Wrong request method");

    let {turn, column} = request.body;

    let body = utils.fieldFilter(request.body, ['turn', 'column']);
    if (!utils.typeCheck(request, response, body, { 
        turn: "number",
        column: "number"
    }))
        return;

    let updated = { currentTurn: turn };
    updated[turn.toString()] = column;

    firestore.collection('games').doc('currentGame').update(updated)
        .then(() => utils.sendSuccess(request, response, utils.log("UPDATE-CURRENT-GAME", turn, {})))
        .catch(err => utils.sendError(request, response, err, "Couldn't update current game."));
});

exports["set_current_game"] = functions.https.onRequest((request, response) => {
    if (request.method !== "POST") return utils.sendError(request, response, new Error("Wrong request method."), "Wrong request method");

    let { player0, player1 } = request.body;

    let body = utils.fieldFilter(request.body, ['player0', 'player1']);
    if (!utils.typeCheck(request, response, body, {
        player0: "string",
        player1: "string"
    }))
        return;

    firestore.collection('games').doc('currentGame').set({
        player0,
        player1,
        currentTurn: 0,
    })
        .then(() => utils.sendSuccess(request, response, utils.log("SET-CURRENT-GAME", "start", { player0, player1 })))
        .catch(err => utils.sendError(request, response, err, "Couldn't set current game."));
});