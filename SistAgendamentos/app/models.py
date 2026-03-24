"""
models.py
---------
Pydantic schemas for request validation and response serialization.

Why Pydantic and not SQLAlchemy models:
- We use Supabase (managed PostgreSQL) accessed via the supabase-py client,
  which communicates through the REST API — not a direct DB connection.
- SQLAlchemy ORM requires a direct DB connection (psycopg2/asyncpg).
- Pydantic schemas serve as the contract between the API and the client:
  they validate incoming data and shape outgoing responses.

Schema naming convention:
  <Entity>Create  — fields required to create a new record
  <Entity>Update  — fields allowed to be updated (all optional)
  <Entity>        — full response schema (includes id, created_at, etc.)
"""

import re
from datetime import date, datetime, time
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator


def _validate_cnpj(v: str) -> str:
    """Validates CNPJ digits using the official check-digit algorithm."""
    digits = re.sub(r'\D', '', v)
    if len(digits) != 14:
        raise ValueError("CNPJ deve ter 14 dígitos.")
    if len(set(digits)) == 1:
        raise ValueError("CNPJ inválido.")

    def calc(s: str, weights: list[int]) -> int:
        total = sum(int(s[i]) * w for i, w in enumerate(weights))
        r = total % 11
        return 0 if r < 2 else 11 - r

    if calc(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) != int(digits[12]):
        raise ValueError("CNPJ inválido.")
    if calc(digits, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) != int(digits[13]):
        raise ValueError("CNPJ inválido.")
    return digits  # armazena só os dígitos


# ---------------------------------------------------------------------------
# Shared config
# ---------------------------------------------------------------------------
class _Base(BaseModel):
    """
    Base config applied to all schemas.
    from_attributes=True allows constructing schemas from ORM-like objects
    (e.g., dicts returned by the Supabase client).
    """
    model_config = ConfigDict(from_attributes=True)


# ===========================================================================
# COMPANY
# ===========================================================================

class CompanyCreate(BaseModel):
    """
    Payload to register a new company (alongside Supabase Auth sign-up).

    license_code is validated server-side against the `license` table.
    A code can only be used once — it is marked as consumed upon successful
    registration to prevent reuse.
    """
    name: str
    cnpj: str
    phone: Optional[str] = None
    email: EmailStr
    password: str
    license_code: str

    @field_validator("cnpj")
    @classmethod
    def validate_cnpj(cls, v: str) -> str:
        return _validate_cnpj(v)


class CompanyUpdate(BaseModel):
    """Fields a company can update on its own profile."""
    name: Optional[str] = None
    phone: Optional[str] = None
    contact_email: Optional[str] = None
    cep: Optional[str] = None
    street: Optional[str] = None
    address_number: Optional[str] = None
    complement: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    active: Optional[bool] = None
    reminder_hours_before: Optional[int] = None


class Company(_Base):
    """Full company representation returned by the API."""
    id: UUID
    name: str
    cnpj: str
    phone: Optional[str] = None
    contact_email: Optional[str] = None
    email: Optional[str] = None          # login email, injected from JWT
    cep: Optional[str] = None
    street: Optional[str] = None
    address_number: Optional[str] = None
    complement: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    reminder_hours_before: Optional[int] = None
    active: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# COMPANY AVAILABILITY / TIME BLOCKS
# ---------------------------------------------------------------------------

class CompanyAvailabilitySlot(BaseModel):
    day_of_week: int  # 0=Monday … 6=Sunday
    start_time: str   # "HH:MM"
    end_time: str     # "HH:MM"


class CompanyAvailabilitySave(BaseModel):
    slots: list[CompanyAvailabilitySlot]


class CompanyAvailability(_Base):
    id: UUID
    company_id: UUID
    day_of_week: int
    start_time: str
    end_time: str
    active: bool


class CompanyTimeBlockRequest(BaseModel):
    is_recurring: bool = False
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    recurring_start_time: Optional[str] = None
    recurring_end_time: Optional[str] = None
    reason: Optional[str] = None


class CompanyTimeBlock(_Base):
    id: UUID
    company_id: UUID
    is_recurring: bool
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    recurring_start_time: Optional[str] = None
    recurring_end_time: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime


# ===========================================================================
# PROFESSIONAL
# ===========================================================================

class ProfessionalSpecialtyRef(BaseModel):
    """Specialty reference embedded in professional responses."""
    id: str
    name: str


