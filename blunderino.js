    function createWorker(workerUrl) {
        console.log("creating worker ")

        var worker = null;
        try {
            worker = new Worker(workerUrl);
        } catch (e) {
            try {
                var blob;
                try {
                    blob = new Blob(["importScripts('" + workerUrl + "');"], {
                        "type": 'application/javascript'
                    });
                } catch (e1) {
                    console.log("error e1 worker " + e1)
                    var blobBuilder = new(window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder)();
                    blobBuilder.append("importScripts('" + workerUrl + "');");
                    blob = blobBuilder.getBlob('application/javascript');
                }
                var url = window.URL || window.webkitURL;
                var blobUrl = url.createObjectURL(blob);
                try {
                    worker = new Worker(blobUrl);
                    console.log("worker " + blobUrl)
                } catch (e3) {
                    console.log("worker error" + e3)

                }
            } catch (e2) {
                //if it still fails, there is nothing much we can do
                console.log("nope " + e2)
            }
        }
        console.log("done worker ")

        return worker;
    }

    // WASM version won't load probably because of script origin rules
    var stockfish = createWorker('https://cdn.statically.io/gh/nictuku/fish/ea63076df2c12b8a2f0c1bca040d7ccf7bad287f/stockfish.js');

    const defaultConfig = {
        'new': {
            "seconds": 5
        },
        'bad': {
            "seconds": 5
        },
        'fresh': {
            "seconds": 1
        },
        'average': {
            "days": 3
        },
        'old': {
            "days": 14
        },
    }

    class SpacedRepetition {
        constructor(date, state, config) {
            this.config = config || defaultConfig
            this.state = state || 'new'
            this.date = date
        }

        nextDate(grade) {
            const getNextTime = () => {
                let time = this.config[this.state] || {
                    "seconds": 60
                }
                console.log("duration to add", time)
                return dayjs.duration(time)
            }
            // TODO: use grades from SM-2 and efactor too
            // https://github.com/Maxvien/supermemo/blob/master/src/supermemo.ts
            switch (grade) {
                case 'good':
                    if (this.state === 'bad') {
                        this.state = 'new'
                    } else if (this.state === 'average') {
                        this.state = 'old'
                    } else if (this.state === 'old') {
                        this.state = 'never'
                    } else {
                        this.state = 'average'
                    }
                    break
                case 'ok':
                    if (this.state === 'bad') {
                        this.state = 'new'
                    } else {
                        this.state = 'fresh'
                    }
                    break
                default:
                    this.state = 'bad'
            }

            console.log("state", this.state);
            //this.date = new Date(this.date.add(dayjs.duration({"days": 1}))
            this.date = this.date.add(getNextTime())
            return this
        }

        ok() {
            return this.nextDate('ok')
        }

        good() {
            return this.nextDate('good')
        }

        bad() {
            return this.nextDate('bad')
        }
    }

    var game = new Chess()
    var board = {}
    var $status = $('#status')
    var $fen = $('#fen')
    var $pgn = $('#pgn')
    var model = null

    var bestMove = null
    var bestReply = null
    var playerMove = null
    var whiteSquareGrey = '#a9a9a9'
    var blackSquareGrey = '#696969'
    var showNextEngineBestMove = false
    var recallSucceeded = null

    function removeGreySquares() {
        console.log("removing greys")
        $('#board1 .square-55d63').css('background', '')
    }

    function greySquare(square) {
        console.log("setting greys " + square)
        var $square = $('#board1 .square-' + square)

        var background = whiteSquareGrey
        if ($square.hasClass('black-3c85d')) {
            background = blackSquareGrey
        }

        $square.css('background', background)
    }


    function onDragStart(source, piece, position, orientation) {
        // do not pick up pieces if the game is over
        if (game.game_over()) return false

        // only pick up pieces for the side to move
        if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false
        }
    }

    function onDragStart(source, piece, position, orientation) {
        // do not pick up pieces if the game is over
        if (game.game_over()) return false

        // only pick up pieces for the side to move
        if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false
        }
    }

    function onDrop(source, target) {
        // see if the move is legal
        var move = game.move({
            from: source,
            to: target,
            promotion: 'q' // NOTE: always promote to a queen for example simplicity
        })

        // illegal move
        if (move === null) return 'snapback'

        updateStatus(move)
    }

    // update the board position after the piece snap
    // for castling, en passant, pawn promotion
    function onSnapEnd() {
        board.position(game.fen())
    }

    function updateStatus(prevMove) {
        var status = ''

        var moveColor = 'White'
        if (game.turn() === 'b') {
            moveColor = 'Black'
        }

        // checkmate?
        if (game.in_checkmate()) {
            status = 'Game over, ' + moveColor + ' is in checkmate.'
        }

        // draw?
        else if (game.in_draw()) {
            status = 'Game over, drawn position'
        }

        // game still on
        else {
            status = moveColor + ' to move'

            // check?
            if (game.in_check()) {
                status += ', ' + moveColor + ' is in check'
            }
        }
        console.log("prevMove", prevMove)
        console.log("bestMove", bestMove)
        if (prevMove && bestMove) {

            if ((prevMove.from === bestMove.from) && (prevMove.to === bestMove.to)) {
                status = "<p style='color:green; font-weight: bold;'>You Found the Best Move!</p>"
                let srs = new SpacedRepetition(dayjs());
                status += "You did " + playerMove.from + playerMove.to + " during the game"
                if (bestReply) {
                    status += ", which is countered by " + bestReply.from + bestReply.to
                }

                if (recallSucceeded === null) {
                    window.Retool.triggerQuery('insertRecall')
                }
                recallSucceeded = true
                window.Retool.modelUpdate({
                    recallSucceeded: true
                });
                window.Retool.modelUpdate({
                    nextButtonActive: true
                });
            } else if (((prevMove.from === playerMove.from) && (prevMove.to === playerMove.to))) {
                window.Retool.modelUpdate({
                    recallSucceeded: false
                });
                window.Retool.modelUpdate({
                    //tryAgainButtonActive: true
                    tryAgainButtonActive: false,
                    nextButtonActive: true,
                });
                if (recallSucceeded === null) {
                    window.Retool.triggerQuery('insertRecall')
                }
                recallSucceeded = false
                status = "This is not the best move. Best would be " + bestMove.from + bestMove.to + "." // + status
		status += " In the game you played the same move, " + playerMove.from + playerMove.to + ", which is countered by " + bestReply.from + bestReply.to
                window.Retool.modelUpdate({
                    recallSucceeded: false
                });
                // We already have the server-side analysis.
                // This is displaying what happened in the real game.
                if (bestReply) {
                    greySquare(bestReply.from)
                    greySquare(bestReply.to)
                }

            } else {
                status = "This is not the best move. Best would be " + bestMove.from + bestMove.to + "." // + status
		status += " In the game you played " + playerMove.from + playerMove.to + ", which is countered by " + bestReply.from + bestReply.to
                window.Retool.modelUpdate({
                    recallSucceeded: false
                });
                window.Retool.modelUpdate({
                    //tryAgainButtonActive: true
                    tryAgainButtonActive: false,
                    nextButtonActive: true,
                });
                if (recallSucceeded === null) {
                    window.Retool.triggerQuery('insertRecall')
                }
                recallSucceeded = false
                // Request analysis so we get a bestmove UCI message showing what the computer would do.
                stockfish.postMessage('position fen ' + game.fen())
                // This is -1 compared to prev analysis so I theorize it's instant. UPDATE: nope, still slow.
                stockfish.postMessage('go depth 20')
                showNextEngineBestMove = true
            }
        }

        $status.html(status)
        $fen.html(game.fen())
        $pgn.html(game.pgn())
    }


    function startAnalysis(pgn) {
        window.backButtonMoves = []
        window.historyDetails = []
        stockfish.postMessage('stop')
        stockfish.postMessage('ucinewgame')
        stockfish.postMessage('setoption name UCI_AnalyseMode value true')
        stockfish.postMessage('isready')
        updateGame(pgn)
        return
    }

    function calculateScore(score, turn) {
        var scoreSign = 1 // negative score will mean black is winning
        if (turn == "b") {
            scoreSign = -1
        }
        //game.set_comment("score " +score[0] + " " +  score[1]*scoreSign)
        //console.log("SCORE " + score[0] + " " + score[1]*scoreSign)

        // modern games use whole pawn units, not centipawns
        const centMul = 100
        if (score[0] == "mate") {
            // TODO: show not only numeric value but also "M12" etc.
            return "M" + score[1]
        } else if (score[0] == "cp") {
            return score[1] * scoreSign / centMul
        }
        return "?"
    }

    function displayHistory(history) {
        if (!history) {
            return []
        }
        // history contains the moves, which does not include the initial position.
        var moves = [{
            move: "start",
            pos: 0,
        }]
        var i = 1
        history.map(move => {
            moves.push({
                move: move,
                pos: i,
            })
            i++
        })
        return moves
    }

    function goToMove(goToMove) {
        if (!window.historyDetails) {
            console.log(`could not move to ${goToMove} because we could not find any moves`)
            return
        }
        // From human number to array position number
        if (window.historyDetails.length < goToMove) {
            console.log(`could not move to ${goToMove} because there are only ${window.historyDetails.length} moves in this game`)
            return
        }
        // exanoke 1:
        // goToMove 0 is invalid
        // goToMove 1 is array index 0
        var pastCheck = game.history().length - goToMove
        if (pastCheck == 0) {
            // Already at the first move.
            return
        }
        // example 2:
        // goToMove 3
        // game history length = 1
        // Must move *forward* 2 moves.
        if (pastCheck < 0) {
            moveForward(-1 * pastCheck)
            return
        }

        // example 3:
        // goToMove 3
        // game history length = 10
        // Must move *back* 7 moves.
        moveBack(pastCheck)
        return
    }

    function moveBack(nMoves) {
        for (i = 0; i < nMoves; i++) {
            var history = game.history({
                verbose: false
            })
            if (history.length == 0) {
                return
            }

            var move = game.undo() // this returns a move object.
            if (!window.backButtonMoves) {
                window.backButtonMoves = [move];
            } else {
                window.backButtonMoves.push(move);
            }

        }
        var currentPos = game.history().length
        // I hope this works
        // it doesn't
        // document.getElementById("table2").selectRow(currentPos)
        window.Retool.modelUpdate({
            hasNextMove: true,
            action: ""
        });
        updateGame(game.pgn())
    }


    function moveForward(nMoves) {
        for (i = 0; i < nMoves; i++) {
            if (!window.backButtonMoves) {
                return
            }
            var redoMove = window.backButtonMoves.pop()
            game.move(redoMove)


        }
        if (window.backButtonMoves.length == 0) {
            window.Retool.modelUpdate({
                hasNextMove: false,
                action: ""
            });
        }
        updateGame(game.pgn())
    }

    var config = {
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/alpha/{piece}.png',
        position: '{model.board.position}',
        draggable: true,
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
    }
    board = Chessboard('board1', config)
    updateStatus()

    function setupBoard() {
        removeGreySquares()

        if (model.board) {
            board.position(model.board.position, false);
            board.orientation(model.orientation);
            loaded = game.load(model.board.position);
            console.log("bmo", model.board.best_move)
            console.log("loaded", loaded)
            console.log("moves", game.moves())
            bestMove = game.move(model.board.best_move, {
                sloppy: true
            })
            recallSucceeded = model.recallSucceeded
            console.log("b", bestMove)
            if (bestMove) {
                game.undo()
            }
            playerMove = game.move(model.board.move, {
                sloppy: true
            })
            console.log("playerMove", model.board.move, bestReply)
            // This isn't the best reply for _this_ particular play,
            // but for what the player did in the game.
            bestReply = game.move(model.board.best_reply, {
                sloppy: true
            })
            console.log("bestReply", model.board.best_reply, bestReply)
            if (bestReply) {
                game.undo()
            }
            if (playerMove) {
                game.undo()
            }
            recallAttempted = false
            updateStatus();
        }

        // Update analysis
        // Not sure what I'm doing with history in this version, yet.
        var history = game.history({
            verbose: false
        })

        if (history.length >= 1) {
            //    window.Retool.modelUpdate({ hasPreviousMove: true, action: "", history: window.historyDetails, selectedMove: (window.historyDetails.length-window.backButtonMoves.length-1)});
        } else {
            //    window.Retool.modelUpdate({ hasPreviousMove: false, action: "", history: window.historyDetails, selectedMove: 0});
        }
	// These affect the drag and drop on mobile.
        //stockfish.postMessage('stop')
        //stockfish.postMessage('ucinewgame')

        stockfish.postMessage('setoption name UCI_AnalyseMode value true')
        stockfish.postMessage('setoption name hash value 64')
        // The analysis of this position was already done server-side, 
        // but we want to get the engine going so it's faster to analyze the reply. See onDrop and updateStatus.
        stockfish.postMessage('position fen ' + game.fen())
        //console.log('===>> position fen ' + game.fen())
        //stockfish.postMessage('position startpos')
        //stockfish.postMessage('go depth 20')
        // XXX 1second thinking. This is too little. Use depth 20 instead.
        // TODO: cache position analysis
        stockfish.postMessage('go depth 20')
    }

    function extractScore(uciMessage) {
        //console.log("uci " + uciMessage)
        var rx = / score ([^ ]+) ([^ ]+)/g;
        var arr = rx.exec(uciMessage);
        if (arr) {
            return arr.slice(1);
        } else {
            return null
        }
    }

    function updateBestMove(uciMessage) {
        var match = uciMessage.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/);
        /// Did the AI move?
        if (match && showNextEngineBestMove) {
            //isEngineRunning = false;
            //game.move({from: match[1], to: match[2], promotion: match[3]});
            console.log("best move", match)
            // At the moment we receive these bestmove messages after the player make a move, so let's just show the computer reply as gray stuff.
            greySquare(match[1])
            greySquare(match[2])
            showNextEngineBestMove = false
        }
    }

    function updateScore(uciMessage) {
        var score = extractScore(uciMessage)
        if (!score) {
            return
        }
        var turn = game.turn()
        var scoreSign = 1 // negative score will mean black is winning
        if (turn == "b") {
            scoreSign = -1
        }
        // Store this in some other kind of cache and avoid recalculating.
        //game.set_comment("score " + score[0] + " " + score[1] * scoreSign)
        //console.log("SCORE " + score[0] + " " + score[1] + ", sign:" + scoreSign)

        // modern games use whole pawn units, not centipawns
        const centMul = 100
        if (score[0] == "mate") {

            window.Retool.modelUpdate({
                score: "M" + score[1],
                scorePos: 100 * scoreSign,
                action: "updateScore"
            })
        } else if (score[0] == "cp") {
            let absoluteScore = score[1] * scoreSign
            let scorePos = absoluteScore / centMul
            // Find a function that makes the slide less responsive at high values. 
            // This was a failed attempt to make the score position update as an asymptote.
            // Another minor problem is that the tooltip appear as this value rather than
            // the real score and that's super confusing.
            // sc = sc/2 + (scoreSign * 1/sc)
            //window.Retool.modelUpdate({ score: absoluteScore, scorePos: scorePos, action: "updateScore" })
            //console.log("score", absoluteScore, "scorePos", scorePos)
        }
    }

    if (true) {
        stockfish.addEventListener('message', function(e) {
            // console.log("uci received " + e.data);
            // Handle stockfish event data
            updateBestMove(e.data)
            updateScore(e.data)
            // Enable this if you need to debug the engine chatter.
            // $status.html(e.data)

            // window.Retool.modelUpdate({ displayText: e.data, action: "updateDisplayText" });
        });
    }
    stockfish.postMessage('uci');


    window.Retool.subscribe(function(reToolModel) {
        model = reToolModel
        recallSucceeded = model.recallSucceeded
        if (model.tryAgainPressed === true) {
            //setupBoard()
            recallSucceeded = null
            // This will trigger another event, which will be caught by the next condition.
            window.Retool.modelUpdate({
                tryAgainPressed: false,
                tryAgainButtonActive: false,
                recallSucceeded: null
            });

        } else if (model.recallSucceeded === null) {
            setupBoard()
        }
    })
