import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAY_NAMES   = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
const pad2 = (n: number) => String(n).padStart(2, '0');

export default function SimpleDatePicker({ value, onChange, minDate }: {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
}) {
  const todayDate  = new Date();
  const todayStr   = `${todayDate.getFullYear()}-${pad2(todayDate.getMonth() + 1)}-${pad2(todayDate.getDate())}`;
  const initYear   = value ? parseInt(value.slice(0, 4)) : todayDate.getFullYear();
  const initMonth  = value ? parseInt(value.slice(5, 7)) - 1 : todayDate.getMonth();

  const [viewYear,  setViewYear]  = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);
  const [pickingMonthYear, setPickingMonthYear] = useState(false);
  const [pickYear, setPickYear]   = useState(initYear);

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); };

  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow     = new Date(viewYear, viewMonth, 1).getDay();
  const startOffset  = firstDow === 0 ? 6 : firstDow - 1;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <View style={{ borderWidth: 1, borderColor: '#efeae8', borderRadius: 9, overflow: 'hidden', backgroundColor: '#fdfcfc', position: 'relative' } as any}>

      {/* ── Month/year picker overlay ── */}
      {pickingMonthYear && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, backgroundColor: '#fdfcfc', borderRadius: 9 } as any}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingVertical: 10, backgroundColor: '#f7f2f1' }}>
            <TouchableOpacity onPress={() => setPickYear(y => y - 1)} style={{ padding: 8 }} activeOpacity={0.7}>
              <Text style={{ fontSize: 18, color: '#8e7f7e' }}>‹</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#635857' }}>{pickYear}</Text>
            <TouchableOpacity onPress={() => setPickYear(y => y + 1)} style={{ padding: 8 }} activeOpacity={0.7}>
              <Text style={{ fontSize: 18, color: '#8e7f7e' }}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 8 }}>
            {MONTH_NAMES.map((name, idx) => {
              const isSel = idx === viewMonth && pickYear === viewYear;
              return (
                <TouchableOpacity
                  key={name}
                  style={{ width: '33.33%' as any, paddingVertical: 10, alignItems: 'center' }}
                  onPress={() => { setViewMonth(idx); setViewYear(pickYear); setPickingMonthYear(false); }}
                  activeOpacity={0.7}
                >
                  <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: isSel ? '#8e7f7e' : 'transparent' }}>
                    <Text style={{ fontSize: 13, fontWeight: isSel ? '700' : '500', color: isSel ? '#fff' : '#635857' }}>
                      {name.slice(0, 3)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity onPress={() => setPickingMonthYear(false)} style={{ alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#efeae8' }} activeOpacity={0.7}>
            <Text style={{ fontSize: 12, color: '#a08c8b' }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Header ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingVertical: 8, backgroundColor: '#f7f2f1' }}>
        <TouchableOpacity onPress={prevMonth} style={{ padding: 8 }} activeOpacity={0.7}>
          <Text style={{ fontSize: 18, color: '#8e7f7e' }}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setPickYear(viewYear); setPickingMonthYear(true); }} activeOpacity={0.8} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#635857' }}>{MONTH_NAMES[viewMonth]} {viewYear} ▾</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={nextMonth} style={{ padding: 8 }} activeOpacity={0.7}>
          <Text style={{ fontSize: 18, color: '#8e7f7e' }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── Day-of-week labels ── */}
      <View style={{ flexDirection: 'row' }}>
        {DAY_NAMES.map(d => (
          <View key={d} style={{ flex: 1, alignItems: 'center', paddingVertical: 5 }}>
            <Text style={{ fontSize: 10, color: '#a08c8b', fontWeight: '600' }}>{d}</Text>
          </View>
        ))}
      </View>

      {/* ── Day grid ── */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e${i}`} style={{ width: '14.285714%' as any, aspectRatio: 1 }} />;
          const dateStr  = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(day)}`;
          const isSel    = value === dateStr;
          const isToday  = dateStr === todayStr;
          const disabled = !!minDate && dateStr < minDate;
          return (
            <TouchableOpacity
              key={dateStr}
              style={{ width: '14.285714%' as any, alignItems: 'center', justifyContent: 'center', paddingVertical: 3 }}
              onPress={() => !disabled && onChange(dateStr)}
              activeOpacity={disabled ? 1 : 0.7}
            >
              <View style={{
                width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
                backgroundColor: isSel ? '#8e7f7e' : isToday ? '#f0ebe9' : 'transparent',
                borderWidth: isToday && !isSel ? 1 : 0,
                borderColor: '#8e7f7e',
              }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: isSel || isToday ? '700' : '400',
                  color: isSel ? '#fff' : disabled ? '#d4c9c8' : isToday ? '#635857' : '#635857',
                }}>
                  {day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

    </View>
  );
}