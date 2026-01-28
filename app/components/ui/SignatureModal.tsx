import React, { useRef } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { Button } from './Button';

interface SignatureModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (signature: string) => void;
  loading?: boolean;
}

export function SignatureModal({ visible, onClose, onConfirm, loading }: SignatureModalProps) {
  const ref = useRef<SignatureViewRef>(null);

  const handleSignature = (signature: string) => {
    onConfirm(signature);
  };

  const handleEmpty = () => {
    console.log('Assinatura vazia');
  };

  const clearSignature = () => {
    ref.current?.clearSignature();
  };

  const confirmSignature = () => {
    ref.current?.readSignature();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Assinatura do Recebedor</Text>
          <Text style={styles.subtitle}>Por favor, assine abaixo para confirmar o recebimento</Text>

          <View style={styles.signatureContainer}>
            <SignatureScreen
              ref={ref}
              onOK={handleSignature}
              onEmpty={handleEmpty}
              webStyle={style}
              imageType="image/png"
              trimWhitespace
            />
          </View>

          <View style={styles.footer}>
            <Button variant="outline" onPress={clearSignature} className="flex-1 mr-2">
              Limpar
            </Button>
            <Button variant="secondary" onPress={onClose} className="flex-1 mr-2">
              Cancelar
            </Button>
            <Button onPress={confirmSignature} className="flex-1" disabled={loading}>
              {loading ? 'Enviando...' : 'Confirmar'}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    height: 500,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  signatureContainer: {
    flex: 1,
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  footer: {
    flexDirection: 'row',
  },
});

const style = `.m-signature-pad--footer {display: none; margin: 0px;}`;
