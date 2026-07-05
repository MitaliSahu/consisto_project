from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
import bcrypt
from typing import List, Dict, Any

app = FastAPI()

# Enable CORS so your frontend can communicate with this backend safely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows connections from any frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATABASE CONNECTION ---
# ⚠️ REPLACE THE STRING BELOW WITH YOUR ACTUAL ATLAS CONNECTION URL
MONGO_URI = "mongodb+srv://mitalisahu158:<db_password>@cluster0.nxih6sh.mongodb.net/?appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client["consisto_db"]
users_collection = db["users"]

# --- DATA MODELS (Pydantic) ---
class AuthModel(BaseModel):
    username: str
    passcode: str

class SyncDataModel(BaseModel):
    username: str
    goals: List[Dict[str, Any]]
    archived_goals: List[Dict[str, Any]]
    todos: List[Dict[str, Any]]
    standalone_notes: List[Dict[str, Any]]

# --- HELPER FUNCTIONS ---
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# --- API ENDPOINTS ---

@app.post("/api/auth")
def handle_authentication(user: AuthModel):
    """Handles both user registration and login smoothly."""
    username_clean = user.username.strip()
    existing_user = users_collection.find_one({"username": username_clean})

    if not existing_user:
        # If user does not exist, auto-register them seamlessly
        new_user = {
            "username": username_clean,
            "passcode_hash": hash_password(user.passcode),
            "goals": [],
            "archived_goals": [],
            "todos": [],
            "standalone_notes": []
        }
        users_collection.insert_one(new_user)
        return {
            "status": "registered", 
            "username": username_clean, 
            "data": {"goals": [], "archived_goals": [], "todos": [], "standalone_notes": []}
        }
    
    # If user exists, verify their passcode
    if verify_password(user.passcode, existing_user["passcode_hash"]):
        return {
            "status": "authenticated",
            "username": username_clean,
            "data": {
                "goals": existing_user.get("goals", []),
                "archived_goals": existing_user.get("archived_goals", []),
                "todos": existing_user.get("todos", []),
                "standalone_notes": existing_user.get("standalone_notes", [])
            }
        }
    else:
        raise HTTPException(status_code=401, detail="Invalid passcode for this username.")

@app.post("/api/sync")
def sync_cloud_data(payload: SyncDataModel):
    """Saves updated arrays directly into the user's cloud profile."""
    username_clean = payload.username.strip()
    
    result = users_collection.update_one(
        {"username": username_clean},
        {"$set": {
            "goals": payload.goals,
            "archived_goals": payload.archived_goals,
            "todos": payload.todos,
            "standalone_notes": payload.standalone_notes
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User account not found.")
        
    return {"status": "success", "message": "Data synchronized with cloud database cluster."}