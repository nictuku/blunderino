import pprint
import chess.pgn
from io import StringIO
import chess.engine
from chess.engine import Cp
from chessdotcom import Client
import chess.svg

import chessdotcom
Client.request_config["headers"]["User-Agent"] = (
    "Chess Trainer. "
    "Contact me at yves.junqueira@gmail.com"
)

STOCKFISH_PATH = "/usr/games/stockfish"



engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)

resp = chessdotcom.client.get_player_games_by_month_pgn("OopsKapootz", "2022", "08")
# Make it look like a file
pgnFile = StringIO(resp.json["pgn"]["pgn"])

game = chess.pgn.read_game(pgnFile)
i = 0
while i < 3:
    game = chess.pgn.read_game(pgnFile)
    i = i + 1
    print(i)
node = game

target_player = "OopsKapootz"
if game.headers["Black"] == target_player:
    player_side = "B"
else:
    player_side = "W"

cap = Cp(30)
inaccuracy = 30
mistake = 90
blunder = 200

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
    info = engine.analyse(board, chess.engine.Limit(depth=15))
    bestmove = info["pv"][0]

    import pdb
    if player_side == "B":
        cap=info["score"].black()
    else:
        cap=info["score"].white()
    pprint.pprint(cap)
    mate = info["score"].is_mate()
    depth=info["depth"]
    cpdelta = cap.score(mate_score=10000)-capprior.score(mate_score=10000)
    print(side, "move", move, info["score"].white())
    if side == player_side:
        if cpdelta > blunder:
            print("Blunderino! cpdelta", cpdelta)
            print("move was", move)
            print("move should have been", bestmove)
            svg = chess.svg.board(board, lastmove=next_node.move)
            out = open("file.svg", "w")
            out.write(svg)
            out.close()
            pdb.set_trace()
    board.push(next_node.move)
    node = next_node
