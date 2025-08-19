from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
import uuid
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Template

load_dotenv()

app = FastAPI(title="Guided Flow Platform", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
client = MongoClient(os.getenv("MONGO_URL"))
db = client.guidedflow

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", 24))

# Pydantic Models
class UserRole(str):
    ADMIN = "admin"
    AGENT = "agent"
    CUSTOMER = "customer"

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password_hash: Optional[str] = None
    role: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserLogin(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    password: str
    role: str = UserRole.AGENT

class Guide(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str
    title: str
    category: str
    tags: List[str] = []
    current_version_id: Optional[str] = None
    default_locale: str = "en"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str

class GuideVersion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    guide_id: str
    version: int
    status: str = "draft"  # draft, review, published
    locales: List[str] = ["en"]
    graph: Dict[str, Any] = {}
    crm_note_template: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Step(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    step_uid: str
    slug: str
    type: str
    title: str
    content_blocks: List[Dict[str, Any]] = []
    inputs: List[Dict[str, Any]] = []
    actions: List[Dict[str, Any]] = []
    visibility: str = "customer"  # customer, agent
    style: Dict[str, Any] = {}
    escalation_enabled: bool = False
    escalation_overrides: Dict[str, Any] = {}

class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    role: str
    guide_version_id: str
    locale: str = "en"
    progress: Dict[str, Any] = {}
    customer_context: Dict[str, Any] = {}
    crm_context: Dict[str, Any] = {}
    agent_context: Dict[str, Any] = {}

class FlowEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    session_id: str
    step_id: Optional[str] = None
    action: str
    props: Dict[str, Any] = {}

class Escalation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    guide_id: str
    step_id: str
    category: str
    message: str
    history_snapshot: List[Dict[str, Any]] = []
    contact: Dict[str, Any] = {}
    delivery: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
        user = db.users.find_one({"email": email})
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        return user
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

def require_role(required_roles: List[str]):
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)):
        if current_user["role"] not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker

# Authentication Routes
@app.post("/api/auth/register")
async def register(user_data: UserCreate):
    # Check if user already exists
    if db.users.find_one({"email": user_data.email}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists"
        )
    
    # Create new user
    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role
    )
    
    db.users.insert_one(user.dict())
    return {"message": "User created successfully"}

@app.post("/api/auth/login")
async def login(credentials: UserLogin):
    user = db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    access_token = create_access_token(data={"sub": user["email"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"]
        }
    }

@app.get("/api/auth/me")
async def get_current_user_info(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "role": current_user["role"]
    }

# Guide Management Routes
@app.post("/api/guides")
async def create_guide(
    guide_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(require_role([UserRole.ADMIN]))
):
    guide = Guide(
        slug=guide_data["slug"],
        title=guide_data["title"],
        category=guide_data.get("category", "general"),
        tags=guide_data.get("tags", []),
        created_by=current_user["id"]
    )
    
    db.guides.insert_one(guide.dict())
    return guide.dict()

@app.get("/api/guides")
async def get_guides(current_user: Dict[str, Any] = Depends(get_current_user)):
    guides = list(db.guides.find({}))
    for guide in guides:
        guide["_id"] = str(guide["_id"])
    return guides

@app.get("/api/guides/{guide_id}")
async def get_guide(guide_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    guide = db.guides.find_one({"id": guide_id})
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    guide["_id"] = str(guide["_id"])
    return guide

@app.post("/api/guides/{guide_id}/versions")
async def create_guide_version(
    guide_id: str,
    version_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(require_role([UserRole.ADMIN]))
):
    guide = db.guides.find_one({"id": guide_id})
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    
    # Get latest version number
    latest_version = db.guide_versions.find_one(
        {"guide_id": guide_id},
        sort=[("version", -1)]
    )
    next_version = (latest_version["version"] + 1) if latest_version else 1
    
    version = GuideVersion(
        guide_id=guide_id,
        version=next_version,
        graph=version_data.get("graph", {}),
        crm_note_template=version_data.get("crm_note_template")
    )
    
    db.guide_versions.insert_one(version.dict())
    
    # Update guide's current version
    db.guides.update_one(
        {"id": guide_id},
        {"$set": {"current_version_id": version.id}}
    )
    
    return version.dict()

@app.get("/api/guides/{guide_id}/versions/{version_id}")
async def get_guide_version(
    guide_id: str,
    version_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    version = db.guide_versions.find_one({"id": version_id, "guide_id": guide_id})
    if not version:
        raise HTTPException(status_code=404, detail="Guide version not found")
    version["_id"] = str(version["_id"])
    return version

# Session Management Routes
@app.post("/api/sessions")
async def create_session(session_data: Dict[str, Any]):
    session = Session(
        role=session_data.get("role", "customer"),
        guide_version_id=session_data["guide_version_id"],
        locale=session_data.get("locale", "en")
    )
    
    db.sessions.insert_one(session.dict())
    return session.dict()

@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    session = db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session["_id"] = str(session["_id"])
    return session

@app.patch("/api/sessions/{session_id}/customer-context")
async def update_customer_context(session_id: str, context_data: Dict[str, Any]):
    result = db.sessions.update_one(
        {"id": session_id},
        {"$set": {"customer_context": context_data}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Customer context updated"}

@app.patch("/api/sessions/{session_id}/crm-context")
async def update_crm_context(session_id: str, context_data: Dict[str, Any]):
    result = db.sessions.update_one(
        {"id": session_id},
        {"$set": {"crm_context": context_data}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "CRM context updated"}

@app.post("/api/sessions/{session_id}/complete")
async def complete_session(session_id: str):
    result = db.sessions.update_one(
        {"id": session_id},
        {"$set": {"completed_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session completed"}

# Event Tracking Routes
@app.post("/api/events")
async def log_event(event_data: Dict[str, Any]):
    event = FlowEvent(
        session_id=event_data["session_id"],
        step_id=event_data.get("step_id"),
        action=event_data["action"],
        props=event_data.get("props", {})
    )
    
    db.flow_events.insert_one(event.dict())
    return event.dict()

# Escalation Routes
@app.post("/api/escalations")
async def create_escalation(escalation_data: Dict[str, Any]):
    escalation = Escalation(
        session_id=escalation_data["session_id"],
        guide_id=escalation_data["guide_id"],
        step_id=escalation_data["step_id"],
        category=escalation_data.get("category", "general"),
        message=escalation_data["message"],
        history_snapshot=escalation_data.get("history_snapshot", []),
        contact=escalation_data.get("contact", {})
    )
    
    db.escalations.insert_one(escalation.dict())
    
    # Send escalation email (basic implementation)
    try:
        send_escalation_email(escalation.dict())
        db.escalations.update_one(
            {"id": escalation.id},
            {"$set": {"delivery.status": "sent"}}
        )
    except Exception as e:
        db.escalations.update_one(
            {"id": escalation.id},
            {"$set": {"delivery.status": "failed", "delivery.error": str(e)}}
        )
    
    return escalation.dict()

def send_escalation_email(escalation: Dict[str, Any]):
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    support_email = os.getenv("SUPPORT_EMAIL")
    
    if not all([smtp_host, smtp_username, smtp_password, support_email]):
        return  # Skip sending if not configured
    
    msg = MIMEMultipart()
    msg['From'] = smtp_username
    msg['To'] = support_email
    msg['Subject'] = f"Escalation: {escalation['category']} - {escalation['step_id']}"
    
    body = f"""
    New escalation received:
    
    Session ID: {escalation['session_id']}
    Guide ID: {escalation['guide_id']}
    Step ID: {escalation['step_id']}
    Category: {escalation['category']}
    
    Customer Message:
    {escalation['message']}
    
    Contact Information:
    {escalation.get('contact', {})}
    """
    
    msg.attach(MIMEText(body, 'plain'))
    
    server = smtplib.SMTP(smtp_host, smtp_port)
    server.starttls()
    server.login(smtp_username, smtp_password)
    text = msg.as_string()
    server.sendmail(smtp_username, support_email, text)
    server.quit()

# Analytics Routes (Basic)
@app.get("/api/admin/analytics/overview")
async def get_analytics_overview(
    current_user: Dict[str, Any] = Depends(require_role([UserRole.ADMIN]))
):
    total_sessions = db.sessions.count_documents({})
    completed_sessions = db.sessions.count_documents({"completed_at": {"$ne": None}})
    total_escalations = db.escalations.count_documents({})
    
    return {
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "completion_rate": (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0,
        "total_escalations": total_escalations,
        "escalation_rate": (total_escalations / total_sessions * 100) if total_sessions > 0 else 0
    }

@app.get("/api/admin/analytics/sessions")
async def get_sessions_analytics(
    current_user: Dict[str, Any] = Depends(require_role([UserRole.ADMIN]))
):
    sessions = list(db.sessions.find({}).sort("started_at", -1).limit(100))
    for session in sessions:
        session["_id"] = str(session["_id"])
    return sessions

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)