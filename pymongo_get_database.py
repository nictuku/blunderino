from pymongo import MongoClient
import pymongo

__client__ = None

def close_database():
    print("Closing the database for client", __client__)
    # I don't think this is currently working..
    if __client__:
        __client__.close()

def get_database():
 
   # Provide the mongodb atlas url to connect python to mongodb using pymongo
   CONNECTION_STRING = "mongodb+srv://blunderino-python:CmlC9mEJzH1Gjrh0@cluster0.x2a6d.mongodb.net/?retryWrites=true&w=majority"
 
   # Create a connection using MongoClient. You can import MongoClient or use pymongo.MongoClient
   __client__ = MongoClient(CONNECTION_STRING)
 
   # Create the database for our example (we will use the same database throughout the tutorial
   return __client__['blunderino']


def last_game_inserted(collection):

    last = collection.find_one(sort=[("game_id", -1)])
    if "game_id" in last:
        return last["game_id"]


# This is added so that many files can reuse the function get_database()
if __name__ == "__main__":   
  
   # Get the database
   dbname = get_database()
