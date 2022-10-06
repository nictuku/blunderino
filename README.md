ChessTrainer

Analyzes games and shows the blunders, mistakes and inaccuracies

Generate anki cards by running `anki-gen.sh`. You can import them in the anki desktop app.

The svg files must be copied to ~/Library/Application\ Support/Anki2/User\ 1/collection.media/


New Plan:
- write plays to mongodb
- create study cards for them
- schedule based on SRS
- UI to batch import games. Parameters: username, month, blunder/mistakes/etc.



Old plan:
TODO features:
- show the last move so we can do things like en passant
- generate anki.txt from the tool directly
- show name of opponent
- show link to chess.com game
- include FEN with a link to a site that lets us play from that position, so I
  can understand why a position is good or bad.
