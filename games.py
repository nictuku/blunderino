import pickle
import pprint
import chess.pgn
from io import StringIO
import chess.engine
from chess.engine import Cp
from chessdotcom import Client
import chess.svg
from datetime import datetime
import os

import chessdotcom
Client.request_config["headers"]["User-Agent"] = (
    "Chess Trainer. "
    "Contact me at yves.junqueira@gmail.com"
)

STOCKFISH_PATH = "/usr/games/stockfish"
CACHE = "state.bin"

engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
resp = None

if os.path.exists(CACHE):
    with open(CACHE, "rb") as f: # "rb" because we want to read in binary mode
        state = pickle.load(f)
        if (datetime.now() - state.SerialDate).days > 1:
            resp = None
        else:
            print("using local cache", state.SerialDate)
            resp = state

if resp is None:
    print("fetching from chess.com")
    resp = chessdotcom.client.get_player_games_by_month_pgn("OopsKapootz", "2022", "09")

    with open(CACHE, "wb") as f:
        resp.SerialDate = datetime.now();
        pickle.dump(resp, f)

# Make it look like a file
pgnFile = StringIO(resp.json["pgn"]["pgn"])

game = chess.pgn.read_game(pgnFile)
i = 0
continueFROM = 3
while i < continueFROM:
    game = chess.pgn.read_game(pgnFile)
    i = i + 1
    print("continuing analysis from", i)

node = game

target_player = "OopsKapootz"
if game.headers["Black"] == target_player:
    player_side = "B"
else:
    player_side = "W"

cap = Cp(30)
inaccuracy = -30
mistake = -90
blunder = -200

print("Player side:", player_side)
print(game.headers["Termination"])

while not node.is_end():
    next_node = node.variations[0]
    board = node.board()
    move = board.san(next_node.move)
    if board.turn:
        side = "W"
    else:
        side = "B"


    capprior = cap

    # Do an engine evaluation of the position
    # can either set depth or movetime - I am setting movetime for predictable analysis times
    #bestmove, pondermove = engine.go(movetime = time)
    info = engine.analyse(next_node.board(), chess.engine.Limit(depth=15))
    bestmove = info["pv"][0]

    import pdb
    cap=info["score"].white()
    pprint.pprint("white score {}".format(cap))
    mate = info["score"].is_mate()
    depth = info["depth"]
    # by convention in this code, cpdelta of less than -200 bad, no matter what color
    cpdelta = cap.score(mate_score=10000)-capprior.score(mate_score=10000)
    #if side == "B":
    #    cpdelta = -cpdelta
    ply = board.ply()
    print(ply, side, "move", move, "cap", cap, "delta", cpdelta)
    print("prev cap", capprior.score(mate_score=10000), "curr cap", cap.score(mate_score=10000))
    if ply == 26:
        pdb.set_trace()
    if side == player_side:
        print("cpdelta", cpdelta)
        #if cpdelta < blunder:
        if cpdelta < blunder:
            #blunderinfo = engine.analyse(next_node.board(), chess.engine.Limit(depth=15))
            #bestreply = blunderinfo["pv"][0]
            bestreply = bestmove # blunderinfo["pv"][0]
            # TODO: This is detecting positive CP changes as well
            print("Blunderino game {} ply {} ! cpdelta {}".format(i, ply, cpdelta))
            print("move was", move)
            print("move should have been", bestmove)
             # show the board before the blunder
            svg = chess.svg.board(board, flipped=(player_side == "B"))
            out = open("{:0>5d}-game-{:0>4d}-ply-1-front-of-card.svg".format(i, ply), "w")
            out.write(svg)
            out.close()
            # show the blunder
            svg = chess.svg.board(next_node.board(), lastmove=next_node.move,
                    flipped=(player_side == "B"), colors={'square dark lastmove':'red',
                        'square light lastmove':'red'})
            out = open("{:0>5d}-game-{:0>4d}-ply-2-hint.svg".format(i, ply), "w")
            out.write(svg)
            out.close()
            # show the blunder and the solution
            svg = chess.svg.board(next_node.board(), lastmove=next_node.move,
                    flipped=(player_side == "B"), colors={'square dark lastmove':'red',
                        'square light lastmove':'red'}, arrows=[[bestmove.from_square, bestmove.to_square],
                            chess.svg.Arrow(bestreply.from_square, bestreply.to_square, color="red")])
            out = open("{:0>5d}-game-{:0>4d}-ply-3-back-of-card.svg".format(i, ply), "w")
            out.write(svg)
            out.close()
    board.push(next_node.move)
    node = next_node
