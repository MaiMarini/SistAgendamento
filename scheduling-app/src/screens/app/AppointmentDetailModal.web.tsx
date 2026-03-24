import React, { useState } from 'react';
import { ActivityIndicator, Modal, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { modalStyles, cardStyles } from './AppointmentsScreen.web.styles';
import {
  getBadgeStyle, STATUS_LABEL, formatDateTime, formatTime,
  parseNaive, fmtDate, patchAppointmentTime,
} from '../../lib/appointmentUtils';
import { getToken } from '../../lib/supabase';
import { API_URL } from '../../lib/config';
import { CalendarDatePicker, SlotPicker } from './BookingModal.web';

interface Props {
  visible: boolean;
  onClose: () => void;
  appointment: any | null;
  onUpdateStatus: (id: string, newStatus: string) => void;
  onUpdate?: (updated: any) => void;
}

export default function AppointmentDetailModal({
  visible, onClose, appointment, onUpdateStatus, onUpdate,
}: Props) {
  const [editingTime, setEditingTime] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchSlots = async (proId: string, date: string) => {
    if (!proId || !date) return;
    setSlotsLoading(true);
    setAvailableSlots([]);
    const token = await getToken();
    const res = await fetch(
      `${API_URL}/professionals/${proId}/available-slots?date=${date}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.ok) setAvailableSlots(await res.json());
    setSlotsLoading(false);
  };

  const enterEdit = () => {
    if (!appointment) return;
    const dt = parseNaive(appointment.starts_at);
    const date = fmtDate(dt);
    setEditDate(date);
    setEditTime('');
    setAvailableSlots([]);
    setEditError('');
    setEditingTime(true);
    const proId = appointment.professional_id ?? appointment.professional?.id ?? '';
    fetchSlots(proId, date);
  };

  const cancelEdit = () => {
    setEditingTime(false);
    setEditError('');
    setAvailableSlots([]);
  };

  const saveTime = async () => {
    if (!editDate || !editTime) {
      setEditError('Selecione a data e o horário.');
      return;
    }
    const durationMs =
      parseNaive(appointment.ends_at).getTime() - parseNaive(appointment.starts_at).getTime();
    const durationMin = Math.round(durationMs / 60000);
    setSaving(true);
    try {
      const updated = await patchAppointmentTime(
        appointment.id,
        `${editDate}T${editTime}:00`,
        durationMin,
      );
      setEditingTime(false);
      setAvailableSlots([]);
      onUpdate?.(updated);
    } catch {
      setEditError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View {...{ dataSet: { modal: 'true' } } as any} style={[modalStyles.content, editingTime && { width: 560 } as any]}>
          {appointment && (() => {
            const app = appointment;
            // professional_id can be a flat field (from appointments list)
            // or nested inside professional.id (from client appointments tab)
            const proId: string = app.professional_id ?? app.professional?.id ?? '';
            const badge = getBadgeStyle(app.status);
            const label = STATUS_LABEL[app.status] ?? app.status;
            const proName = app.professional?.name ?? '—';
            const canAct = app.status === 'scheduled' || app.status === 'confirmed';
            return (
              <>
                <View style={modalStyles.header}>
                  <Text style={modalStyles.title}>
                    {editingTime ? 'Alterar horário' : 'Detalhes do Agendamento'}
                  </Text>
                  <TouchableOpacity style={modalStyles.closeButton} onPress={onClose}>
                    <Text style={modalStyles.closeText}>×</Text>
                  </TouchableOpacity>
                </View>

                {!editingTime ? (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={modalStyles.detailRow}>
                      <Text style={modalStyles.detailLabel}>Status</Text>
                      <View style={[cardStyles.badge, badge.bg]}>
                        <Text style={[cardStyles.badgeText, badge.text]}>{label}</Text>
                      </View>
                    </View>
                    <View style={modalStyles.detailRow}>
                      <Text style={modalStyles.detailLabel}>Cliente</Text>
                      <Text style={modalStyles.detailValue}>{app.client_name}</Text>
                    </View>
                    {app.client_email ? (
                      <View style={modalStyles.detailRow}>
                        <Text style={modalStyles.detailLabel}>E-mail</Text>
                        <Text style={modalStyles.detailValue}>{app.client_email}</Text>
                      </View>
                    ) : null}
                    {app.client_phone ? (
                      <View style={modalStyles.detailRow}>
                        <Text style={modalStyles.detailLabel}>Telefone</Text>
                        <Text style={modalStyles.detailValue}>{app.client_phone}</Text>
                      </View>
                    ) : null}
                    <View style={modalStyles.detailRow}>
                      <Text style={modalStyles.detailLabel}>Profissional</Text>
                      <Text style={modalStyles.detailValue}>{proName}</Text>
                    </View>
                    <View style={modalStyles.detailRow}>
                      <Text style={modalStyles.detailLabel}>Início</Text>
                      <Text style={modalStyles.detailValue}>{formatDateTime(app.starts_at)}</Text>
                    </View>
                    <View style={modalStyles.detailRow}>
                      <Text style={modalStyles.detailLabel}>Término</Text>
                      <Text style={modalStyles.detailValue}>{formatTime(app.ends_at)}</Text>
                    </View>
                    {app.notes ? (
                      <View style={modalStyles.detailRow}>
                        <Text style={modalStyles.detailLabel}>Obs.</Text>
                        <Text style={modalStyles.detailValue}>{app.notes}</Text>
                      </View>
                    ) : null}

                    {canAct && (
                      <>
                        <View style={modalStyles.actionRow}>
                          {app.status === 'scheduled' && (
                            <TouchableOpacity
                              style={[modalStyles.btnAction, modalStyles.btnConfirm]}
                              onPress={() => onUpdateStatus(app.id, 'confirmed')}
                            >
                              <Text style={[modalStyles.btnActionText, modalStyles.btnConfirmText]}>Confirmar</Text>
                            </TouchableOpacity>
                          )}
                          {app.status === 'confirmed' && (
                            <TouchableOpacity
                              style={[modalStyles.btnAction, modalStyles.btnComplete]}
                              onPress={() => onUpdateStatus(app.id, 'completed')}
                            >
                              <Text style={[modalStyles.btnActionText, modalStyles.btnCompleteText]}>Concluir</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[modalStyles.btnAction, modalStyles.btnNoShow]}
                            onPress={() => onUpdateStatus(app.id, 'no_show')}
                          >
                            <Text style={[modalStyles.btnActionText, modalStyles.btnNoShowText]}>Não compareceu</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[modalStyles.btnAction, modalStyles.btnCancelAppt]}
                            onPress={() => onUpdateStatus(app.id, 'cancelled')}
                          >
                            <Text style={[modalStyles.btnActionText, modalStyles.btnCancelApptText]}>Cancelar</Text>
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={modalStyles.btnReschedule} onPress={enterEdit}>
                          <Text style={modalStyles.btnRescheduleText}>Alterar horário</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </ScrollView>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ marginBottom: 16 }}>
                      <Text style={modalStyles.fieldLabel}>Data *</Text>
                      <CalendarDatePicker
                        professionalId={proId}
                        selected={editDate}
                        onSelect={(date) => {
                          setEditDate(date);
                          setEditTime('');
                          fetchSlots(proId, date);
                        }}
                      />
                    </View>

                    <View style={{ marginBottom: 16 }}>
                      <Text style={modalStyles.fieldLabel}>Horário *</Text>
                      <SlotPicker
                        slots={availableSlots}
                        loading={slotsLoading}
                        selected={editTime}
                        onSelect={setEditTime}
                        hasPro={!!proId}
                        hasDate={!!editDate}
                      />
                    </View>

                    {editError ? (
                      <Text style={modalStyles.errorText}>{editError}</Text>
                    ) : null}
                  </ScrollView>
                )}

                <View style={modalStyles.footer}>
                  {editingTime ? (
                    <>
                      <TouchableOpacity
                        style={modalStyles.btnCancel}
                        onPress={cancelEdit}
                        disabled={saving}
                      >
                        <Text style={modalStyles.btnCancelText}>Voltar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[modalStyles.btnSave, { flex: 2 }]}
                        onPress={saveTime}
                        disabled={saving}
                        activeOpacity={0.85}
                      >
                        {saving
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={modalStyles.btnSaveText}>Salvar horário</Text>}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity style={[modalStyles.btnCancel, { flex: 2 }]} onPress={onClose}>
                      <Text style={modalStyles.btnCancelText}>Fechar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            );
          })()}
        </View>
      </View>
    </Modal>
  );
}