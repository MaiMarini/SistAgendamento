"""
routes.py
---------
HTTP layer. Defines all API endpoints and delegates to controllers.

Responsibilities:
  - Declare HTTP methods, paths, and status codes
  - Extract data from request (body, path params, query params)
  - Inject the authenticated user via Depends(get_current_user)
  - Call the appropriate controller function
  - Return the response with the correct schema

Routes do NOT contain business logic. If you find yourself writing
`if/else` or DB calls inside a route function, move that to a controller.

Routers exported:
  company_router      → mounted at /companies  in main.py
  professional_router → mounted at /professionals in main.py
"""

from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Query, UploadFile, status
from pydantic import BaseModel, EmailStr
from app.database import get_current_user
from app.email import send_appointment_notification, send_appointment_reminder, send_password_reset, send_professional_invite, send_registration_confirmation
from app.models import (
    Company, CompanyCreate, CompanyUpdate,
    CompanyAvailability, CompanyAvailabilitySave, CompanyTimeBlock, CompanyTimeBlockRequest,
    Professional, ProfessionalCreate, ProfessionalUpdate,
    Availability, AvailabilitySave,
    TimeBlock, TimeBlockRequest,
    AppointmentCreate, AppointmentUpdate,
    Client, ClientCreate, ClientUpdate,
    ClientObservationCreate,
    Specialty, SpecialtyCreate,
)
import app.controllers as ctrl


# ===========================================================================
# COMPANY ROUTER
# ===========================================================================

company_router = APIRouter()


@company_router.post(
    "/register",
    response_model=Company,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new company",
    description=(
        "Creates a Supabase Auth user and a company profile. "
        "The email and password are used for authentication; "
        "all other fields populate the company profile."
    ),
)
def register_company(data: CompanyCreate, background_tasks: BackgroundTasks):
    """
    Public endpoint — no authentication required.
    Called when a company signs up for the first time.
    A confirmation email is sent in the background after successful registration.
    """
    result = ctrl.register_company(data)
    background_tasks.add_task(
        send_registration_confirmation, result["name"], data.email
    )
    return result


@company_router.get(
    "/me",
    response_model=Company,
    summary="Get own company profile",
)
def get_company_profile(user: dict = Depends(get_current_user)):
    """
    Protected endpoint.
    Returns the profile of the currently authenticated company.
    Email is injected from the JWT (not stored in the company table).
    """
    result = ctrl.get_company_profile(company_id=user["id"])
    result["email"] = user.get("email", "")
    return result


@company_router.patch(
    "/me",
    response_model=Company,
    summary="Update own company profile",
    description="Partial update — only send the fields you want to change.",
)
def update_company_profile(
    data: CompanyUpdate,
    user: dict = Depends(get_current_user),
):
    result = ctrl.update_company_profile(company_id=user["id"], data=data)
    result["email"] = user.get("email", "")
    return result


@company_router.get(
    "/me/availability",
    response_model=list[CompanyAvailability],
    summary="Get company business hours",
)
def get_company_availability(user: dict = Depends(get_current_user)):
    return ctrl.list_company_availability(company_id=user["id"])


@company_router.put(
    "/me/availability",
    response_model=list[CompanyAvailability],
    summary="Save company business hours (bulk replace)",
)
def save_company_availability(
    data: CompanyAvailabilitySave,
    user: dict = Depends(get_current_user),
):
    return ctrl.save_company_availability(company_id=user["id"], data=data)


@company_router.get(
    "/me/time-blocks",
    response_model=list[CompanyTimeBlock],
    summary="List company closed periods / time blocks",
)
def get_company_time_blocks(user: dict = Depends(get_current_user)):
    return ctrl.list_company_time_blocks(company_id=user["id"])


@company_router.post(
    "/me/time-blocks",
    response_model=CompanyTimeBlock,
    status_code=status.HTTP_201_CREATED,
    summary="Create a company time block (closed period)",
)
def create_company_time_block(
    data: CompanyTimeBlockRequest,
    user: dict = Depends(get_current_user),
):
    return ctrl.create_company_time_block(company_id=user["id"], data=data)


