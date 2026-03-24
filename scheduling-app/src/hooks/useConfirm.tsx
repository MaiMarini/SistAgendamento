import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';

export interface ConfirmOptions {
  message: string;
  title?: string;
  confirmLabel?: string;
  danger?: boolean;
}

export function useConfirm() {
  const [config, setConfig] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = (opts: ConfirmOptions): Promise<boolean> =>
    new Promise(resolve => setConfig({ ...opts, resolve }));

  const dialog = config ? (
    <Modal visible transparent animationType="fade" onRequestClose={() => { config.resolve(false); setConfig(null); }}>
      <View style={{
        flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center', alignItems: 'center',
      }}>
        <View style={{
          backgroundColor: '#fff', borderRadius: 14, padding: 28,
          width: 360, shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12, shadowRadius: 24,
        }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#635857', marginBottom: 10 }}>
            {config.title ?? 'Confirmar'}
          </Text>
          <Text style={{ fontSize: 14, color: '#8e7f7e', lineHeight: 20, marginBottom: 24 }}>
            {config.message}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
            <TouchableOpacity
              onPress={() => { config.resolve(false); setConfig(null); }}
              activeOpacity={0.7}
              style={{ paddingVertical: 9, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#f5f0ef' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#8e7f7e' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { config.resolve(true); setConfig(null); }}
              activeOpacity={0.7}
              style={{ paddingVertical: 9, paddingHorizontal: 20, borderRadius: 8, backgroundColor: config.danger ? '#e53935' : '#9b6fa0' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                {config.confirmLabel ?? 'Confirmar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  ) : null;

  return { confirm, dialog };
}
