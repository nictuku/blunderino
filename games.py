from chessdotcom import Client
import chessdotcom
Client.request_config["headers"]["User-Agent"] = (
    "Chess Trainer. "
    "Contact me at yves.junqueira@gmail.com"
)

print(chessdotcom.client.get_player_games_by_month_pgn("OopsKapootz", "2022", "09"))