class ProfessionalCreate(BaseModel):
    """
    Payload for a company to create a new professional.

    company_id is NOT included here — it is inferred from the authenticated
    company's JWT in the controller.

    password is NOT included here — the professional receives a one-time
    invite email via Supabase Auth and sets their own password through that
    link. This is more secure than the company defining the password.
    """
    name: str
    email: EmailStr
    cpf: Optional[str] = None
    phone: Optional[str] = None
    specialty_ids: list[str] = []
    photo_url: Optional[str] = None
    color: Optional[str] = None
    default_duration_minutes: int = 60

    @field_validator("default_duration_minutes")
    @classmethod
    def duration_must_be_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("default_duration_minutes must be greater than 0.")
        return v


class ProfessionalUpdate(BaseModel):
    """Fields allowed to be updated on a professional's profile."""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    cpf: Optional[str] = None
    phone: Optional[str] = None
    specialty_ids: Optional[list[str]] = None
    photo_url: Optional[str] = None
    color: Optional[str] = None
    active: Optional[bool] = None
    default_duration_minutes: Optional[int] = None


class Professional(_Base):
    """Full professional representation returned by the API."""
    id: UUID
    company_id: UUID
    name: str
    email: Optional[str] = None
    cpf: Optional[str] = None
    phone: Optional[str] = None
    photo_url: Optional[str] = None
    color: Optional[str] = None
    active: bool
    status: str = 'pending'
    default_duration_minutes: int = 60
    specialties: list[ProfessionalSpecialtyRef] = []
    created_at: datetime


# ===========================================================================
# SPECIALTY
# ===========================================================================

class SpecialtyCreate(BaseModel):
    """Payload for a company to create a new specialty."""
    name: str
    info: Optional[str] = None


