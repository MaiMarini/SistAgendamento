import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useResponsiveWeb } from '../../lib/useResponsiveWeb';
import { useDrawerNav } from '../../lib/useDrawerNav';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase, getToken } from '../../lib/supabase';
import { API_URL } from '../../lib/config';
import { styles, CALENDAR_CSS } from './HomeScreen.web.styles';
import { naiveIso, fmtDate, patchAppointmentStatus } from '../../lib/appointmentUtils';
import AppointmentDetailModal from './AppointmentDetailModal.web';
import { useAppointmentDetailModal } from '../../hooks/useAppointmentDetailModal';

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ── Event content renderers ───────────────────────────────────────────────────

function firstWord(name: string): string {
  return name.split(' ')[0];
}

function renderEventContent(arg: any) {
  const isPause = arg.event.extendedProps.type === 'pause';
  const isMonth  = arg.view.type === 'dayGridMonth';
  const proColor = arg.event.extendedProps.pro?.color ?? '#8e7f7e';

  if (isMonth) {
    const borderColor = isPause ? '#c4b8b7' : proColor;
    const label = isPause
      ? `⏸ ${firstWord(arg.event.title)}`
      : firstWord(arg.event.title);

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        backgroundColor: '#ffffff',
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: '0 4px 4px 0',
        padding: '2px 5px',
        overflow: 'hidden', whiteSpace: 'nowrap',
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        width: '100%', boxSizing: 'border-box',
      }}>
        {arg.timeText ? (
          <span style={{ fontSize: 10, color: '#a08c8b', fontWeight: 600, flexShrink: 0 }}>
            {arg.timeText}
          </span>
        ) : null}
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: isPause ? '#a08c8b' : '#3d2f2e',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {label}
        </span>
      </div>
    );
  }

  // ── Semana / Dia ─────────────────────────────────────────────────────────
  const pauseReason = isPause ? (arg.event.extendedProps.block?.reason ?? null) : null;

  return (
    <div style={{
      padding: '4px 7px', height: '100%', overflow: 'hidden',
      boxSizing: 'border-box',
      borderLeft: isPause ? '3px dashed rgba(0,0,0,0.20)' : undefined,
    }}>
      {arg.timeText ? (
        <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.85, lineHeight: 1.3, marginBottom: 1 }}>
          {arg.timeText}
        </div>
      ) : null}
      <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, overflow: 'hidden' }}>
        {isPause ? `⏸ ${arg.event.title}` : arg.event.title}
      </div>
      {pauseReason ? (
        <div style={{ fontSize: 11, opacity: 0.75, lineHeight: 1.3, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {pauseReason}
        </div>
      ) : null}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function HomeScreen() {
  useResponsiveWeb();
  const { isMobile, openDrawer } = useDrawerNav();
  const calendarRef = useRef<FullCalendar>(null);
  const apptDetail = useAppointmentDetailModal<any>();
  const [viewDate, setViewDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickYear, setPickYear] = useState(new Date().getFullYear());
  // Refetch sempre que a sessão mudar (login, logout+login, token refresh)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        calendarRef.current?.getApi().refetchEvents();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Refetch ao voltar para a tela
  useFocusEffect(useCallback(() => {
    calendarRef.current?.getApi().refetchEvents();
  }, []));


  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = CALENDAR_CSS;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const fetchEvents = useCallback(async (
    fetchInfo: { start: Date; end: Date },
    successCallback: (events: any[]) => void,
    failureCallback: (err: Error) => void,
  ) => {
    try {
      const token = await getToken();
      if (!token) {
        // Sessao ainda nao disponivel -- retry em 1.5s
        setTimeout(() => calendarRef.current?.getApi().refetchEvents(), 1500);
        successCallback([]);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

      const dateFrom = `${fmtDate(fetchInfo.start)}T00:00:00`;
      const dateTo = `${fmtDate(new Date(fetchInfo.end.getTime() - 1))}T23:59:59`;

      const [apptRes, proRes, rawBlocks] = await Promise.all([
        fetch(`${API_URL}/appointments/?date_from=${dateFrom}&date_to=${dateTo}`, { headers }),
        fetch(`${API_URL}/professionals/`, { headers }),
        fetch(`${API_URL}/professionals/all-time-blocks`, { headers })
          .then(r => r.ok ? r.json() : [])
          .catch(() => []),
      ]);

      if (!apptRes.ok || !proRes.ok) {
        // Retry automatico em 2s (falha transitoria Supabase)
        setTimeout(() => calendarRef.current?.getApi().refetchEvents(), 2000);
        successCallback([]);
        return;
      }

      const allAppts: any[] = await apptRes.json();
      const appointments = allAppts.filter((a: any) => a.status !== "cancelled" && a.status !== "no_show");
      const professionals: any[] = await proRes.json();

      const allBlocks = (rawBlocks as any[]).map(b => ({
        ...b,
        professional: b.professional ?? professionals.find((p: any) => p.id === b.professional_id),
      }));

      const events: any[] = [];

      // ── Agendamentos ───────────────────────────────────────────────────────
      for (const appt of appointments) {
        const pro = professionals.find((p: any) => p.id === appt.professional_id);
        const color = pro?.color ?? '#8e7f7e';
        events.push({
          id: appt.id,
          title: appt.client_name,
          start: naiveIso(appt.starts_at),
          end: naiveIso(appt.ends_at),
          backgroundColor: color,
          borderColor: color,
          textColor: '#ffffff',
          extendedProps: { type: 'appointment', appt: { ...appt, professional: pro }, pro },
          classNames: appt.status === 'cancelled' || appt.status === 'no_show' ? ['fc-event-past'] : [],
        });
      }

      // ── Bloqueios / Pausas ──────────────────────────────────────────────────
      const PAUSE_BG = '#e8e0df';
      const PAUSE_BORDER = '#c4b8b7';
      const PAUSE_TEXT = '#635857';

      for (const block of allBlocks) {
        const title = block.professional.name;

        if (block.is_recurring && block.recurring_start_time && block.recurring_end_time) {
          const cur = new Date(fetchInfo.start);
          while (cur < fetchInfo.end) {
            const dateStr = fmtDate(cur);
            events.push({
              id: `block-${block.id}-${dateStr}`,
              title,
              start: `${dateStr}T${block.recurring_start_time}`,
              end: `${dateStr}T${block.recurring_end_time}`,
              backgroundColor: PAUSE_BG,
              borderColor: PAUSE_BORDER,
              textColor: PAUSE_TEXT,
              extendedProps: { type: 'pause', block },
            });
            cur.setDate(cur.getDate() + 1);
          }
        } else if (!block.is_recurring && block.starts_at && block.ends_at) {
          events.push({
            id: `block-${block.id}`,
            title,
            start: naiveIso(block.starts_at),
            end: naiveIso(block.ends_at),
            backgroundColor: PAUSE_BG,
            borderColor: PAUSE_BORDER,
            textColor: PAUSE_TEXT,
            extendedProps: { type: 'pause', block },
          });
        }
      }

      successCallback(events);
    } catch (e) {
      failureCallback(e as Error);
    }
  }, []);

  const handleEventClick = useCallback((info: any) => {
    if (info.event.extendedProps.type !== 'appointment') return;
    apptDetail.open(info.event.extendedProps.appt);
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    await patchAppointmentStatus(id, newStatus);
    apptDetail.close();
    calendarRef.current?.getApi().refetchEvents();
  };

  const handleUpdateAppointment = (updated: any) => {
    apptDetail.open(updated);
    calendarRef.current?.getApi().refetchEvents();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { flexDirection: 'row', alignItems: 'center' }]}>
        {isMobile && (
          <TouchableOpacity onPress={openDrawer} style={{ marginRight: 14, padding: 4 }}>
            <Text style={{ fontSize: 22, color: '#8e7f7e', lineHeight: 22 }}>☰</Text>
          </TouchableOpacity>
        )}
        <Text {...{ dataSet: { topTitle: 'true' } } as any} style={styles.topBarTitle}>Calendário</Text>
      </View>

      <View {...{ dataSet: { calWrapper: 'true' } } as any} style={styles.calendarWrapper}>
        <View {...{ dataSet: { calCard: 'true' } } as any} style={[styles.calendarCard, { position: 'relative' } as any]}
          {...({ onClick: (e: any) => {
            if ((e.target as HTMLElement).closest('.fc-toolbar-title')) {
              setPickYear(viewDate.getFullYear());
              setShowPicker(true);
            }
          }} as any)}
        >
          {/* ── Month/year picker popover ── */}
          {showPicker && (
            <>
              <div onClick={() => setShowPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
              <div style={{ position: 'absolute', top: 52, left: '50%', transform: 'translateX(-50%)', zIndex: 10, backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #efeae8', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', width: 240, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f7f2f1' }}>
                  <button onClick={() => setPickYear(y => y - 1)} style={{ background: 'none', border: 'none', fontSize: 18, color: '#8e7f7e', cursor: 'pointer', padding: '2px 8px' }}>‹</button>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#635857' }}>{pickYear}</span>
                  <button onClick={() => setPickYear(y => y + 1)} style={{ background: 'none', border: 'none', fontSize: 18, color: '#8e7f7e', cursor: 'pointer', padding: '2px 8px' }}>›</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', padding: '8px 10px' }}>
                  {MONTH_NAMES.map((name, idx) => {
                    const isSel = idx === viewDate.getMonth() && pickYear === viewDate.getFullYear();
                    return (
                      <div key={name} style={{ width: '33.33%', padding: '3px 0', display: 'flex', justifyContent: 'center' }}>
                        <button
                          onClick={() => {
                            const api = calendarRef.current?.getApi();
                            if (api) api.gotoDate(new Date(pickYear, idx, 1));
                            setShowPicker(false);
                          }}
                          style={{ background: isSel ? '#8e7f7e' : 'transparent', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: isSel ? 700 : 400, color: isSel ? '#fff' : '#635857', cursor: 'pointer', width: '100%' }}
                        >
                          {name.slice(0, 3)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="pt-br"
            timeZone="local"
            headerToolbar={{
              left: 'today',
              center: 'prev,title,next',
              right: isMobile ? 'dayGridMonth' : 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia' }}
            datesSet={(info) => {
              setViewDate(info.view.currentStart);
              const today = new Date();
              const visible = today >= info.view.activeStart && today < info.view.activeEnd;
              const btn = document.querySelector('.fc-today-button');
              if (btn) btn.classList.toggle('fc-today-visible', visible);
            }}
            height="100%"
            showNonCurrentDates={false}
            fixedWeekCount={false}
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            slotDuration="00:30:00"
            eventMaxStack={3}
            dayMaxEvents={4}
            events={fetchEvents}
            eventContent={renderEventContent}
            eventClick={handleEventClick}
            eventDidMount={(info) => {
              if (info.event.extendedProps.type === 'pause' && info.view.type === 'dayGridMonth') {
                const harness = info.el.closest('.fc-daygrid-event-harness') as HTMLElement | null;
                if (harness) harness.style.display = 'none';
              }
            }}
            dateClick={(info) => {
              calendarRef.current?.getApi().changeView('timeGridDay', info.dateStr);
            }}
          />
        </View>
      </View>
      <AppointmentDetailModal
        visible={apptDetail.visible}
        onClose={apptDetail.close}
        appointment={apptDetail.appointment}
        onUpdateStatus={handleUpdateStatus}
        onUpdate={handleUpdateAppointment}
      />
    </View>
  );
}