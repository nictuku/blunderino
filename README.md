ChessTrainer

Analyzes games and shows the blunders, mistakes and inaccuracies

Generate anki cards:

```
cat ankiHeader.txt > anki.txt && for card in $(ls *svg|sed -e 's/ply.*//g' | sort | uniq); do echo -e "<img src=\"${card}ply-1-front-of-card.svg\">;<img src=\"${card}ply-2-hint.svg\">;<img src=\"${card}ply-3-back-of-card.svg\">";done >> anki.txt
```

Next features:
- generate anki.txt from the tool
- show name of opponent
- show link to chess.com game
- include FEN with a link to a site that lets us play from that position, so I
  can understand why a position is good or bad.