class Specialty(BaseModel):
    """Full specialty response schema."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    company_id: str
    name: str
    info: Optional[str] = None
    created_at: datetime


# ===========================================================================
# SERVICE
# ===========================================================================

class ServiceCreate(BaseModel):
    """Payload for a company to create a new service."""
    name: str
    description: Optional[str] = None
    duration_minutes: int
    price: Optional[float] = None

    @field_validator("duration_minutes")
    @classmethod
    def duration_must_be_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("duration_minutes must be greater than 0.")
        return v

    @field_validator("price")
    @classmethod
    def price_must_be_non_negative(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("price must be 0 or greater.")
        return v


class ServiceUpdate(BaseModel):
    """Fields allowed to be updated on a service."""
    name: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    price: Optional[float] = None
    active: Optional[bool] = None


class Service(_Base):
    """Full service representation returned by the API."""
    id: UUID
    company_id: UUID
    name: str
    description: Optional[str] = None
    duration_minutes: int
    price: Optional[float] = None
    active: bool
    created_at: datetime


# ===========================================================================
# PROFESSIONAL_SERVICE  (M:N junction)
# ===========================================================================

class ProfessionalServiceCreate(BaseModel):
    """Payload to assign a service to a professional."""
    professional_id: UUID
    service_id: UUID


class ProfessionalService(_Base):
    """Response schema for a professional-service assignment."""
    professional_id: UUID
    service_id: UUID


# ===========================================================================
# AVAILABILITY
# ===========================================================================

class AvailabilityCreate(BaseModel):
    """
    Payload to define a professional's available time slot on a given
    day of the week. day_of_week: 0=Monday ... 6=Sunday.
    """
    professional_id: UUID
    day_of_week: int
    start_time: time
    end_time: time

    @field_validator("day_of_week")
    @classmethod
    def valid_day(cls, v: int) -> int:
        if not 0 <= v <= 6:
            raise ValueError("day_of_week must be between 0 (Monday) and 6 (Sunday).")
        return v

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, v: time, info) -> time:
        start = info.data.get("start_time")
        if start and v <= start:
            raise ValueError("end_time must be after start_time.")
        return v


class AvailabilityUpdate(BaseModel):
    """Fields allowed to be updated on an availability slot."""
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    active: Optional[bool] = None


class Availability(_Base):
    """Full availability representation returned by the API."""
    id: UUID
    professional_id: UUID
    day_of_week: int
    start_time: time
    end_time: time
    active: bool


# ===========================================================================
# TIME BLOCK
# ===========================================================================

class TimeBlockCreate(BaseModel):
    """
    Payload to block a specific period in a professional's calendar.
    Used for vacations, personal appointments, holidays, etc.
    starts_at and ends_at are full datetime values (timezone-aware).
    """
    professional_id: UUID
    starts_at: datetime
    ends_at: datetime
    reason: Optional[str] = None

    @field_validator("ends_at")
    @classmethod
    def ends_after_starts(cls, v: datetime, info) -> datetime:
        starts = info.data.get("starts_at")
        if starts and v <= starts:
            raise ValueError("ends_at must be after starts_at.")
        return v


class TimeBlockUpdate(BaseModel):
    """Fields allowed to be updated on a time block."""
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    reason: Optional[str] = None


class TimeBlock(_Base):
    """Full time block representation returned by the API."""
    id: UUID
    professional_id: UUID
    is_recurring: bool = False
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    recurring_start_time: Optional[time] = None
    recurring_end_time: Optional[time] = None
    reason: Optional[str] = None
    created_at: datetime


# ===========================================================================
# APPOINTMENT
# ===========================================================================

class AppointmentStatus(str, Enum):
    """
    Valid lifecycle states for an appointment.
    Using str+Enum ensures the value is serialized as a plain string in JSON.

    Lifecycle:
        scheduled → confirmed → completed
                              → no_show
        any       → cancelled
    """
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"


class AppointmentCreate(BaseModel):
    """
    Payload to create a new appointment.
    ends_at is calculated automatically from starts_at + duration_minutes.
    service_id is optional until the services module is implemented.
    company_id is inferred from the authenticated user's JWT.
    """
    professional_id: UUID
    service_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    client_name: str
    client_email: Optional[EmailStr] = None
    client_phone: Optional[str] = None
    client_cpf: Optional[str] = None
    starts_at: datetime
    duration_minutes: int = 60
    notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    """
    Fields that can be updated after creation.
    When starts_at is provided, ends_at is recalculated automatically
    using duration_minutes (defaults to the original duration if omitted).
    """
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None
    starts_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None


class Appointment(_Base):
    """Full appointment representation returned by the API."""
    id: UUID
    company_id: UUID
    professional_id: UUID
    service_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_cpf: Optional[str] = None
    starts_at: datetime
    ends_at: datetime
    status: AppointmentStatus
    notes: Optional[str] = None
    created_at: datetime


# ===========================================================================
# CLIENT
# ===========================================================================

class ClientDocumentCreate(BaseModel):
    """Metadata saved after a file is uploaded to Supabase Storage."""
    file_name: str
    file_type: str        # MIME type, e.g. 'image/jpeg', 'application/pdf'
    storage_path: str     # path inside the 'client-documents' bucket
    file_size_bytes: Optional[int] = None


class ClientDocument(_Base):
    """File attached to a client's record."""
    id: UUID
    client_id: UUID
    company_id: UUID
    file_name: str
    file_type: str
    storage_path: str
    file_size_bytes: Optional[int] = None
    created_at: datetime


class ClientObservationCreate(BaseModel):
    """Payload to add a manual observation to a client's history."""
    content: str = ""


class ClientObservation(_Base):
    """One entry in a client's observation history."""
    id: UUID
    client_id: UUID
    company_id: UUID
    content: str
    source: str           # 'manual' | 'appointment'
    source_label: Optional[str] = None  # e.g. professional name when source=appointment
    created_at: datetime


class ClientCreate(BaseModel):
    """Payload to register a new client under the authenticated company."""
    name: str
    birth_date: Optional[date] = None
    is_minor: bool = False
    observations: Optional[str] = None

    # Identity / address (adult)
    cpf: Optional[str] = None
    cep: Optional[str] = None
    street: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    address_number: Optional[str] = None
    complement: Optional[str] = None
    phone: Optional[str] = None
    phone_is_whatsapp: bool = False
    email: Optional[EmailStr] = None

    # Guardian (when minor)
    guardian_name: Optional[str] = None
    guardian_birth_date: Optional[date] = None
    guardian_cpf: Optional[str] = None
    guardian_cep: Optional[str] = None
    guardian_street: Optional[str] = None
    guardian_neighborhood: Optional[str] = None
    guardian_city: Optional[str] = None
    guardian_state: Optional[str] = None
    guardian_number: Optional[str] = None
    guardian_complement: Optional[str] = None
    guardian_phone: Optional[str] = None
    guardian_phone_is_whatsapp: bool = False
    guardian_email: Optional[EmailStr] = None

    # Notifications
    notifications_enabled: bool = True
    notification_channel: Optional[str] = None  # 'email' | 'whatsapp'

    is_provisional: bool = False


