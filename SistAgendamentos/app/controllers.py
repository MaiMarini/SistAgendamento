"""
controllers.py
--------------
Business logic layer. Controllers are responsible for:
  - Orchestrating calls to the Supabase client
  - Enforcing business rules (e.g., ownership checks, license validation)
  - Raising HTTPException with meaningful status codes

Controllers do NOT know about HTTP methods, request bodies, or headers.
That is the responsibility of routes.py. This separation makes the
business logic independently testable and reusable.

Sections:
  1. Company
  2. Professional
  3. Appointment
"""

import os
import time
import uuid as uuid_module
from datetime import date as date_cls, datetime, time as time_cls, timedelta
from fastapi import HTTPException, status, UploadFile
from app.database import supabase, supabase_admin
from app.models import (
    CompanyCreate, CompanyUpdate,
    ProfessionalCreate, ProfessionalUpdate,
    AppointmentCreate, AppointmentUpdate,
    ClientCreate, ClientUpdate,
)


# ── Helpers de data/hora ──────────────────────────────────────────────────────

def _parse_iso_dt(iso: str) -> datetime:
    """Remove sufixo de timezone e converte string ISO em datetime."""
    return datetime.fromisoformat(iso.replace("Z", "").replace("+00:00", ""))


def _parse_iso_time(iso: str) -> time_cls:
    """Remove sufixo de timezone e converte string ISO em time (sem segundos)."""
    return _parse_iso_dt(iso).time().replace(second=0, microsecond=0)


def _parse_iso_date(iso: str) -> date_cls:
    """Remove sufixo de timezone e converte string ISO em date."""
    return _parse_iso_dt(iso).date()


def _extract_busy_periods(
    blocks: list[dict], target: date_cls
) -> list[tuple[time_cls, time_cls]]:
    """Converte lista de time_blocks em períodos ocupados para uma data específica."""
    busy: list[tuple[time_cls, time_cls]] = []
    for b in blocks:
        if b.get("is_recurring"):
            busy.append((
                time_cls.fromisoformat(b["recurring_start_time"]),
                time_cls.fromisoformat(b["recurring_end_time"]),
            ))
        else:
            bs = b.get("starts_at") or ""
            be = b.get("ends_at") or ""
            if not bs or not be:
                continue
            bs_dt = _parse_iso_dt(bs)
            be_dt = _parse_iso_dt(be)
            if bs_dt.date() <= target <= be_dt.date():
                st = bs_dt.time().replace(second=0, microsecond=0) if bs_dt.date() == target else time_cls(0, 0)
                et = be_dt.time().replace(second=0, microsecond=0) if be_dt.date() == target else time_cls(23, 59)
                busy.append((st, et))
    return busy


# ===========================================================================
# 0. AUTH
# ===========================================================================

def request_password_reset(email: str) -> str:
    """
    Generates a Supabase password-reset link for the given email and returns it.
    Uses generate_link so no email is sent by Supabase — we send our own.
    Raises HTTPException 400 if the user does not exist or link generation fails.
    """
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:8081")
    try:
        link_response = supabase_admin.auth.admin.generate_link(
            params={
                "type": "recovery",
                "email": email,
                "options": {"redirect_to": frontend_url},
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not generate reset link: {str(e)}",
        )

    if link_response.user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No account found for this e-mail address.",
        )

    return link_response.properties.action_link


# ===========================================================================
# 1. COMPANY
# ===========================================================================

def register_company(data: CompanyCreate) -> dict:
    """
    Registers a new company.

    Flow:
        1. Validate license code (must exist and not be used yet).
        2. Create an auth user in Supabase Auth (email + password),
           storing user_type in user_metadata so the JWT carries
           the profile type — no extra DB query needed after login.
        3. Insert the company profile using the auth user's UUID as PK.
        4. Mark the license code as consumed.
        5. If any step fails after auth user creation, delete the orphaned
           auth user to keep state consistent.

    Why user_type in user_metadata?
        The frontend reads user_metadata.user_type from the JWT immediately
        after login to decide which navigation stack to show, without making
        an extra API call.

    Raises:
        400 — invalid/used license code, or email already registered.
    """
    # Step 1 — pre-validate license (cheap check before touching auth)
    license_result = (
        supabase_admin.table("license")
        .select("id, used")
        .eq("code", data.license_code.strip().upper())
        .maybe_single()
        .execute()
    )
    if not license_result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid license code.",
        )

    if license_result.data["used"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This license code has already been used.",
        )

    license_id = license_result.data["id"]

    # Step 2 — create auth user
    try:
        auth_response = supabase_admin.auth.admin.create_user({
            "email": data.email,
            "password": data.password,
            "email_confirm": True,
            "user_metadata": {"user_type": "company"},
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Auth error: {str(e)}",
        )

    if auth_response.user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not create user. Email may already be registered.",
        )

    user_id = str(auth_response.user.id)

    # Step 3 — insert company profile (admin bypasses RLS; no session exists yet)
    try:
        result = supabase_admin.table("company").insert({
            "id": user_id,
            "name": data.name,
            "cnpj": data.cnpj,
            "phone": data.phone,
        }).execute()
    except Exception as e:
        supabase_admin.auth.admin.delete_user(user_id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not create company profile: {str(e)}",
        )

    # Step 4 — consume license (only after everything else succeeded)
    supabase_admin.table("license").update({
        "used": True,
        "used_by": user_id,
        "used_at": "now()",
    }).eq("id", license_id).execute()

    return result.data[0]


# ===========================================================================
# SPECIALTY
# ===========================================================================

def get_specialties(company_id: str) -> list[dict]:
    result = (
        supabase_admin.table("specialty")
        .select("*")
        .eq("company_id", company_id)
        .order("name")
        .execute()
    )
    return result.data


def create_specialty(data, company_id: str) -> dict:
    result = (
        supabase_admin.table("specialty")
        .insert({"company_id": company_id, "name": data.name, "info": data.info})
        .execute()
    )
    return result.data[0]


def delete_specialty(specialty_id: str, company_id: str) -> None:
    supabase_admin.table("specialty").delete().eq("id", specialty_id).eq("company_id", company_id).execute()


def get_company_profile(company_id: str) -> dict:
    """
    Fetches the authenticated company's profile.

    The company_id comes from the validated JWT (get_current_user),
    so no authorization check is needed here — a company can only
    fetch its own profile due to RLS policies on the table.
    """
    result = supabase_admin.table("company").select("*").eq("id", company_id).maybe_single().execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found.",
        )

    return result.data


def update_company_profile(company_id: str, data: CompanyUpdate) -> dict:
    """
    Updates the authenticated company's profile.
    Only non-None fields from the payload are sent to the database,
    so a partial update (PATCH semantics) is always safe.
    """
    payload = data.model_dump(exclude_none=True)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update.",
        )

    result = supabase_admin.table("company").update(payload).eq("id", company_id).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found.",
        )

    return result.data[0]


