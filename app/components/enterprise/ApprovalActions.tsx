/**
 * Botões de Ação para Aprovação/Rejeição
 */

import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface ApprovalActionsProps {
  onApprove: (notes?: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  itemValue?: number;
  approvalLimit?: number;
}

export function ApprovalActions({
  onApprove,
  onReject,
  isLoading = false,
  disabled = false,
  itemValue,
  approvalLimit,
}: ApprovalActionsProps) {
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const exceedsLimit = !!(itemValue && approvalLimit && itemValue > approvalLimit);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(approveNotes || undefined);
      setShowApproveModal(false);
      setApproveNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;

    setIsSubmitting(true);
    try {
      await onReject(rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <View className="flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1 border-red-300"
          onPress={() => setShowRejectModal(true)}
          disabled={disabled || isLoading}
        >
          <X size={18} className="text-red-600 mr-2" />
          <Text className="text-red-600 font-medium">Rejeitar</Text>
        </Button>

        <Button
          variant="default"
          className="flex-1 bg-green-600"
          onPress={() => setShowApproveModal(true)}
          disabled={disabled || isLoading || exceedsLimit}
        >
          <Check size={18} className="text-white mr-2" />
          <Text className="text-white font-medium">Aprovar</Text>
        </Button>
      </View>

      {exceedsLimit && (
        <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
          <Text className="text-yellow-800 text-sm text-center">
            ⚠️ Valor excede seu limite de aprovação
          </Text>
        </View>
      )}

      {/* Modal de Aprovação */}
      <Modal
        visible={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Aprovar Requisição"
      >
        <View className="p-4">
          <Text className="text-gray-600 mb-4">Confirma a aprovação desta requisição?</Text>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Observações (opcional)</Text>
            <TextInput
              value={approveNotes}
              onChangeText={setApproveNotes}
              placeholder="Adicione observações se necessário..."
              multiline
              numberOfLines={3}
              className="border border-gray-300 rounded-lg p-3 text-gray-900"
            />
          </View>

          <View className="flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => setShowApproveModal(false)}
              disabled={isSubmitting}
            >
              <Text>Cancelar</Text>
            </Button>
            <Button
              variant="default"
              className="flex-1 bg-green-600"
              onPress={handleApprove}
              disabled={isSubmitting}
            >
              <Text className="text-white">{isSubmitting ? 'Aprovando...' : 'Confirmar'}</Text>
            </Button>
          </View>
        </View>
      </Modal>

      {/* Modal de Rejeição */}
      <Modal
        visible={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Rejeitar Requisição"
      >
        <View className="p-4">
          <Text className="text-gray-600 mb-4">Informe o motivo da rejeição:</Text>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Motivo *</Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Descreva o motivo da rejeição..."
              multiline
              numberOfLines={4}
              className="border border-gray-300 rounded-lg p-3 text-gray-900"
            />
          </View>

          <View className="flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => setShowRejectModal(false)}
              disabled={isSubmitting}
            >
              <Text>Cancelar</Text>
            </Button>
            <Button
              variant="default"
              className="flex-1 bg-red-600"
              onPress={handleReject}
              disabled={isSubmitting || !rejectReason.trim()}
            >
              <Text className="text-white">{isSubmitting ? 'Rejeitando...' : 'Confirmar'}</Text>
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );
}

/**
 * Botão simples de aprovar
 */
export function ApproveButton({
  onPress,
  disabled,
  loading,
}: {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Button
      variant="default"
      className="bg-green-600"
      onPress={onPress}
      disabled={disabled || loading}
    >
      <Check size={18} className="text-white mr-2" />
      <Text className="text-white font-medium">{loading ? 'Aprovando...' : 'Aprovar'}</Text>
    </Button>
  );
}

/**
 * Botão simples de rejeitar
 */
export function RejectButton({
  onPress,
  disabled,
  loading,
}: {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Button
      variant="outline"
      className="border-red-300"
      onPress={onPress}
      disabled={disabled || loading}
    >
      <X size={18} className="text-red-600 mr-2" />
      <Text className="text-red-600 font-medium">{loading ? 'Rejeitando...' : 'Rejeitar'}</Text>
    </Button>
  );
}