@company_router.delete(
    "/me/time-blocks/{block_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a company time block",
)
def delete_company_time_block(
    block_id: str,
    user: dict = Depends(get_current_user),
):
    ctrl.delete_company_time_block(company_id=user["id"], block_id=block_id)


@company_router.post(
    "/me/reminders/process",
    summary="Process and send pending appointment reminders",
    description=(
        "Finds appointments due for a reminder based on each company's "
        "reminder_hours_before setting and sends email notifications. "
        "Call this endpoint hourly via a cron job."
    ),
)
def process_reminders(background_tasks: BackgroundTasks):
    result = ctrl.process_appointment_reminders()
    for item in result["pending"]:
        background_tasks.add_task(
            send_appointment_reminder,
            item["client_name"],
            item["client_email"],
            item["starts_at"],
            item["professional_name"],
            item.get("company_name", ""),
        )
    return {"sent": result["count"]}


# ===========================================================================
# PROFESSIONAL ROUTER
# ===========================================================================

professional_router = APIRouter()


@professional_router.post(
    "/",
    response_model=Professional,
    status_code=status.HTTP_201_CREATED,
    summary="Create a professional (company only)",
    description=(
        "Creates a Supabase Auth user for the professional and links them "
        "to the authenticated company. Only companies can call this endpoint."
    ),
)
def create_professional(
    data: ProfessionalCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """
    Protected endpoint — requires a valid company JWT.
    The company_id is inferred from the token; it is never trusted from
    the request body.
    A personalised invite email is sent in the background after creation.
    """
    professional, invite_url = ctrl.create_professional(data=data, company_id=user["id"])
    company_name = ctrl.get_company_profile(company_id=user["id"])["name"]
    background_tasks.add_task(send_professional_invite, data.name, data.email, invite_url, company_name)
    return professional


@professional_router.get(
    "/",
    response_model=list[Professional],
    summary="List professionals (company only)",
)
def list_professionals(user: dict = Depends(get_current_user)):
    """Returns all professionals belonging to the authenticated company."""
    return ctrl.list_professionals(company_id=user["company_id"])


@professional_router.get(
    "/all-time-blocks",
    summary="List time blocks for all professionals in the company",
)
def get_all_time_blocks(user: dict = Depends(get_current_user)):
    return ctrl.list_all_time_blocks(company_id=user["company_id"])


@professional_router.get(
    "/{professional_id}",
    response_model=Professional,
    summary="Get a professional by ID",
)
def get_professional(
    professional_id: str,
    user: dict = Depends(get_current_user),
):
    return ctrl.get_professional(
        professional_id=professional_id,
        company_id=user["company_id"],
    )


@professional_router.patch(
    "/{professional_id}",
    response_model=Professional,
    summary="Update a professional",
    description="Partial update — only send the fields you want to change.",
)
def update_professional(
    professional_id: str,
    data: ProfessionalUpdate,
    user: dict = Depends(get_current_user),
):
    return ctrl.update_professional(
        professional_id=professional_id,
        data=data,
        company_id=user["company_id"],
    )


@professional_router.delete(
    "/{professional_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Hard delete a professional",
    description=(
        "Permanently removes the professional and their login account, freeing the email for reuse. "
        "Blocked if the professional has existing appointments. "
        "To temporarily stop bookings without deleting, set active=False via PATCH instead."
    ),
)
def delete_professional(
    professional_id: str,
    user: dict = Depends(get_current_user),
):
    ctrl.delete_professional(
        professional_id=professional_id,
        company_id=user["company_id"],
    )


@professional_router.post(
    "/me/activate",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Activate own professional account after setting password",
    description=(
        "Called by the professional themselves right after they set their password "
        "via the invite link. Transitions status from 'pending' to 'active'."
    ),
)
def activate_professional_self(user: dict = Depends(get_current_user)):
    ctrl.activate_professional_self(user_id=user["id"])


@professional_router.get(
    "/me/availability",
    response_model=list[Availability],
    summary="Get own availability slots",
)
def get_my_availability(user: dict = Depends(get_current_user)):
    return ctrl.list_availability_self(professional_id=user["id"])


@professional_router.put(
    "/me/availability",
    response_model=list[Availability],
    summary="Save own availability slots (replaces all)",
)
def put_my_availability(
    data: AvailabilitySave,
    user: dict = Depends(get_current_user),
):
    slots = [s.model_dump() for s in data.slots]
    return ctrl.save_availability_self(professional_id=user["id"], slots=slots)


@professional_router.get(
    "/me/time-blocks",
    response_model=list[TimeBlock],
    summary="List own time blocks",
)
def get_my_time_blocks(user: dict = Depends(get_current_user)):
    return ctrl.list_time_blocks_self(professional_id=user["id"])


@professional_router.post(
    "/me/time-blocks",
    response_model=TimeBlock,
    status_code=status.HTTP_201_CREATED,
    summary="Create own time block",
)
def create_my_time_block(
    data: TimeBlockRequest,
    user: dict = Depends(get_current_user),
):
    return ctrl.create_time_block_self(professional_id=user["id"], data=data)


@professional_router.delete(
    "/me/time-blocks/{block_id}",
    response_model=TimeBlock,
    summary="Delete own time block",
)
def delete_my_time_block(
    block_id: str,
    user: dict = Depends(get_current_user),
):
    return ctrl.delete_time_block_self(block_id=block_id, professional_id=user["id"])


@professional_router.post(
    "/{professional_id}/resend-invite",
    summary="Resend invite email to a pending professional",
    description="Generates a new one-time link and sends the invite email again. Only works while status is 'pending'.",
)
def resend_professional_invite(
    professional_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    name, email, invite_url = ctrl.resend_professional_invite(
        professional_id=professional_id,
        company_id=user["id"],
    )
    company_name = ctrl.get_company_profile(company_id=user["id"])["name"]
    background_tasks.add_task(send_professional_invite, name, email, invite_url, company_name)
    return {"message": "Convite reenviado com sucesso."}


@professional_router.get(
    "/{professional_id}/availability",
    response_model=list[Availability],
    summary="List availability for a professional",
)
def get_availability(
    professional_id: str,
    user: dict = Depends(get_current_user),
):
    return ctrl.list_availability(
        professional_id=professional_id,
        company_id=user["company_id"],
    )


@professional_router.put(
    "/{professional_id}/availability",
    response_model=list[Availability],
    summary="Save availability for a professional (replaces all slots)",
)
def put_availability(
    professional_id: str,
    data: AvailabilitySave,
    user: dict = Depends(get_current_user),
):
    slots = [s.model_dump() for s in data.slots]
    return ctrl.save_availability(
        professional_id=professional_id,
        company_id=user["company_id"],
        slots=slots,
    )


@professional_router.get(
    "/{professional_id}/available-slots",
    response_model=list[str],
    summary="Get available time slots for a professional on a given date",
    description=(
        "Returns HH:MM strings for each available slot on the requested date, "
        "based on the professional's availability, time blocks, and existing appointments."
    ),
)
def get_available_slots(
    professional_id: str,
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    user: dict = Depends(get_current_user),
):
    return ctrl.get_available_slots(
        professional_id=professional_id,
        company_id=user["company_id"],
        date_str=date,
    )


@professional_router.get(
    "/{professional_id}/month-availability",
    response_model=dict,
    summary="Get per-day availability status for a professional in a given month",
)
def get_month_availability(
    professional_id: str,
    year: int = Query(...),
    month: int = Query(...),
    user: dict = Depends(get_current_user),
):
    return ctrl.get_month_availability(
        professional_id=professional_id,
        company_id=user["company_id"],
        year=year,
        month=month,
    )


@professional_router.get(
    "/{professional_id}/time-blocks",
    response_model=list[TimeBlock],
    summary="List time blocks for a professional",
)
def get_time_blocks(
    professional_id: str,
    user: dict = Depends(get_current_user),
):
    return ctrl.list_time_blocks(
        professional_id=professional_id,
        company_id=user["company_id"],
    )


@professional_router.post(
    "/{professional_id}/time-blocks",
    response_model=TimeBlock,
    status_code=status.HTTP_201_CREATED,
    summary="Create a time block for a professional",
)
def create_time_block(
    professional_id: str,
    data: TimeBlockRequest,
    user: dict = Depends(get_current_user),
):
    return ctrl.create_time_block(
        professional_id=professional_id,
        company_id=user["company_id"],
        data=data,
    )


@professional_router.delete(
    "/{professional_id}/time-blocks/{block_id}",
    response_model=TimeBlock,
    summary="Delete a time block",
)
def delete_time_block(
    professional_id: str,
    block_id: str,
    user: dict = Depends(get_current_user),
):
    return ctrl.delete_time_block(
        block_id=block_id,
        professional_id=professional_id,
        company_id=user["company_id"],
    )


# ===========================================================================
# APPOINTMENT ROUTER
# ===========================================================================

appointment_router = APIRouter()


@appointment_router.get(
    "/",
    summary="List appointments",
    description="Returns appointments filtered by date range and/or status.",
)
def list_appointments(
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
    appt_status: Optional[str] = Query(default=None, alias="status"),
    user: dict = Depends(get_current_user),
):
    professional_id = user["id"] if user["user_type"] == "professional" else None
    return ctrl.list_appointments(
        company_id=user["company_id"],
        date_from=date_from,
        date_to=date_to,
        status_filter=appt_status,
        professional_id=professional_id,
    )


@appointment_router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    summary="Create an appointment",
)
def create_appointment(
    data: AppointmentCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    appointment, notification_info = ctrl.create_appointment(data=data, company_id=user["company_id"])
    if notification_info:
        background_tasks.add_task(
            send_appointment_notification,
            client_name=notification_info["name"],
            to_email=notification_info["email"],
            starts_at_iso=notification_info["starts_at"],
            professional_name=notification_info["professional_name"],
            company_name=notification_info.get("company_name", ""),
        )
    return appointment


@appointment_router.patch(
    "/{appointment_id}",
    summary="Update appointment status or notes",
)
def update_appointment(
    appointment_id: str,
    data: AppointmentUpdate,
    user: dict = Depends(get_current_user),
):
    return ctrl.update_appointment(
        appointment_id=appointment_id,
        data=data,
        company_id=user["company_id"],
    )


@appointment_router.delete(
    "/{appointment_id}/notes",
    summary="Clear the notes field of an appointment",
)
def clear_appointment_notes(
    appointment_id: str,
    user: dict = Depends(get_current_user),
):
    return ctrl.clear_appointment_notes(
        appointment_id=appointment_id,
        company_id=user["company_id"],
    )


# ===========================================================================
# CLIENT ROUTER
# ===========================================================================

client_router = APIRouter()


@client_router.get(
    "/",
    response_model=list[Client],
    summary="List clients",
)
def list_clients(
    search: Optional[str] = Query(default=None),
    user: dict = Depends(get_current_user),
):
    return ctrl.list_clients(company_id=user["company_id"], search=search)


@client_router.post(
    "/",
    response_model=Client,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new client",
)
def create_client(
    data: ClientCreate,
    user: dict = Depends(get_current_user),
):
    return ctrl.create_client(data=data, company_id=user["company_id"])


@client_router.patch(
    "/{client_id}",
    response_model=Client,
    summary="Update a client",
)
def update_client(
    client_id: str,
    data: ClientUpdate,
    user: dict = Depends(get_current_user),
):
    return ctrl.update_client(
        client_id=client_id,
        data=data,
        company_id=user["company_id"],
    )


@client_router.delete(
    "/{client_id}",
    response_model=Client,
    summary="Deactivate a client (soft delete)",
)
def deactivate_client(
    client_id: str,
    user: dict = Depends(get_current_user),
):
    return ctrl.deactivate_client(
        client_id=client_id,
        company_id=user["company_id"],
    )


@client_router.get(
    "/{client_id}/appointments",
    summary="List appointments for a client",
)
def get_client_appointments(
    client_id: str,
    user: dict = Depends(get_current_user),
):
    return ctrl.get_client_appointments(
        client_id=client_id,
        company_id=user["company_id"],
    )


@client_router.get(
    "/{client_id}/documents",
    summary="List documents attached to a client",
)
def list_client_documents(
    client_id: str,
    user: dict = Depends(get_current_user),
):
    return ctrl.list_client_documents(client_id=client_id, company_id=user["company_id"])


@client_router.post(
    "/{client_id}/documents/upload",
    status_code=status.HTTP_201_CREATED,
    summary="Upload a file and save document metadata (backend handles Storage upload)",
)
def upload_client_document(
    client_id: str,
    file: UploadFile = File(...),
    observation_id: str | None = Form(None),
    appointment_id: str | None = Form(None),
    user: dict = Depends(get_current_user),
):
    return ctrl.upload_client_document(
        client_id=client_id,
        company_id=user["company_id"],
        file=file,
        observation_id=observation_id,
        appointment_id=appointment_id,
    )


@client_router.get(
    "/{client_id}/documents/{doc_id}/url",
    summary="Get a signed URL to view a document",
)
def get_document_url(
    client_id: str,
    doc_id: str,
    user: dict = Depends(get_current_user),
):
    return ctrl.get_document_signed_url(doc_id=doc_id, client_id=client_id, company_id=user["company_id"])


@client_router.delete(
    "/{client_id}/documents/{doc_id}",
    summary="Delete a document (storage + metadata)",
)
def delete_client_document(
    client_id: str,
    doc_id: str,
    user: dict = Depends(get_current_user),
):
    return ctrl.delete_client_document(doc_id=doc_id, client_id=client_id, company_id=user["company_id"])


@client_router.get(
    "/{client_id}/observations",
    summary="List observation history for a client (manual + appointment notes)",
)
def list_client_observations(
    client_id: str,
    user: dict = Depends(get_current_user),
):
    professional_id = user["id"] if user["user_type"] == "professional" else None
    return ctrl.list_client_observations(
        client_id=client_id,
        company_id=user["company_id"],
        professional_id=professional_id,
    )


@client_router.post(
    "/{client_id}/observations",
    status_code=status.HTTP_201_CREATED,
    summary="Add a manual observation to a client's history",
)
def add_client_observation(
    client_id: str,
    data: ClientObservationCreate,
    user: dict = Depends(get_current_user),
):
    return ctrl.add_client_observation(
        client_id=client_id,
        company_id=user["company_id"],
        content=data.content,
    )


@client_router.patch(
    "/{client_id}/observations/{obs_id}",
    summary="Update a manual observation",
)
def update_client_observation(
    client_id: str,
    obs_id: str,
    body: ClientObservationCreate,
    user: dict = Depends(get_current_user),
):
    return ctrl.update_client_observation(
        obs_id=obs_id,
        client_id=client_id,
        company_id=user["company_id"],
        content=body.content,
    )


@client_router.delete(
    "/{client_id}/observations/{obs_id}",
    summary="Delete a manual observation",
)
def delete_client_observation(
    client_id: str,
    obs_id: str,
    user: dict = Depends(get_current_user),
):
    return ctrl.delete_client_observation(
        obs_id=obs_id,
        client_id=client_id,
        company_id=user["company_id"],
    )


# ===========================================================================
# SPECIALTY ROUTER
# ===========================================================================

specialty_router = APIRouter()


@specialty_router.get("/", summary="List specialties for the authenticated company")
def list_specialties(user: dict = Depends(get_current_user)):
    return ctrl.get_specialties(company_id=user["id"])


@specialty_router.post("/", status_code=status.HTTP_201_CREATED, summary="Create a new specialty")
def create_specialty(data: SpecialtyCreate, user: dict = Depends(get_current_user)):
    return ctrl.create_specialty(data=data, company_id=user["id"])


@specialty_router.delete("/{specialty_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a specialty")
def delete_specialty(specialty_id: str, user: dict = Depends(get_current_user)):
    ctrl.delete_specialty(specialty_id=specialty_id, company_id=user["id"])


# ===========================================================================
# AUTH ROUTER
# ===========================================================================

class _ForgotPasswordRequest(BaseModel):
    email: EmailStr


auth_router = APIRouter()


@auth_router.post(
    "/forgot-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Request a password reset e-mail",
    description=(
        "Generates a Supabase recovery link and sends a branded reset e-mail. "
        "Always returns 204 to avoid leaking whether the e-mail is registered."
    ),
)
def forgot_password(data: _ForgotPasswordRequest, background_tasks: BackgroundTasks):
    """Public endpoint — no authentication required."""
    try:
        reset_link = ctrl.request_password_reset(data.email)
        background_tasks.add_task(send_password_reset, data.email, reset_link)
    except Exception:
        # Silently swallow errors so callers cannot enumerate registered emails
        pass
