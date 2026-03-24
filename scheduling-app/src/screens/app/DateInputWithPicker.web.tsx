import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { View } from 'react-native';
import SimpleDatePicker from './SimpleDatePicker.web';

const HIDE_NATIVE_ICON_CSS = `
  .date-input-custom::-webkit-calendar-picker-indicator { opacity: 0; width: 0; padding: 0; margin: 0; }
  .date-input-custom::-webkit-inner-spin-button { display: none; }
`;

export default function DateInputWithPicker({ value, onChange, minDate }: {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0, width: 208 });
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = 'date-input-custom-css';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = HIDE_NATIVE_ICON_CSS;
      document.head.appendChild(s);
    }
  }, []);

  const openPicker = () => {
    if (rowRef.current) {
      const rect = rowRef.current.getBoundingClientRect();
      setPickerPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen(v => !v);
  };

  const picker = open ? ReactDOM.createPortal(
    <>
      <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
      <div style={{ position: 'fixed', top: pickerPos.top, left: pickerPos.left, width: pickerPos.width, zIndex: 9999 }}>
        <SimpleDatePicker
          value={value}
          onChange={(date) => { onChange(date); setOpen(false); }}
          minDate={minDate}
        />
      </div>
    </>,
    document.body,
  ) : null;

  return (
    <View style={{ position: 'relative' } as any}>
      <div ref={rowRef} style={{ display: 'flex', alignItems: 'center', border: `1px solid ${value ? '#8e7f7e' : '#efeae8'}`, borderRadius: 8, backgroundColor: '#fdfcfc', overflow: 'hidden' }}>
        <input
          type="date"
          className="date-input-custom"
          value={value}
          min={minDate}
          onChange={(e: any) => onChange(e.target.value)}
          style={{
            flex: 1, fontSize: 13, color: '#635857',
            border: 'none', outline: 'none',
            padding: '8px 10px', fontFamily: 'inherit',
            backgroundColor: 'transparent', width: '100%',
          }}
        />
        <button
          onClick={openPicker}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px', fontSize: 15, color: open ? '#635857' : '#a08c8b', lineHeight: 1 }}
        >
          🗓
        </button>
      </div>
      {picker}
    </View>
  );
}