class ClientUpdate(BaseModel):
    """Fields allowed to be updated on a client profile."""
    name: Optional[str] = None
    birth_date: Optional[date] = None
    observations: Optional[str] = None
    cpf: Optional[str] = None
    cep: Optional[str] = None
    street: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    address_number: Optional[str] = None
    complement: Optional[str] = None
    phone: Optional[str] = None
    phone_is_whatsapp: Optional[bool] = None
    email: Optional[EmailStr] = None
    guardian_name: Optional[str] = None
    guardian_cpf: Optional[str] = None
    guardian_cep: Optional[str] = None
    guardian_street: Optional[str] = None
    guardian_neighborhood: Optional[str] = None
    guardian_city: Optional[str] = None
    guardian_state: Optional[str] = None
    guardian_number: Optional[str] = None
    guardian_complement: Optional[str] = None
    guardian_phone: Optional[str] = None
    guardian_phone_is_whatsapp: Optional[bool] = None
    guardian_email: Optional[EmailStr] = None
    notifications_enabled: Optional[bool] = None
    notification_channel: Optional[str] = None
    active: Optional[bool] = None
    is_provisional: Optional[bool] = None


class Client(_Base):
    """Full client representation returned by the API."""
    id: UUID
    company_id: UUID
    name: str
    birth_date: Optional[date] = None
    is_minor: bool
    observations: Optional[str] = None

    cpf: Optional[str] = None
    cep: Optional[str] = None
    street: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    address_number: Optional[str] = None
    complement: Optional[str] = None
    phone: Optional[str] = None
    phone_is_whatsapp: bool = False
    email: Optional[str] = None

    guardian_name: Optional[str] = None
    guardian_birth_date: Optional[date] = None
    guardian_cpf: Optional[str] = None
    guardian_cep: Optional[str] = None
    guardian_street: Optional[str] = None
    guardian_neighborhood: Optional[str] = None
    guardian_city: Optional[str] = None
    guardian_state: Optional[str] = None
    guardian_number: Optional[str] = None
    guardian_complement: Optional[str] = None
    guardian_phone: Optional[str] = None
    guardian_phone_is_whatsapp: bool = False
    guardian_email: Optional[str] = None

    notifications_enabled: bool = True
    notification_channel: Optional[str] = None
    is_provisional: bool = False
    active: bool
    created_at: datetime


# ===========================================================================
# AVAILABILITY SAVE (bulk replace)
# ===========================================================================

class AvailabilitySlot(BaseModel):
    """One day-of-week slot sent by the frontend when saving the schedule."""
    day_of_week: int  # 0=Mon … 6=Sun
    start_time: str   # "HH:MM"
    end_time: str     # "HH:MM"


class AvailabilitySave(BaseModel):
    """Payload to replace all availability slots for a professional at once."""
    slots: list[AvailabilitySlot]


# ===========================================================================
# TIME BLOCK REQUEST (path-scoped, no professional_id in body)
# ===========================================================================

class TimeBlockRequest(BaseModel):
    """
    Payload to create a time block; professional_id comes from the URL.

    Two modes:
      is_recurring=False (default) — one-time block; starts_at + ends_at required.
      is_recurring=True            — daily recurring block; recurring_start_time +
                                     recurring_end_time required (no dates needed).
    """
    is_recurring: bool = False
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    recurring_start_time: Optional[time] = None
    recurring_end_time: Optional[time] = None
    reason: Optional[str] = None

    @model_validator(mode="after")
    def validate_block_fields(self) -> "TimeBlockRequest":
        if self.is_recurring:
            if not self.recurring_start_time or not self.recurring_end_time:
                raise ValueError(
                    "recurring_start_time and recurring_end_time are required for recurring blocks."
                )
            if self.recurring_end_time <= self.recurring_start_time:
                raise ValueError("recurring_end_time must be after recurring_start_time.")
        else:
            if not self.starts_at or not self.ends_at:
                raise ValueError("starts_at and ends_at are required for one-time blocks.")
            if self.ends_at <= self.starts_at:
                raise ValueError("ends_at must be after starts_at.")
        return self
