from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from decouple import config
from .database import users
from .models import UserCreate, UserLogin, Token, UserUpdate, UserResponse

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
SECRET_KEY = config("SECRET_KEY")
ACCESS_TOKEN_EXPIRE_MINUTES = int(config("ACCESS_TOKEN_EXPIRE_MINUTES"))

# Helper functions
def create_access_token(data: dict):
    expires = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    data.update({"exp": expires})
    token = jwt.encode(data, SECRET_KEY, algorithm="HS256")
    return token

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials"
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = await users.find_one({"username": username})
    if user is None:
        raise credentials_exception
    return user

# Routes
@app.post("/signup")
async def signup(user: UserCreate):
    # Check if username exists
    if await users.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Create new user
    user_dict = user.dict()
    user_dict["password"] = get_password_hash(user.password)
    await users.insert_one(user_dict)
    
    # Create and return token after signup
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login", response_model=Token)
async def login(user: UserLogin):
    # Find user
    db_user = await users.find_one({"username": user.username})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/user/me", response_model=UserResponse)
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user["username"]
    }

@app.put("/user/update-password")
async def update_password(user_update: UserUpdate, current_user: dict = Depends(get_current_user)):
    hashed_password = get_password_hash(user_update.password)
    await users.update_one(
        {"username": current_user["username"]},
        {"$set": {"password": hashed_password}}
    )
    return {"message": "Password updated successfully"}

@app.get("/")
async def root():
    return {"message": "Welcome to PodCraft API"} 