# ===========================================================================
# 2. PROFESSIONAL
# ===========================================================================

def create_professional(data: ProfessionalCreate, company_id: str) -> dict:
    """
    Creates a new professional under the authenticated company.

    Flow:
        1. Send a Supabase Auth invite to the professional's email.
           The invite contains a one-time magic link.
        2. Insert the professional profile immediately (active=True).
           The professional cannot use the app until they accept the invite
           and set their password — Supabase Auth enforces that.
        3. If the profile insert fails, delete the orphaned auth user.

    Why invite_user_by_email instead of create_user?
        - The company should NOT define the professional's password.
        - The invite link is one-time use and expires (configurable in
          Supabase Dashboard → Auth → Email Templates).
        - Supabase handles the email delivery — no fastapi-mail needed here.

    Why user_metadata with user_type and company_id?
        - user_type: "professional" allows the frontend to route to the
          correct navigation stack immediately after login, without an
          extra API call.
        - company_id: stored in the JWT so the professional's app can
          scope requests to their company without a separate lookup.

    Redirect URL (configured in Supabase Dashboard → Auth → URL Configuration):
        Must point to the "set password" screen in the app so the
        professional lands in the right place after clicking the link.

    Raises:
        400 — if the email is already registered.
    """
    # generate_link creates the auth user AND returns a one-time invite URL
    # without sending any email — we send our own custom email instead.
    try:
        link_response = supabase_admin.auth.admin.generate_link(
            params={
                "type": "invite",
                "email": data.email,
                "data": {
                    "user_type": "professional",
                    "company_id": company_id,
                },
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Auth error: {str(e)}",
        )

    if link_response.user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not create invite. Email may already be registered.",
        )

    user_id = str(link_response.user.id)
    invite_url: str = link_response.properties.action_link

    # Explicitly set metadata — generate_link's `data` field is unreliable
    # across SDK versions. update_user_by_id guarantees raw_user_meta_data is set.
    supabase_admin.auth.admin.update_user_by_id(
        uid=user_id,
        attributes={
            "user_metadata": {
                "user_type": "professional",
                "company_id": company_id,
            }
        },
    )

    # Limpa email/CPF de linhas deletadas que conflitam, liberando os campos para reutilização.
    # Cobre o caso de profissionais deletados antes da correção do soft-delete.
    placeholder_for_cleanup = f"deleted_{user_id}@placeholder.invalid"
    (
        supabase_admin.table("professional")
        .update({"email": placeholder_for_cleanup, "cpf": None})
        .eq("status", "deleted")
        .eq("email", str(data.email))
        .execute()
    )
    if data.cpf:
        (
            supabase_admin.table("professional")
            .update({"cpf": None})
            .eq("status", "deleted")
            .eq("cpf", data.cpf)
            .execute()
        )

    try:
        result = supabase_admin.table("professional").insert({
            "id": user_id,
            "company_id": company_id,
            "name": data.name,
            "email": str(data.email),
            "cpf": data.cpf,
            "phone": data.phone,
            "photo_url": data.photo_url,
            "color": data.color,
            "default_duration_minutes": data.default_duration_minutes,
            "active": False,
            "status": "pending",
        }).execute()
    except Exception as e:
        supabase_admin.auth.admin.delete_user(user_id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not create professional profile: {str(e)}",
        )

    if data.specialty_ids:
        specialty_rows = [
            {"professional_id": user_id, "specialty_id": sid}
            for sid in data.specialty_ids
        ]
        supabase_admin.table("professional_specialty").insert(specialty_rows).execute()

    professional_data = result.data[0]
    professional_data["specialties"] = []
    return professional_data, invite_url


def list_professionals(company_id: str) -> list[dict]:
    """
    Returns all professionals belonging to the authenticated company.
    Sorted by name for consistent ordering.
    """
    result = (
        supabase_admin.table("professional")
        .select("*, professional_specialty(specialty(id, name))")
        .eq("company_id", company_id)
        .neq("status", "deleted")
        .order("name")
        .execute()
    )

    professionals = result.data or []
    for pro in professionals:
        ps = pro.pop("professional_specialty", []) or []
        pro["specialties"] = [entry["specialty"] for entry in ps if entry.get("specialty")]
    return professionals


def get_professional(professional_id: str, company_id: str) -> dict:
    """
    Fetches a single professional, verifying they belong to the company.
    The company_id check is an extra safety layer on top of RLS.
    """
    result = (
        supabase_admin.table("professional")
        .select("*, professional_specialty(specialty(id, name))")
        .eq("id", professional_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professional not found.",
        )

    pro = result.data
    ps = pro.pop("professional_specialty", []) or []
    pro["specialties"] = [entry["specialty"] for entry in ps if entry.get("specialty")]
    return pro


def update_professional(
    professional_id: str, data: ProfessionalUpdate, company_id: str
) -> dict:
    """
    Updates a professional's profile.
    Ownership is enforced by filtering on both professional_id and company_id,
    so a company cannot update professionals from another company even if
    they somehow obtain the UUID.
    """
    payload = data.model_dump(exclude_none=True)
    specialty_ids = payload.pop("specialty_ids", None)

    # Update email in Supabase Auth if provided
    if "email" in payload:
        new_email = str(payload["email"])
        try:
            supabase_admin.auth.admin.update_user_by_id(
                professional_id,
                {"email": new_email, "email_confirm": True},
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erro ao atualizar e-mail: {str(e)}",
            )

    # Keep status in sync when active changes
    # active=True  → sempre seta 'active'
    # active=False → seta 'inactive' SOMENTE se o profissional já estava ativo
    #                (não sobrescreve 'pending' de quem ainda não definiu senha)
    if "active" in payload:
        if payload["active"]:
            payload["status"] = "active"
        else:
            current = (
                supabase_admin.table("professional")
                .select("status")
                .eq("id", professional_id)
                .single()
                .execute()
            )
            if current.data and current.data.get("status") != "pending":
                payload["status"] = "inactive"
            else:
                payload.pop("active", None)  # ignora active para pendentes

    if payload:
        result = (
            supabase_admin.table("professional")
            .update(payload)
            .eq("id", professional_id)
            .eq("company_id", company_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Professional not found.",
            )
    elif specialty_ids is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update.",
        )

    if specialty_ids is not None:
        supabase_admin.table("professional_specialty").delete().eq(
            "professional_id", professional_id
        ).execute()
        if specialty_ids:
            rows = [
                {"professional_id": professional_id, "specialty_id": sid}
                for sid in specialty_ids
            ]
            supabase_admin.table("professional_specialty").insert(rows).execute()

    return get_professional(professional_id, company_id)


def delete_professional(professional_id: str, company_id: str) -> None:
    """
    Soft-deletes a professional while freeing their email for reuse.

    The professional row is kept in the database (preserving appointment
    history) but is marked status='deleted' so it no longer appears in
    the team list. The Supabase Auth user is deleted, which immediately
    frees the email address so a new professional can be registered with it.
    """
    # Verify ownership
    check = (
        supabase_admin.table("professional")
        .select("id")
        .eq("id", professional_id)
        .eq("company_id", company_id)
        .execute()
    )
    if not check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profissional não encontrado.",
        )

    # Mark as deleted — row kept for historical records.
    # Email e CPF são limpos para liberar reutilização.
    placeholder_email = f"deleted_{professional_id}@placeholder.invalid"
    supabase_admin.table("professional").update(
        {"active": False, "status": "deleted", "email": placeholder_email, "cpf": None}
    ).eq("id", professional_id).eq("company_id", company_id).execute()

    # Libera o e-mail do usuário Auth substituindo por um placeholder único.
    # Não deletamos o usuário Auth porque a FK professional.id → auth.users.id
    # impede a exclusão enquanto a linha do profissional existir no banco.
    for attempt in range(2):
        try:
            supabase_admin.auth.admin.update_user_by_id(
                professional_id,
                {"email": placeholder_email, "email_confirm": True},
            )
            break
        except Exception:
            if attempt == 0:
                time.sleep(0.4)
            # Segunda falha: auth user pode não existir (profissional pendente)


