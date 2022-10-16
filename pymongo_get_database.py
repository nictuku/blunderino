from pymongo import MongoClient
import pymongo

def get_database():
 
   # Provide the mongodb atlas url to connect python to mongodb using pymongo
   CONNECTION_STRING = "mongodb+srv://blunderino-python:CmlC9mEJzH1Gjrh0@cluster0.x2a6d.mongodb.net/?retryWrites=true&w=majority"
 
   # Create a connection using MongoClient. You can import MongoClient or use pymongo.MongoClient
   client = MongoClient(CONNECTION_STRING)
 
   # Create the database for our example (we will use the same database throughout the tutorial
   return client['blunderino']


def last_game_inserted(collection):

    last = collection.find_one(sort=[("game_id", -1)])
    if "game_id" in last:
        return last["game_id"]


# This is added so that many files can reuse the function get_database()
if __name__ == "__main__":   
  
   # Get the database
   dbname = get_database()
