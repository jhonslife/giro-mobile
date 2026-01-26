/**
 * Ações de Envio e Recebimento de Transferências
 */

import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Truck, Package, Check, X, AlertTriangle, Camera } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StockTransfer } from '@/types/stock-transfer';

interface ShipActionsProps {
  transfer: StockTransfer;
  onShip: (notes?: string, vehiclePlate?: string) => void;
  onCancel: (reason: string) => void;
  disabled?: boolean;
}

export function ShipActions({ transfer, onShip, onCancel, disabled }: ShipActionsProps) {
  const [showShipModal, setShowShipModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [notes, setNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const canShip = transfer.status === 'DRAFT' && transfer.items.length > 0;
  const canCancel = transfer.status === 'DRAFT';

  const handleShip = () => {
    onShip(notes || undefined, vehiclePlate || undefined);
    setShowShipModal(false);
    setVehiclePlate('');
    setNotes('');
  };

  const handleCancel = () => {
    if (!cancelReason.trim()) return;
    onCancel(cancelReason);
    setShowCancelModal(false);
    setCancelReason('');
  };

  if (!canShip && !canCancel) return null;

  return (
    <>
      <View className="flex-row gap-3 p-4 bg-white border-t border-gray-200">
        {canCancel && (
          <Button
            variant="outline"
            className="flex-1 border-red-300"
            onPress={() => setShowCancelModal(true)}
            disabled={disabled}
          >
            <X size={18} className="text-red-600 mr-2" />
            <Text className="text-red-600 font-medium">Cancelar</Text>
          </Button>
        )}

        {canShip && (
          <Button
            variant="default"
            className="flex-1 bg-blue-600"
            onPress={() => setShowShipModal(true)}
            disabled={disabled}
          >
            <Truck size={18} className="text-white mr-2" />
            <Text className="text-white font-medium">Enviar</Text>
          </Button>
        )}
      </View>

      {/* Modal de Envio */}
      <Modal
        visible={showShipModal}
        onClose={() => setShowShipModal(false)}
        title="Confirmar Envio"
      >
        <View className="p-4">
          <View className="bg-blue-50 rounded-lg p-4 mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Package size={20} className="text-blue-600" />
              <Text className="text-lg font-semibold text-blue-900">
                {transfer.items.length} {transfer.items.length === 1 ? 'item' : 'itens'}
              </Text>
            </View>
            <Text className="text-blue-700">De: {transfer.sourceLocationName}</Text>
            <Text className="text-blue-700">Para: {transfer.destinationLocationName}</Text>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Placa do Veículo (opcional)
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 text-gray-800"
              placeholder="Ex: ABC-1234"
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
              autoCapitalize="characters"
              maxLength={8}
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Observações (opcional)</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 text-gray-800 min-h-[80px]"
              placeholder="Notas sobre o envio..."
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onPress={() => setShowShipModal(false)}>
              <Text className="text-gray-700">Cancelar</Text>
            </Button>
            <Button variant="default" className="flex-1 bg-blue-600" onPress={handleShip}>
              <Truck size={16} className="text-white mr-2" />
              <Text className="text-white font-medium">Confirmar Envio</Text>
            </Button>
          </View>
        </View>
      </Modal>

      {/* Modal de Cancelamento */}
      <Modal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancelar Transferência"
      >
        <View className="p-4">
          <View className="bg-red-50 rounded-lg p-3 mb-4 flex-row items-start gap-2">
            <AlertTriangle size={20} className="text-red-600 mt-0.5" />
            <Text className="text-red-700 flex-1">
              Esta ação não pode ser desfeita. A transferência será cancelada permanentemente.
            </Text>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Motivo do cancelamento *</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 text-gray-800 min-h-[100px]"
              placeholder="Informe o motivo do cancelamento..."
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onPress={() => setShowCancelModal(false)}>
              <Text className="text-gray-700">Voltar</Text>
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onPress={handleCancel}
              disabled={!cancelReason.trim()}
            >
              <X size={16} className="text-white mr-2" />
              <Text className="text-white font-medium">Cancelar Transferência</Text>
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );
}

interface ReceiveActionsProps {
  transfer: StockTransfer;
  onReceive: (items: Array<{ itemId: string; receivedQuantity: number; notes?: string }>) => void;
  disabled?: boolean;
}

export function ReceiveActions({ transfer, onReceive, disabled }: ReceiveActionsProps) {
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receivedItems, setReceivedItems] = useState<
    Array<{ itemId: string; quantity: number; receivedQuantity: number; notes?: string }>
  >([]);

  const canReceive = transfer.status === 'IN_TRANSIT';

  const openReceiveModal = () => {
    setReceivedItems(
      transfer.items.map((item) => ({
        itemId: item.id,
        quantity: item.requestedQuantity,
        receivedQuantity: item.requestedQuantity,
      }))
    );
    setShowReceiveModal(true);
  };

  const updateReceivedQuantity = (itemId: string, quantity: number) => {
    setReceivedItems((prev) =>
      prev.map((item) =>
        item.itemId === itemId ? { ...item, receivedQuantity: Math.max(0, quantity) } : item
      )
    );
  };

  const handleReceive = () => {
    onReceive(
      receivedItems.map((item) => ({
        itemId: item.itemId,
        receivedQuantity: item.receivedQuantity,
        notes: item.receivedQuantity !== item.quantity ? 'Divergência na contagem' : undefined,
      }))
    );
    setShowReceiveModal(false);
  };

  const hasDiscrepancies = receivedItems.some((item) => item.receivedQuantity !== item.quantity);

  if (!canReceive) return null;

  return (
    <>
      <View className="p-4 bg-white border-t border-gray-200">
        <Button
          variant="default"
          className="w-full bg-green-600"
          onPress={openReceiveModal}
          disabled={disabled}
        >
          <Package size={18} className="text-white mr-2" />
          <Text className="text-white font-medium">Confirmar Recebimento</Text>
        </Button>
      </View>

      {/* Modal de Recebimento */}
      <Modal
        visible={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        title="Conferência de Recebimento"
      >
        <View className="p-4">
          <Text className="text-sm text-gray-600 mb-4">
            Confira a quantidade recebida de cada item. Em caso de divergência, informe a quantidade
            correta.
          </Text>

          {transfer.items.map((item) => {
            const received = receivedItems.find((r) => r.itemId === item.id);
            const hasDiscrepancy = received && received.receivedQuantity !== received.quantity;

            return (
              <View
                key={item.id}
                className={`p-3 rounded-lg mb-2 ${
                  hasDiscrepancy ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
                }`}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1">
                    <Text className="font-medium text-gray-800" numberOfLines={1}>
                      {item.productName}
                    </Text>
                    <Text className="text-xs text-gray-500">{item.productCode}</Text>
                  </View>
                  <Text className="text-sm text-gray-600">Enviado: {item.requestedQuantity}</Text>
                </View>

                <View className="flex-row items-center gap-2">
                  <Text className="text-sm text-gray-600">Recebido:</Text>
                  <View className="flex-row items-center">
                    <Pressable
                      onPress={() =>
                        updateReceivedQuantity(item.id, (received?.receivedQuantity || 0) - 1)
                      }
                      className="w-8 h-8 bg-gray-200 rounded-l-lg items-center justify-center"
                    >
                      <Text className="text-lg font-bold text-gray-600">-</Text>
                    </Pressable>
                    <TextInput
                      className="w-16 h-8 bg-white border-y border-gray-200 text-center text-gray-800"
                      value={String(received?.receivedQuantity || 0)}
                      onChangeText={(text) => {
                        const num = parseInt(text) || 0;
                        updateReceivedQuantity(item.id, num);
                      }}
                      keyboardType="numeric"
                    />
                    <Pressable
                      onPress={() =>
                        updateReceivedQuantity(item.id, (received?.receivedQuantity || 0) + 1)
                      }
                      className="w-8 h-8 bg-gray-200 rounded-r-lg items-center justify-center"
                    >
                      <Text className="text-lg font-bold text-gray-600">+</Text>
                    </Pressable>
                  </View>
                </View>

                {hasDiscrepancy && (
                  <View className="flex-row items-center gap-1 mt-2">
                    <AlertTriangle size={14} className="text-yellow-600" />
                    <Text className="text-xs text-yellow-700">
                      Divergência: {(received?.receivedQuantity || 0) - item.requestedQuantity}{' '}
                      unidades
                    </Text>
                  </View>
                )}
              </View>
            );
          })}

          {hasDiscrepancies && (
            <View className="bg-yellow-50 rounded-lg p-3 mb-4 flex-row items-start gap-2">
              <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
              <Text className="text-yellow-700 flex-1">
                Foram identificadas divergências. O recebimento será registrado como parcial.
              </Text>
            </View>
          )}

          <View className="flex-row gap-3 mt-4">
            <Button variant="outline" className="flex-1" onPress={() => setShowReceiveModal(false)}>
              <Text className="text-gray-700">Cancelar</Text>
            </Button>
            <Button
              variant="default"
              className={`flex-1 ${hasDiscrepancies ? 'bg-yellow-600' : 'bg-green-600'}`}
              onPress={handleReceive}
            >
              <Check size={16} className="text-white mr-2" />
              <Text className="text-white font-medium">
                {hasDiscrepancies ? 'Receber Parcial' : 'Confirmar'}
              </Text>
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );
}

/**
 * Botão para scan de itens na transferência
 */
export function ScanItemButton({ onScan }: { onScan: () => void }) {
  return (
    <Pressable
      onPress={onScan}
      className="flex-row items-center justify-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg"
    >
      <Camera size={20} className="text-blue-600" />
      <Text className="text-blue-700 font-medium">Escanear Item</Text>
    </Pressable>
  );
}