def activate_professional_self(user_id: str) -> None:
    """
    Activates the professional own record after they set their password.
    Only transitions from pending to active. No-op if already active.
    Called by the professional themselves immediately after defining their password.
    """
    result = (
        supabase_admin.table("professional")
        .update({"active": True, "status": "active"})
        .eq("id", user_id)
        .eq("status", "pending")
        .execute()
    )
    if not result.data:
        check = (
            supabase_admin.table("professional")
            .select("id")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        if not check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Professional not found.",
            )
        # Already active -- no-op


def resend_professional_invite(professional_id: str, company_id: str) -> tuple[str, str, str]:
    """
    Generates a new one-time password-reset link for a pending professional
    and returns (name, email, invite_url) so the route can send the invite email.

    Only works while the professional's status is 'pending'. Once they are
    active the button is hidden in the UI and this endpoint returns 400.
    """
    # Verify professional belongs to this company
    pro_result = (
        supabase_admin.table("professional")
        .select("name, status")
        .eq("id", professional_id)
        .eq("company_id", company_id)
        .maybe_single()
        .execute()
    )
    if not pro_result or not pro_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professional not found.",
        )

    if pro_result.data["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Professional is already active.",
        )

    # Fetch email from Supabase Auth
    auth_user = supabase_admin.auth.admin.get_user_by_id(professional_id)
    if not auth_user or not auth_user.user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Auth user not found.",
        )

    email: str = auth_user.user.email

    # Generate a new one-time recovery link (lets them set their password)
    try:
        link_response = supabase_admin.auth.admin.generate_link(
            params={"type": "recovery", "email": email}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not generate invite link: {str(e)}",
        )

    invite_url: str = link_response.properties.action_link
    return pro_result.data["name"], email, invite_url


# ===========================================================================
# 3. APPOINTMENT
# ===========================================================================

def list_appointments(
    company_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
    status_filter: str | None = None,
    professional_id: str | None = None,
) -> list[dict]:
    """
    Returns appointments for the company, optionally filtered by date range,
    status, and/or professional_id.

    When professional_id is provided (professional view), only appointments
    assigned to that professional are returned.

    Auto-completes any scheduled/confirmed appointment whose ends_at has
    already passed before returning the list.
    """
    now_str = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    auto_complete = (
        supabase_admin.table("appointment")
        .update({"status": "completed"})
        .eq("company_id", company_id)
        .in_("status", ["scheduled", "confirmed"])
        .lt("ends_at", now_str)
    )
    if professional_id:
        auto_complete = auto_complete.eq("professional_id", professional_id)
    try:
        auto_complete.execute()
    except Exception:
        pass  # falha transitória do Supabase — não impede retorno da lista

    query = (
        supabase_admin.table("appointment")
        .select("*, professional(id, name, specialty, photo_url, color)")
        .eq("company_id", company_id)
        .order("starts_at")
    )
    if professional_id:
        query = query.eq("professional_id", professional_id)
    if date_from:
        query = query.gte("starts_at", date_from)
    if date_to:
        query = query.lte("starts_at", date_to)
    if status_filter:
        query = query.eq("status", status_filter)
    # Retry uma vez em caso de falha transitória do Supabase
    for attempt in range(2):
        try:
            return query.execute().data or []
        except Exception:
            if attempt == 0:
                time.sleep(0.4)
            else:
                raise  # propaga como 500 → frontend retenta


def create_appointment(data: AppointmentCreate, company_id: str) -> tuple[dict, dict | None]:
    """
    Creates a new appointment.
    ends_at is calculated automatically from starts_at + duration_minutes.

    Returns (appointment, notification_info) where notification_info is a dict
    with {name, email, starts_at, professional_name} when the linked client has
    notifications_enabled=True and a valid email; otherwise None.
    """
    ends_at = data.starts_at + timedelta(minutes=data.duration_minutes)
    payload: dict = {
        "company_id": company_id,
        "professional_id": str(data.professional_id),
        "client_name": data.client_name,
        "client_email": data.client_email,
        "client_phone": data.client_phone,
        "client_cpf": data.client_cpf,
        "starts_at": data.starts_at.isoformat(),
        "ends_at": ends_at.isoformat(),
        "status": "scheduled",
        "notes": data.notes,
    }
    if data.service_id:
        payload["service_id"] = str(data.service_id)
    if data.client_id:
        payload["client_id"] = str(data.client_id)

    try:
        result = supabase_admin.table("appointment").insert(payload).execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not create appointment: {str(e)}",
        )

    appointment = result.data[0]
    notification_info: dict | None = None

    if data.client_id:
        client_result = (
            supabase_admin.table("client")
            .select("name, email, guardian_email, is_minor, notifications_enabled")
            .eq("id", str(data.client_id))
            .eq("company_id", company_id)
            .single()
            .execute()
        )
        client = client_result.data if client_result.data else None
        if client and client.get("notifications_enabled"):
            client_email = (
                client.get("guardian_email") if client.get("is_minor") else client.get("email")
            )
            if client_email:
                prof_result = (
                    supabase_admin.table("professional")
                    .select("name")
                    .eq("id", str(data.professional_id))
                    .single()
                    .execute()
                )
                professional_name = prof_result.data["name"] if prof_result.data else "Profissional"
                company_res = supabase_admin.table("company").select("name").eq("id", company_id).single().execute()
                company_name = company_res.data["name"] if company_res.data else ""
                notification_info = {
                    "name": client["name"],
                    "email": client_email,
                    "starts_at": appointment["starts_at"],
                    "professional_name": professional_name,
                    "company_name": company_name,
                }

    return appointment, notification_info


