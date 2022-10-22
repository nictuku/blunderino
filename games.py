#!/usr/bin/python3
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
import sys
import faulthandler
import chessdotcom
Client.request_config["headers"]["User-Agent"] = (
    "Chess Trainer. "
    "Contact me at yves.junqueira@gmail.com"
)

from pymongo_get_database import get_database, last_game_inserted, close_database
db = get_database()
col = db["positions"]

STOCKFISH_PATH = "/usr/games/stockfish"
CACHE = "chess-com-{}-{}-{}-state.bin"

engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)

def fetch_chess_com_archive_with_cache(player_name, year, month):
    cache_path = CACHE.format(player_name, year, month)
    resp = None
    if os.path.exists(cache_path):
        with open(cache_path, "rb") as f: # "rb" because we want to read in binary mode
            state = pickle.load(f)
            if (datetime.now() - state.SerialDate).seconds > 60:
                resp = None
            else:
                print("using local cache", state.SerialDate)
                resp = state

    if resp is None:
        print("fetching from chess.com")
        resp = chessdotcom.client.get_player_games_by_month_pgn(player_name, year, month)

        with open(cache_path, "wb") as f:
            resp.SerialDate = datetime.now();
            pickle.dump(resp, f)
    return resp


TARGET_PLAYER = "OopsKapootz"
TARGET_YEAR = "2022"
TARGET_MONTH = "10"
# XXX not yet. 
TARGET_GAME_OPTIONAL = None

def chess_com_game_id(gameLink, game_date):
    return "chess-com-live-{}-{}".format(game_date, gameLink.replace("https://www.chess.com/game/live/",""))

def main():
    os.chdir("/home/yves/src/github.com/nictuku/chesstrainer")

    resp = fetch_chess_com_archive_with_cache(TARGET_PLAYER, TARGET_YEAR, TARGET_MONTH)
    # Make it look like a file
    pgnFile = StringIO(resp.json["pgn"]["pgn"])
    i = 0
    continueFROM = 0

    print("fetching last analyzed game from blunderino")
    last_game_in_db = last_game_inserted(col)
    print("last_game_inserted", last_game_in_db)

    while True:
        game = chess.pgn.read_game(pgnFile)
        i = i + 1
        if i < continueFROM:
            continue
        print("analyzing game", i)
        if game is None:
            print("finished")
            break

        exporter = chess.pgn.StringExporter(headers=True, variations=True, comments=True)
        pgn = game.accept(exporter)

        node = game

        target_player = TARGET_PLAYER
        if game.headers["Black"] == target_player:
            player_side = "B"
        else:
            player_side = "W"

        cap = Cp(30)
        inaccuracy = -30
        mistake = -90
        blunder = -200

        game_date = game.headers["UTCDate"]
        game_id = chess_com_game_id(game.headers["Link"], game_date)

        if game_id == last_game_in_db:
            print("game already found in the database, so we are done here: " + last_game_in_db)
            break
        else:
            print(game_id, "is different from last game in db,", last_game_in_db, "so we are continuing")


        print("\n\n===========================================")
        pprint.pprint(game.headers)
        print("Game:", game_id)
        print("Player side:", player_side)
        print(game.headers["Termination"])
        info = None
        

        report_position = []  # list of dictionaries 

        while not node.is_end():
            next_node = node.variations[0]
            board = node.board()
            move = board.san(next_node.move)
            if board.turn:
                side = "W"
            else:
                side = "B"


            capprior = cap
            infoprior = info
            # Do an engine evaluation of the position
            # can either set depth or movetime - I am setting movetime for predictable analysis times
            #bestmove, pondermove = engine.go(movetime = time)
            info = engine.analyse(next_node.board(), chess.engine.Limit(depth=15))

            cap=info["score"].white()
            pprint.pprint("white score {}".format(cap))
            mate = info["score"].is_mate()
            depth = info["depth"]
            # by convention in this code, cpdelta of less than -200 bad, no matter what color
            cpdelta = cap.score(mate_score=10000)-capprior.score(mate_score=10000)
            # We want this to show as a negative cpdelta for black (meaning a blunder)
            #20 W move O-O cap +218 delta -191
            #21 B move Qe7 cap +420 delta 202
            if side == "B":
                cpdelta = -cpdelta
            ply = board.ply()
            print(ply, side, "move", move, "cap", cap, "delta", cpdelta)
            print("prev cap", capprior.score(mate_score=10000), "curr cap", cap.score(mate_score=10000))
            #if ply == 39:
            #    pdb.set_trace()
            # pv is not in info when a mate was played, for example.
            if side == player_side and "pv" in info:
                print("cpdelta", cpdelta)
                #if cpdelta < blunder:
                if cpdelta < blunder:
                    #blunderinfo = engine.analyse(next_node.board(), chess.engine.Limit(depth=15))
                    bestreply = info["pv"][0]
                    bestmove = infoprior["pv"][0]
                    # TODO: This is detecting positive CP changes as well
                    print("Blunderino game {} ply {} ! cpdelta {}".format(i, ply, cpdelta))
                    print("move was", move)
                    print("move should have been", bestmove)
                     # show the board before the blunder
                    svg = chess.svg.board(board, flipped=(player_side == "B"))
                    out = open("{}-ply-{:0>4d}-1-front-of-card.svg".format(game_id, ply), "w")
                    out.write(svg)
                    out.close()
                    # show the blunder
                    svg = chess.svg.board(next_node.board(), lastmove=next_node.move,
                            flipped=(player_side == "B"), colors={'square dark lastmove':'red',
                                'square light lastmove':'red'})
                    out = open("{}-ply-{:0>4d}-2-hint.svg".format(game_id, ply), "w")
                    out.write(svg)
                    out.close()
                    # show the blunder and the solution
                    svg = chess.svg.board(next_node.board(), lastmove=next_node.move,
                            flipped=(player_side == "B"), colors={'square dark lastmove':'red',
                                'square light lastmove':'red'}, arrows=[[bestmove.from_square, bestmove.to_square],
                                    chess.svg.Arrow(bestreply.from_square, bestreply.to_square, color="red")])
                    out = open("{}-ply-{:0>4d}-3-back-of-card.svg".format(game_id, ply), "w")
                    out.write(svg)
                    out.close()
                    rep = {
                            "game_id": game_id,
                            "game_date": game_date,
                            "termination": game.headers["Termination"],
                            "white": game.headers["White"],
                            "black": game.headers["Black"],

                            "depth": depth,
                            "score": cap.score(mate_score=10000),
                            "cpdelta": cpdelta,
                            "mate": mate,
                            "ply": ply,
                            "move": move,
                            "best_move": bestmove.uci(),
                            "player_side": player_side,
                            "position": board.fen(),
                            "next_position": next_node.board().fen(),
                            "next_move": next_node.move.uci(),
                            "best_reply": bestreply.uci(),
                            "pgn": pgn,
                        }
                    print(rep)
                    col.insert_one(rep)

            board.push(next_node.move)
            node = next_node

    close_database()
    engine.quit()

if __name__ == "__main__":
    faulthandler.enable()
    main()
