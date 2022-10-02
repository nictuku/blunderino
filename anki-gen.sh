rm -f anki.txt
cat ankiHeader.txt > anki.txt
for card in $(ls *-1-front-of-card.svg|sed -e 's/-1-front-of-card.svg//g' | sort | uniq); do
	 echo -e "<img src=\"${card}-1-front-of-card.svg\">;<img src=\"${card}-2-hint.svg\">;<img src=\"${card}-3-back-of-card.svg\">"
done >> anki.txt
