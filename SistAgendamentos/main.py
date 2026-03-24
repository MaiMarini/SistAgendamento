"""
main.py
-------
FastAPI application entry point.

Architecture decision:
    This is a pure REST API — no HTML templates or static files.
    The UI layer is handled entirely by the React Native mobile app.
    Authentication is delegated to Supabase Auth (JWT-based).
    Email notifications for business events (appointment confirmations,
    reminders) are handled by fastapi-mail, since that is application
    logic, not an auth concern.

Running:
    Development:  uvicorn main:app --reload
    Production:   uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Scheduling System API",
    description="Professional scheduling platform for companies and professionals.",
    version="1.0.0",
    docs_url="/docs",       # Swagger UI
    redoc_url="/redoc",     # ReDoc UI
)

# ---------------------------------------------------------------------------
# CORS
# During development, all origins are allowed so the React Native app
# (running on a simulator or physical device) can reach the API freely.
# In production, replace "*" with your actual domain(s).
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# Uncomment each block as the corresponding module is implemented.
# ---------------------------------------------------------------------------
from app.routes import auth_router, company_router, professional_router, appointment_router, client_router, specialty_router

app.include_router(auth_router,         prefix="/auth",           tags=["Auth"])
app.include_router(company_router,      prefix="/companies",      tags=["Companies"])
app.include_router(professional_router, prefix="/professionals",  tags=["Professionals"])
app.include_router(appointment_router,  prefix="/appointments",   tags=["Appointments"])
app.include_router(client_router,       prefix="/clients",        tags=["Clients"])
app.include_router(specialty_router,    prefix="/specialties",    tags=["Specialties"])

# app.include_router(service_router,      prefix="/services",       tags=["Services"])
# app.include_router(availability_router, prefix="/availability",   tags=["Availability"])


# ---------------------------------------------------------------------------
# Health check
# Used by load balancers, monitoring tools, and CI pipelines to verify
# that the application is running and reachable.
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