def clear_appointment_notes(appointment_id: str, company_id: str) -> dict:
    """Sets the notes field of an appointment to null."""
    result = (
        supabase_admin.table("appointment")
        .update({"notes": None})
        .eq("id", appointment_id)
        .eq("company_id", company_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")
    return result.data[0]


def update_appointment(
    appointment_id: str, data: AppointmentUpdate, company_id: str
) -> dict:
    """
    Updates an appointment's status, notes, and/or scheduled time.
    When starts_at is provided, ends_at is recalculated from
    starts_at + duration_minutes (uses the original duration if omitted).
    Ownership is enforced by filtering on company_id.
    """
    payload = data.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update.",
        )

    if "starts_at" in payload:
        new_starts_at: datetime = payload["starts_at"]

        if "duration_minutes" not in payload:
            existing = (
                supabase_admin.table("appointment")
                .select("starts_at, ends_at")
                .eq("id", appointment_id)
                .eq("company_id", company_id)
                .single()
                .execute()
            )
            if not existing.data:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")
            orig_start = datetime.fromisoformat(existing.data["starts_at"])
            orig_end = datetime.fromisoformat(existing.data["ends_at"])
            duration_minutes = int((orig_end - orig_start).total_seconds() / 60)
        else:
            duration_minutes = payload.pop("duration_minutes")

        ends_at = new_starts_at + timedelta(minutes=duration_minutes)
        payload["starts_at"] = new_starts_at.isoformat()
        payload["ends_at"] = ends_at.isoformat()
        payload.pop("duration_minutes", None)

    result = (
        supabase_admin.table("appointment")
        .update(payload)
        .eq("id", appointment_id)
        .eq("company_id", company_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found.",
        )
    return result.data[0]


# ===========================================================================
# 4. CLIENT
# ===========================================================================

def list_clients(
    company_id: str,
    search: str | None = None,
    professional_id: str | None = None,
) -> list[dict]:
    """
    Returns active clients belonging to the company.
    If `search` is provided, filters by name OR cpf (case-insensitive, partial match).
    If `professional_id` is provided (professional view), only returns clients
    that have at least one appointment with that professional.
    """
    if professional_id:
        # Fetch distinct client_ids from appointments with this professional
        appt_result = (
            supabase_admin.table("appointment")
            .select("client_id")
            .eq("company_id", company_id)
            .eq("professional_id", professional_id)
            .not_.is_("client_id", "null")
            .execute()
        )
        client_ids = list({r["client_id"] for r in (appt_result.data or []) if r.get("client_id")})
        if not client_ids:
            return []
        query = (
            supabase_admin.table("client")
            .select("*")
            .eq("company_id", company_id)
            .eq("active", True)
            .in_("id", client_ids)
        )
    else:
        query = (
            supabase_admin.table("client")
            .select("*")
            .eq("company_id", company_id)
            .eq("active", True)
        )
    if search:
        query = query.or_(f"name.ilike.%{search}%,cpf.ilike.%{search}%")
    result = query.order("name").limit(30).execute()
    return result.data or []


def create_client(data: ClientCreate, company_id: str) -> dict:
    """Creates a new client profile under the authenticated company."""
    payload = data.model_dump(exclude_none=True)
    payload["company_id"] = company_id
    # Convert date objects to strings for Supabase REST
    if "birth_date" in payload:
        payload["birth_date"] = str(payload["birth_date"])
    if "guardian_birth_date" in payload:
        payload["guardian_birth_date"] = str(payload["guardian_birth_date"])

    try:
        result = supabase_admin.table("client").insert(payload).execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not create client: {str(e)}",
        )
    return result.data[0]


def update_client(client_id: str, data: ClientUpdate, company_id: str) -> dict:
    """Updates a client's profile. Ownership enforced by company_id filter.

    After saving the client record, propagates name/email/phone to all
    appointments linked to this client so denormalized fields stay in sync.
    """
    payload = data.model_dump(exclude_none=True)
    # Supabase-py uses plain json.dumps, which cannot serialize date objects.
    if "birth_date" in payload and payload["birth_date"] is not None:
        payload["birth_date"] = payload["birth_date"].isoformat()
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update.",
        )
    result = (
        supabase_admin.table("client")
        .update(payload)
        .eq("id", client_id)
        .eq("company_id", company_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found.",
        )
    updated = result.data[0]

    # Sync denormalized appointment fields so past/future bookings reflect
    # the completed profile (important for provisional → full client flow).
    appt_sync: dict = {}
    if "name" in payload:
        appt_sync["client_name"] = payload["name"]
    if "email" in payload:
        appt_sync["client_email"] = payload["email"]
    if "phone" in payload:
        appt_sync["client_phone"] = payload["phone"]
    if "cpf" in payload:
        appt_sync["client_cpf"] = payload["cpf"]

    if appt_sync:
        supabase_admin.table("appointment").update(appt_sync).eq("client_id", client_id).execute()

    return updated


# ===========================================================================
# 5. AVAILABILITY
# ===========================================================================

def _verify_professional_ownership(professional_id: str, company_id: str) -> None:
    """Raises 404 if the professional does not belong to the company."""
    result = (
        supabase_admin.table("professional")
        .select("id")
        .eq("id", professional_id)
        .eq("company_id", company_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professional not found.",
        )


def list_availability(professional_id: str, company_id: str) -> list[dict]:
    """Returns all availability slots for a professional, ordered by day."""
    _verify_professional_ownership(professional_id, company_id)
    result = (
        supabase_admin.table("availability")
        .select("*")
        .eq("professional_id", professional_id)
        .order("day_of_week")
        .execute()
    )
    return result.data or []


def save_availability(
    professional_id: str, company_id: str, slots: list[dict]
) -> list[dict]:
    """
    Replaces all availability slots for a professional.
    Deletes existing rows first, then inserts the new set.
    """
    _verify_professional_ownership(professional_id, company_id)
    supabase_admin.table("availability").delete().eq(
        "professional_id", professional_id
    ).execute()
    if not slots:
        return []
    payload = [
        {
            "professional_id": professional_id,
            "day_of_week": s["day_of_week"],
            "start_time": s["start_time"],
            "end_time": s["end_time"],
        }
        for s in slots
    ]
    result = supabase_admin.table("availability").insert(payload).execute()
    return result.data or []


def list_availability_self(professional_id: str) -> list[dict]:
    """Returns availability slots for the authenticated professional (no company check)."""
    result = (
        supabase_admin.table("availability")
        .select("*")
        .eq("professional_id", professional_id)
        .order("day_of_week")
        .execute()
    )
    return result.data or []


def save_availability_self(professional_id: str, slots: list[dict]) -> list[dict]:
    """Replaces all availability slots for the authenticated professional."""
    supabase_admin.table("availability").delete().eq("professional_id", professional_id).execute()
    if not slots:
        return []
    payload = [
        {
            "professional_id": professional_id,
            "day_of_week": s["day_of_week"],
            "start_time": s["start_time"],
            "end_time": s["end_time"],
        }
        for s in slots
    ]
    result = supabase_admin.table("availability").insert(payload).execute()
    return result.data or []


# ===========================================================================
# 6. TIME BLOCK
# ===========================================================================

def list_all_time_blocks(company_id: str) -> list[dict]:
    """Retorna todos os bloqueios de todos os profissionais da empresa."""
    # Busca profissionais ativos da empresa
    pro_result = (
        supabase_admin.table("professional")
        .select("id, name, color")
        .eq("company_id", company_id)
        .eq("active", True)
        .execute()
    )
    professionals = pro_result.data or []
    if not professionals:
        return []

    pro_ids = [p["id"] for p in professionals]
    pro_map = {p["id"]: p for p in professionals}

    block_result = (
        supabase_admin.table("time_block")
        .select("*")
        .in_("professional_id", pro_ids)
        .execute()
    )
    blocks = block_result.data or []

    for b in blocks:
        b["professional"] = pro_map.get(b["professional_id"])

    blocks.sort(key=lambda b: (
        0 if b.get("is_recurring") else 1,
        b.get("starts_at") or "",
    ))
    return blocks


def list_time_blocks(professional_id: str, company_id: str) -> list[dict]:
    """Returns all time blocks for a professional.

    Recurring blocks (starts_at is NULL) are listed first, then one-time
    blocks ordered by starts_at ascending.
    """
    _verify_professional_ownership(professional_id, company_id)
    result = (
        supabase_admin.table("time_block")
        .select("*")
        .eq("professional_id", professional_id)
        .execute()
    )
    blocks = result.data or []
    blocks.sort(key=lambda b: (
        0 if b.get("is_recurring") else 1,
        b.get("starts_at") or "",
    ))
    return blocks


def create_time_block(professional_id: str, company_id: str, data) -> dict:
    """Creates a time block for a professional.

    Builds the insert payload differently for recurring vs one-time blocks.
    """
    _verify_professional_ownership(professional_id, company_id)
    payload: dict = {
        "professional_id": professional_id,
        "is_recurring": data.is_recurring,
        "reason": data.reason,
    }
    if data.is_recurring:
        payload["recurring_start_time"] = str(data.recurring_start_time)
        payload["recurring_end_time"] = str(data.recurring_end_time)
    else:
        payload["starts_at"] = data.starts_at.isoformat()
        payload["ends_at"] = data.ends_at.isoformat()
    try:
        result = supabase_admin.table("time_block").insert(payload).execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not create time block: {str(e)}",
        )
    return result.data[0]


def get_available_slots(professional_id: str, company_id: str, date_str: str) -> list[str]:
    """
    Returns available time slots (HH:MM strings) for a professional on a given date.

    Algorithm:
      1. Check professional belongs to company.
      2. Get professional's default_duration_minutes.
      3. Get active availability windows for that weekday.
      4. Collect busy periods from:
         - Non-cancelled appointments on that date.
         - Recurring time blocks (apply every day).
         - One-time time blocks that overlap that date.
      5. Generate slots at duration_minutes intervals within each availability
         window, skipping any slot that overlaps a busy period.
    """
    _verify_professional_ownership(professional_id, company_id)

    target = date_cls.fromisoformat(date_str)
    day_of_week = target.weekday()  # 0=Mon … 6=Sun

    # Professional's slot duration
    pro = (
        supabase_admin.table("professional")
        .select("default_duration_minutes")
        .eq("id", professional_id)
        .single()
        .execute()
    )
    duration_min = (pro.data or {}).get("default_duration_minutes", 60)

    # Availability windows for this weekday
    avail = (
        supabase_admin.table("availability")
        .select("start_time, end_time")
        .eq("professional_id", professional_id)
        .eq("day_of_week", day_of_week)
        .eq("active", True)
        .execute()
    ).data or []

    if not avail:
        return []

    # Appointments on this date
    appts = (
        supabase_admin.table("appointment")
        .select("starts_at, ends_at")
        .eq("professional_id", professional_id)
        .neq("status", "cancelled")
        .gte("starts_at", f"{date_str}T00:00:00")
        .lte("starts_at", f"{date_str}T23:59:59")
        .execute()
    ).data or []
    busy: list[tuple[time_cls, time_cls]] = [
        (_parse_iso_time(a["starts_at"]), _parse_iso_time(a["ends_at"])) for a in appts
    ]

    # Time blocks
    blocks = (
        supabase_admin.table("time_block")
        .select("*")
        .eq("professional_id", professional_id)
        .execute()
    ).data or []
    busy.extend(_extract_busy_periods(blocks, target))

    # Generate slots
    duration = timedelta(minutes=duration_min)
    now = datetime.now()
    is_today = target == now.date()
    now_time = now.time().replace(second=0, microsecond=0)

    slots: list[str] = []
    for w in avail:
        win_start = time_cls.fromisoformat(w["start_time"])
        win_end = time_cls.fromisoformat(w["end_time"])
        current = datetime.combine(target, win_start)
        end_dt = datetime.combine(target, win_end)
        while current + duration <= end_dt:
            s = current.time().replace(second=0, microsecond=0)
            e = (current + duration).time().replace(second=0, microsecond=0)
            if is_today and s <= now_time:
                current += duration
                continue
            overlapping = [(bp_s, bp_e) for (bp_s, bp_e) in busy if s < bp_e and e > bp_s]
            if overlapping:
                # Jump to the end of the earliest-ending blocker so we try
                # starting immediately after the pause (e.g. 14:30 after a
                # pause that ends at 14:30, instead of skipping to 15:00).
                earliest_end = min(bp_e for _, bp_e in overlapping)
                current = datetime.combine(target, earliest_end)
            else:
                slots.append(current.strftime("%H:%M"))
                current += duration
    return slots


def get_month_availability(professional_id: str, company_id: str, year: int, month: int) -> dict:
    """
    Returns per-day availability status for a calendar month.
    Status values: "past" | "available" | "fully_booked" | "day_off"
    Makes only 4 DB queries for the entire month (efficient bulk approach).
    """
    import calendar as cal_module

    _verify_professional_ownership(professional_id, company_id)

    _, num_days = cal_module.monthrange(year, month)
    today = date_cls.today()
    now = datetime.now()
    now_time = now.time().replace(second=0, microsecond=0)

    month_start = date_cls(year, month, 1)
    month_end = date_cls(year, month, num_days)
    pad = lambda n: str(n).zfill(2)

    # ── 1. Professional duration ──────────────────────────────────────────────
    pro = (
        supabase_admin.table("professional")
        .select("default_duration_minutes")
        .eq("id", professional_id)
        .single()
        .execute()
    )
    duration_min = (pro.data or {}).get("default_duration_minutes", 60)
    duration = timedelta(minutes=duration_min)

    # ── 2. Availability windows by weekday ───────────────────────────────────
    avail_rows = (
        supabase_admin.table("availability")
        .select("day_of_week, start_time, end_time")
        .eq("professional_id", professional_id)
        .eq("active", True)
        .execute()
    ).data or []
    avail_by_dow: dict[int, list] = {}
    for a in avail_rows:
        avail_by_dow.setdefault(a["day_of_week"], []).append(a)

    # ── 3. Appointments in the month (non-cancelled) ─────────────────────────
    appts = (
        supabase_admin.table("appointment")
        .select("starts_at, ends_at, status")
        .eq("professional_id", professional_id)
        .neq("status", "cancelled")
        .neq("status", "no_show")
        .gte("starts_at", f"{month_start}T00:00:00")
        .lte("starts_at", f"{month_end}T23:59:59")
        .execute()
    ).data or []
    appts_by_date: dict[date_cls, list[tuple[time_cls, time_cls]]] = {}
    for a in appts:
        d = _parse_iso_date(a["starts_at"])
        appts_by_date.setdefault(d, []).append((_parse_iso_time(a["starts_at"]), _parse_iso_time(a["ends_at"])))

    # ── 4. Time blocks ───────────────────────────────────────────────────────
    blocks = (
        supabase_admin.table("time_block")
        .select("*")
        .eq("professional_id", professional_id)
        .execute()
    ).data or []

    # ── Per-day calculation ──────────────────────────────────────────────────
    result: dict[str, str] = {}
    for day in range(1, num_days + 1):
        target = date_cls(year, month, day)
        date_str = f"{year}-{pad(month)}-{pad(day)}"

        if target < today:
            result[date_str] = "past"
            continue

        windows = avail_by_dow.get(target.weekday(), [])
        if not windows:
            result[date_str] = "day_off"
            continue

        # Build busy list for this day
        busy: list[tuple[time_cls, time_cls]] = (
            list(appts_by_date.get(target, [])) + _extract_busy_periods(blocks, target)
        )

        is_today = target == now.date()
        found = False
        for w in windows:
            win_start = time_cls.fromisoformat(w["start_time"])
            win_end = time_cls.fromisoformat(w["end_time"])
            current = datetime.combine(target, win_start)
            end_dt = datetime.combine(target, win_end)
            while current + duration <= end_dt:
                s = current.time().replace(second=0, microsecond=0)
                e = (current + duration).time().replace(second=0, microsecond=0)
                if is_today and s <= now_time:
                    current += duration
                    continue
                overlapping = [(bp_s, bp_e) for (bp_s, bp_e) in busy if s < bp_e and e > bp_s]
                if not overlapping:
                    found = True
                    break
                earliest_end = min(bp_e for _, bp_e in overlapping)
                current = datetime.combine(target, earliest_end)
            if found:
                break

        result[date_str] = "available" if found else "fully_booked"

    return result


def delete_time_block(block_id: str, professional_id: str, company_id: str) -> dict:
    """Deletes a time block. Ownership verified via professional→company chain."""
    _verify_professional_ownership(professional_id, company_id)
    result = (
        supabase_admin.table("time_block")
        .delete()
        .eq("id", block_id)
        .eq("professional_id", professional_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time block not found.",
        )
    return result.data[0]


def list_time_blocks_self(professional_id: str) -> list[dict]:
    """Returns time blocks for the authenticated professional (no company check)."""
    result = (
        supabase_admin.table("time_block")
        .select("*")
        .eq("professional_id", professional_id)
        .execute()
    )
    blocks = result.data or []
    blocks.sort(key=lambda b: (
        0 if b.get("is_recurring") else 1,
        b.get("starts_at") or "",
    ))
    return blocks


def create_time_block_self(professional_id: str, data) -> dict:
    """Creates a time block for the authenticated professional."""
    payload: dict = {
        "professional_id": professional_id,
        "is_recurring": data.is_recurring,
        "reason": data.reason,
    }
    if data.is_recurring:
        payload["recurring_start_time"] = str(data.recurring_start_time)
        payload["recurring_end_time"] = str(data.recurring_end_time)
    else:
        payload["starts_at"] = data.starts_at.isoformat()
        payload["ends_at"] = data.ends_at.isoformat()
    try:
        result = supabase_admin.table("time_block").insert(payload).execute()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Could not create time block: {str(e)}")
    return result.data[0]


def delete_time_block_self(block_id: str, professional_id: str) -> dict:
    """Deletes a time block owned by the authenticated professional."""
    result = (
        supabase_admin.table("time_block")
        .delete()
        .eq("id", block_id)
        .eq("professional_id", professional_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time block not found.")
    return result.data[0]


# ===========================================================================
# 7. CLIENT (continued)
# ===========================================================================

def deactivate_client(client_id: str, company_id: str) -> dict:
    """Soft-deletes a client by setting active=False."""
    result = (
        supabase_admin.table("client")
        .update({"active": False})
        .eq("id", client_id)
        .eq("company_id", company_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found.",
        )
    return result.data[0]


def list_client_documents(client_id: str, company_id: str) -> list[dict]:
    """Returns all documents attached to the client, newest first."""
    verify = (
        supabase_admin.table("client")
        .select("id")
        .eq("id", client_id)
        .eq("company_id", company_id)
        .execute()
    )
    if not verify.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")
    result = (
        supabase_admin.table("client_document")
        .select("*")
        .eq("client_id", client_id)
        .eq("company_id", company_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


def upload_client_document(client_id: str, company_id: str, file: UploadFile, observation_id: str | None = None, appointment_id: str | None = None) -> dict:
    """
    Uploads a file to Supabase Storage using the service role key (bypasses RLS)
    and saves the metadata record in one step.
    """
    verify = (
        supabase_admin.table("client")
        .select("id")
        .eq("id", client_id)
        .eq("company_id", company_id)
        .execute()
    )
    if not verify.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")

    file_bytes = file.file.read()
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    unique_id = uuid_module.uuid4().hex[:16]
    storage_path = f"{company_id}/{client_id}/{unique_id}.{ext}"

    try:
        supabase_admin.storage.from_("client-documents").upload(
            storage_path,
            file_bytes,
            {"content-type": file.content_type or "application/octet-stream"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Storage upload failed: {str(e)}",
        )

    doc_payload = {
        "client_id": client_id,
        "company_id": company_id,
        "file_name": file.filename,
        "file_type": file.content_type or "application/octet-stream",
        "storage_path": storage_path,
        "file_size_bytes": len(file_bytes),
        "observation_id": observation_id,
        "appointment_id": appointment_id,
    }
    result = supabase_admin.table("client_document").insert(doc_payload).execute()
    return result.data[0]


def get_document_signed_url(doc_id: str, client_id: str, company_id: str) -> dict:
    """Returns a short-lived signed URL to read the document from Supabase Storage."""
    doc = (
        supabase_admin.table("client_document")
        .select("storage_path")
        .eq("id", doc_id)
        .eq("client_id", client_id)
        .eq("company_id", company_id)
        .maybe_single()
        .execute()
    )
    if not doc or not doc.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    result = supabase_admin.storage.from_("client-documents").create_signed_url(
        doc.data["storage_path"], 3600
    )
    signed_url = result.get("signedURL") or result.get("signed_url") or result.get("signedUrl")
    if not signed_url:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not generate URL.")
    return {"signed_url": signed_url}


def delete_client_document(doc_id: str, client_id: str, company_id: str) -> dict:
    """Deletes the metadata record and the corresponding storage object."""
    doc = (
        supabase_admin.table("client_document")
        .select("storage_path")
        .eq("id", doc_id)
        .eq("client_id", client_id)
        .eq("company_id", company_id)
        .maybe_single()
        .execute()
    )
    if not doc or not doc.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    # Delete from storage (best-effort — proceed even if storage delete fails)
    try:
        supabase_admin.storage.from_("client-documents").remove([doc.data["storage_path"]])
    except Exception:
        pass

    result = (
        supabase_admin.table("client_document")
        .delete()
        .eq("id", doc_id)
        .eq("client_id", client_id)
        .eq("company_id", company_id)
        .execute()
    )
    return result.data[0]


def _get_client_lookup(client_id: str, company_id: str) -> dict:
    """Returns client row or raises 404. Shared by client sub-resource functions."""
    result = (
        supabase_admin.table("client")
        .select("id, name, phone, guardian_phone, is_minor, is_provisional")
        .eq("id", client_id)
        .eq("company_id", company_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")
    return result.data[0]


def list_client_observations(
    client_id: str,
    company_id: str,
    professional_id: str | None = None,
) -> list[dict]:
    """
    Returns the merged observation history for a client:
      - Manual entries from the client_observation table (source='manual')
      - Appointment notes for this client (source='appointment')
    Sorted newest first.

    When professional_id is provided (professional view), manual observations
    are hidden and appointment notes are restricted to that professional's
    appointments only.
    """
    client = _get_client_lookup(client_id, company_id)

    # Manual observations — visible to both company and professional views
    manual_result = (
        supabase_admin.table("client_observation")
        .select("*")
        .eq("client_id", client_id)
        .eq("company_id", company_id)
        .execute()
    )
    manual_result_data = manual_result.data or []
    manual = [
        {
            "id": r["id"],
            "client_id": client_id,
            "company_id": company_id,
            "content": r["content"],
            "source": "manual",
            "source_label": None,
            "created_at": r["created_at"],
            "documents": [],
        }
        for r in manual_result_data
    ]

    # Embed documents linked to each manual observation
    manual_obs_ids = [r["id"] for r in manual_result_data]
    if manual_obs_ids:
        docs_result = (
            supabase_admin.table("client_document")
            .select("id, file_name, file_type, storage_path, file_size_bytes, created_at, observation_id")
            .in_("observation_id", manual_obs_ids)
            .execute()
        )
        docs_by_obs: dict = {}
        for d in (docs_result.data or []):
            obs_id = d["observation_id"]
            docs_by_obs.setdefault(obs_id, []).append(d)
        for obs in manual:
            obs["documents"] = docs_by_obs.get(obs["id"], [])

    # Appointment notes/documents — fetch all appointments (no notes filter)
    base_query = (
        supabase_admin.table("appointment")
        .select("id, notes, starts_at, professional(name)")
        .eq("company_id", company_id)
    )
    if professional_id:
        base_query = base_query.eq("professional_id", professional_id)

    # Try exact client_id match first (column may not exist if migration not yet run)
    try:
        by_id = base_query.eq("client_id", client_id).execute()
        _id_data = by_id.data
    except Exception:
        _id_data = None
    if _id_data:
        appt_result = type("R", (), {"data": _id_data})()
    elif client.get("is_provisional"):
        # Never fall back to phone/name for provisional clients — prevents crossing
        class _Empty:
            data = []
        appt_result = _Empty()
    else:
        # Non-provisional: fall back to phone/name for legacy appointments without client_id
        phone = client.get("guardian_phone") if client.get("is_minor") else client.get("phone")
        name = client["name"]
        fallback_query = (
            supabase_admin.table("appointment")
            .select("id, notes, starts_at, professional(name)")
            .eq("company_id", company_id)
        )
        if phone:
            appt_result = fallback_query.eq("client_phone", phone).execute()
        else:
            appt_result = fallback_query.eq("client_name", name).execute()

    # Fetch documents for ALL appointments (before filtering by notes/docs)
    all_appt_ids = [r["id"] for r in (appt_result.data or [])]
    docs_by_appt: dict = {}
    if all_appt_ids:
        appt_docs_result = (
            supabase_admin.table("client_document")
            .select("id, file_name, file_type, storage_path, file_size_bytes, created_at, appointment_id")
            .in_("appointment_id", all_appt_ids)
            .execute()
        )
        for d in (appt_docs_result.data or []):
            docs_by_appt.setdefault(d["appointment_id"], []).append(d)

    # Include appointment if it has notes OR has attached documents
    appt_obs = [
        {
            "id": r["id"],
            "client_id": client_id,
            "company_id": company_id,
            "content": r.get("notes") or "",
            "source": "appointment",
            "source_label": (r.get("professional") or {}).get("name"),
            "created_at": r["starts_at"],
            "documents": docs_by_appt.get(r["id"], []),
        }
        for r in (appt_result.data or [])
        if r.get("notes") or docs_by_appt.get(r["id"])
    ]

    all_obs = manual + appt_obs
    all_obs.sort(key=lambda x: x["created_at"], reverse=True)
    return all_obs


def add_client_observation(client_id: str, company_id: str, content: str) -> dict:
    """Adds a manual observation entry to the client's history."""
    _get_client_lookup(client_id, company_id)
    result = (
        supabase_admin.table("client_observation")
        .insert({"client_id": client_id, "company_id": company_id, "content": content})
        .execute()
    )
    row = result.data[0]
    return {
        "id": row["id"],
        "client_id": client_id,
        "company_id": company_id,
        "content": row["content"],
        "source": "manual",
        "source_label": None,
        "created_at": row["created_at"],
        "documents": [],
    }


def update_client_observation(obs_id: str, client_id: str, company_id: str, content: str) -> dict:
    """Updates the content of a manual observation."""
    result = (
        supabase_admin.table("client_observation")
        .update({"content": content})
        .eq("id", obs_id)
        .eq("client_id", client_id)
        .eq("company_id", company_id)
        .eq("source", "manual")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Observation not found.")
    return result.data[0]


def delete_client_observation(obs_id: str, client_id: str, company_id: str) -> dict:
    """Deletes a manual observation. Appointment notes cannot be deleted here."""
    result = (
        supabase_admin.table("client_observation")
        .delete()
        .eq("id", obs_id)
        .eq("client_id", client_id)
        .eq("company_id", company_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Observation not found.")
    return result.data[0]


def get_client_appointments(client_id: str, company_id: str) -> list[dict]:
    """
    Returns all appointments for a given client, matched by phone (preferred)
    or name when phone is not available. Results are ordered newest first.
    """
    client = _get_client_lookup(client_id, company_id)

    # Try exact client_id match first (column may not exist if migration not yet run)
    try:
        by_id = (
            supabase_admin.table("appointment")
            .select("*, professional(id, name, color)")
            .eq("company_id", company_id)
            .eq("client_id", client_id)
            .order("starts_at", desc=True)
            .limit(200)
            .execute()
        )
        _id_data = by_id.data
    except Exception:
        _id_data = None
    if _id_data:
        result = type("R", (), {"data": _id_data})()
    elif client.get("is_provisional"):
        # Never fall back to phone/name for provisional clients — prevents crossing
        class _Empty:
            data = []
        result = _Empty()
    else:
        # Non-provisional: fall back to phone/name for legacy appointments without client_id
        phone = client.get("guardian_phone") if client.get("is_minor") else client.get("phone")
        name = client["name"]
        fallback_query = (
            supabase_admin.table("appointment")
            .select("*, professional(id, name, color)")
            .eq("company_id", company_id)
            .order("starts_at", desc=True)
            .limit(200)
        )
        if phone:
            result = fallback_query.eq("client_phone", phone).execute()
        else:
            result = fallback_query.eq("client_name", name).execute()
    appointments = result.data or []

    # Embed documents linked to each appointment
    appt_ids = [r["id"] for r in appointments]
    if appt_ids:
        docs_result = (
            supabase_admin.table("client_document")
            .select("id, file_name, file_type, storage_path, file_size_bytes, created_at, appointment_id")
            .in_("appointment_id", appt_ids)
            .execute()
        )
        docs_by_appt: dict = {}
        for d in (docs_result.data or []):
            appt_id = d["appointment_id"]
            docs_by_appt.setdefault(appt_id, []).append(d)
        for appt in appointments:
            appt["documents"] = docs_by_appt.get(appt["id"], [])

    return appointments


# ===========================================================================
# 8. COMPANY AVAILABILITY & TIME BLOCKS
# ===========================================================================

def list_company_availability(company_id: str) -> list:
    """Returns all availability windows for a company, ordered by weekday."""
    result = (
        supabase_admin.table("company_availability")
        .select("*")
        .eq("company_id", company_id)
        .order("day_of_week")
        .execute()
    )
    return result.data or []


def save_company_availability(company_id: str, data) -> list:
    """Bulk-replaces company availability (delete all, then insert new)."""
    supabase_admin.table("company_availability").delete().eq("company_id", company_id).execute()
    if not data.slots:
        return []
    rows = [
        {
            "company_id": company_id,
            "day_of_week": s.day_of_week,
            "start_time": s.start_time,
            "end_time": s.end_time,
        }
        for s in data.slots
    ]
    result = supabase_admin.table("company_availability").insert(rows).execute()
    return result.data or []


def list_company_time_blocks(company_id: str) -> list:
    """Returns all time blocks for a company (recurring first, then by date)."""
    result = (
        supabase_admin.table("company_time_block")
        .select("*")
        .eq("company_id", company_id)
        .execute()
    )
    blocks = result.data or []
    blocks.sort(key=lambda b: (
        0 if b.get("is_recurring") else 1,
        b.get("starts_at") or "",
    ))
    return blocks


def create_company_time_block(company_id: str, data) -> dict:
    """Creates a time block (closed period) for the company."""
    payload: dict = {
        "company_id": company_id,
        "is_recurring": data.is_recurring,
        "reason": data.reason,
    }
    if data.is_recurring:
        if not data.recurring_start_time or not data.recurring_end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="recurring_start_time and recurring_end_time required for recurring blocks.",
            )
        payload["recurring_start_time"] = str(data.recurring_start_time)
        payload["recurring_end_time"] = str(data.recurring_end_time)
    else:
        if not data.starts_at or not data.ends_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="starts_at and ends_at required for one-time blocks.",
            )
        payload["starts_at"] = data.starts_at.isoformat()
        payload["ends_at"] = data.ends_at.isoformat()
    try:
        result = supabase_admin.table("company_time_block").insert(payload).execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not create time block: {str(e)}",
        )
    return result.data[0]


def delete_company_time_block(company_id: str, block_id: str) -> None:
    """Deletes a company time block (ownership-checked)."""
    existing = (
        supabase_admin.table("company_time_block")
        .select("id")
        .eq("id", block_id)
        .eq("company_id", company_id)
        .maybe_single()
        .execute()
    )
    if not existing or not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time block not found.",
        )
    supabase_admin.table("company_time_block").delete().eq("id", block_id).execute()


# ===========================================================================
# 9. APPOINTMENT REMINDERS
# ===========================================================================

def process_appointment_reminders() -> dict:
    """
    Finds appointments due for email reminders and returns the list so the
    route can send emails via BackgroundTasks.

    Each company configures reminder_hours_before (0 = disabled).
    We check a 1-hour window: [now + hours, now + hours + 1h].
    The appointment.reminder_sent flag prevents duplicate sends.
    """
    now = datetime.now(timezone.utc)

    companies = (
        supabase_admin.table("company")
        .select("id, name, reminder_hours_before")
        .gt("reminder_hours_before", 0)
        .execute()
    )

    pending: list[dict] = []  # list of {client_name, client_email, starts_at, professional_name, appt_id}

    for company in (companies.data or []):
        hours = company["reminder_hours_before"]
        window_start = now + timedelta(hours=hours)
        window_end = window_start + timedelta(hours=1)

        appts = (
            supabase_admin.table("appointment")
            .select("id, client_name, client_email, starts_at, professional_id")
            .eq("company_id", company["id"])
            .eq("status", "scheduled")
            .eq("reminder_sent", False)
            .gte("starts_at", window_start.isoformat())
            .lt("starts_at", window_end.isoformat())
            .execute()
        )

        for appt in (appts.data or []):
            if not appt.get("client_email"):
                continue
            pro = (
                supabase_admin.table("professional")
                .select("name")
                .eq("id", appt["professional_id"])
                .maybe_single()
                .execute()
            )
            pro_name = (pro.data or {}).get("name", "—")
            pending.append({
                "appt_id": appt["id"],
                "client_name": appt["client_name"],
                "client_email": appt["client_email"],
                "starts_at": appt["starts_at"],
                "professional_name": pro_name,
                "company_name": company.get("name", ""),
            })
            # Mark as sent immediately to avoid duplicates if the endpoint is called twice
            supabase_admin.table("appointment").update({"reminder_sent": True}).eq("id", appt["id"]).execute()

    return {"pending": pending, "count": len(pending)}
