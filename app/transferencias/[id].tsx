/**
 * Tela de Detalhes da Transferência de Estoque
 *
 * Exibe detalhes completos de uma transferência, permite adicionar itens,
 * despachar, receber e controlar divergências.
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Package,
  Plus,
  Trash2,
  Truck,
  Check,
  ArrowRight,
  User,
  MapPin,
  Calendar,
  AlertTriangle,
  Barcode,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useStockTransfers } from '@/hooks/useStockTransfers';
import { useEnterpriseContextStore } from '@/stores/enterpriseContextStore';
import { useAuthStore } from '@/stores/authStore';
import type { TransferStatus } from '@/types/stock-transfer';

const STATUS_LABELS: Record<TransferStatus, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  IN_TRANSIT: 'Em Trânsito',
  RECEIVED: 'Recebida',
  PARTIAL_RECEIVED: 'Recebida Parcialmente',
  CANCELLED: 'Cancelada',
};

const STATUS_COLORS: Record<TransferStatus, { bg: string; text: string; border: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  IN_TRANSIT: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  RECEIVED: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  PARTIAL_RECEIVED: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300' },
};

export default function TransferenciaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { activeContract, availableLocations } = useEnterpriseContextStore();
  const {
    currentTransfer: transfer,
    loadTransfer,
    addItem,
    removeItem,
    shipTransfer,
    receiveTransfer,
    cancelTransfer,
    updateTransfer,
    isLoading, // Hook loading state
  } = useStockTransfers();

  const [isLoadingTransfer, setIsLoadingTransfer] = useState(true);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showSelectLocationModal, setShowSelectLocationModal] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // New item form state
  const [newItem, setNewItem] = useState({
    productId: '',
    productName: '',
    barcode: '',
    quantity: '1',
    unit: 'UN',
    lotNumber: '',
    notes: '',
  });

  // Receive form state
  const [receiveItems, setReceiveItems] = useState<Record<string, string>>({});

  // Load transfer details
  useEffect(() => {
    fetchTransfer();
  }, [id]);

  // Sync receive items when transfer loads
  useEffect(() => {
    if (transfer?.items) {
      const initialReceive: Record<string, string> = {};
      transfer.items.forEach((item) => {
        // Init with existing received quantity or 0
        // Or if in confirm mode, maybe default to shipped quantity?
        // Default to shipped quantity for easier receiving
        initialReceive[item.id] = String(item.requestedQuantity);
      });
      setReceiveItems(initialReceive);
    }
  }, [transfer]);

  const fetchTransfer = async () => {
    if (!id) return;
    setIsLoadingTransfer(true);
    try {
      await loadTransfer(id as string);
    } catch (error) {
      console.error('Erro ao carregar transferência:', error);
      Alert.alert('Erro', 'Não foi possível carregar a transferência');
    } finally {
      setIsLoadingTransfer(false);
    }
  };

  // Permissions
  const canEdit = transfer?.status === 'DRAFT' && transfer.requestedById === user?.id;
  const canShip =
    transfer?.status === 'DRAFT' &&
    (transfer.items?.length ?? 0) > 0 &&
    !!transfer.destinationLocationId;
  const canReceive = transfer?.status === 'IN_TRANSIT'; // Simplified - user at destination check removed
  const canCancel =
    ['DRAFT', 'IN_TRANSIT'].includes(transfer?.status || '') &&
    (transfer?.requestedById === user?.id || ['ADMIN', 'MANAGER'].includes(user?.role || ''));

  // Toggle item expansion
  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Handle add item
  const handleAddItem = async () => {
    if (!transfer || !newItem.productName || !newItem.quantity) {
      Alert.alert('Erro', 'Preencha os campos obrigatórios');
      return;
    }

    try {
      // Note: productId is empty in form currently cause we just type Name.
      // In real app we would select product.
      // Passing productName as ID just for mock/demo purposes if ID is missing.
      await addItem(transfer.id, {
        productId: newItem.productId || 'prod-temp-' + Date.now(),
        productCode: newItem.barcode || 'CODE',
        productName: newItem.productName,
        quantity: parseFloat(newItem.quantity),
        unit: newItem.unit,
        lotId: newItem.lotNumber || undefined,
        // notes: newItem.notes || undefined, // Type doesn't support notes in addItem? Checked hook type: AddItemData
      });
      setShowAddItemModal(false);
      setNewItem({
        productId: '',
        productName: '',
        barcode: '',
        quantity: '1',
        unit: 'UN',
        lotNumber: '',
        notes: '',
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível adicionar o item');
    }
  };

  // Handle remove item
  const handleRemoveItem = async (itemId: string) => {
    if (!transfer) return;

    Alert.alert('Remover Item', 'Tem certeza que deseja remover este item?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeItem(transfer.id, itemId);
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível remover o item');
          }
        },
      },
    ]);
  };

  // Handle ship
  const handleShip = async () => {
    if (!transfer) return;

    Alert.alert(
      'Despachar Transferência',
      'Confirma o despacho desta transferência? Os itens serão baixados do estoque de origem.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Despachar',
          onPress: async () => {
            try {
              await shipTransfer(transfer.id);
              Alert.alert('Sucesso', 'Transferência despachada!');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível despachar a transferência');
            }
          },
        },
      ]
    );
  };

  // Handle receive
  const handleReceive = async () => {
    if (!transfer) return;

    // Build received items with quantities
    const items =
      transfer.items?.map((item) => ({
        itemId: item.id,
        receivedQuantity: parseFloat(receiveItems[item.id] || '0'),
      })) || [];

    // Check for discrepancies
    const hasDiscrepancy = items.some((item) => {
      const originalItem = transfer.items?.find((i) => i.id === item.itemId);
      return originalItem && item.receivedQuantity !== originalItem.requestedQuantity;
    });

    const confirmMessage = hasDiscrepancy
      ? 'Existem divergências nas quantidades. O sistema registrará as diferenças. Confirma o recebimento?'
      : 'Confirma o recebimento de todos os itens?';

    Alert.alert('Confirmar Recebimento', confirmMessage, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          try {
            await receiveTransfer(transfer.id, items);
            setShowReceiveModal(false);
            Alert.alert('Sucesso', 'Transferência recebida!');
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível receber a transferência');
          }
        },
      },
    ]);
  };

  // Handle cancel
  const handleCancel = async () => {
    if (!transfer) return;

    Alert.alert(
      'Cancelar Transferência',
      transfer.status === 'IN_TRANSIT'
        ? 'Esta transferência está em trânsito. O cancelamento reverterá a baixa de estoque na origem. Continuar?'
        : 'Tem certeza que deseja cancelar esta transferência?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelTransfer(transfer.id, 'Cancelado pelo usuário');
              router.back();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível cancelar a transferência');
            }
          },
        },
      ]
    );
  };

  // Handle select destination
  const handleSelectDestination = async (locationId: string) => {
    setShowSelectLocationModal(false);

    if (transfer && transfer.status === 'DRAFT') {
      try {
        await updateTransfer(transfer.id, { toLocationId: locationId });
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível atualizar o destino');
      }
    }
  };

  // Handle barcode scan
  const handleScanBarcode = () => {
    Alert.alert('Scanner', 'Funcionalidade de scanner em desenvolvimento');
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get location name
  const getLocationName = (locationId?: string) => {
    if (!locationId) return '-';
    const location = (availableLocations || []).find(
      (l: { id: string; name: string }) => l.id === locationId
    );
    return location?.name || locationId;
  };

  if (isLoadingTransfer) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-4 text-gray-500">Carregando transferência...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!transfer) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center px-6">
          <AlertTriangle size={48} className="text-gray-400 mb-4" />
          <Text className="text-gray-600 text-lg font-medium text-center">
            Transferência não encontrada
          </Text>
          <Button onPress={() => router.back()} className="mt-6">
            Voltar
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const statusColors = STATUS_COLORS[transfer.status];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="mr-3 p-1">
            <ArrowLeft size={24} className="text-gray-700" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900">{transfer.transferNumber}</Text>
            <Text className="text-sm text-gray-500">{activeContract?.name}</Text>
          </View>
          <View className={`px-3 py-1 rounded-full ${statusColors.bg}`}>
            <Text className={`text-sm font-medium ${statusColors.text}`}>
              {STATUS_LABELS[transfer.status]}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Transfer Route Card */}
          <View className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
            <View className="flex-row items-center justify-between">
              {/* Origin */}
              <View className="flex-1">
                <Text className="text-xs text-gray-500 uppercase mb-1">Origem</Text>
                <View className="flex-row items-center">
                  <MapPin size={16} className="text-blue-600 mr-1" />
                  <Text className="font-medium text-gray-900" numberOfLines={2}>
                    {transfer.sourceLocationName || getLocationName(transfer.sourceLocationId)}
                  </Text>
                </View>
              </View>

              {/* Arrow */}
              <View className="px-4">
                <ArrowRight size={24} className="text-gray-400" />
              </View>

              {/* Destination */}
              <View className="flex-1 items-end">
                <Text className="text-xs text-gray-500 uppercase mb-1">Destino</Text>
                {transfer.destinationLocationId ? (
                  <View className="flex-row items-center">
                    <Text className="font-medium text-gray-900 text-right" numberOfLines={2}>
                      {transfer.destinationLocationName ||
                        getLocationName(transfer.destinationLocationId)}
                    </Text>
                    <MapPin size={16} className="text-green-600 ml-1" />
                  </View>
                ) : canEdit ? (
                  <Pressable
                    onPress={() => setShowSelectLocationModal(true)}
                    className="flex-row items-center bg-blue-50 px-2 py-1 rounded"
                  >
                    <Text className="text-blue-600 font-medium">Selecionar</Text>
                  </Pressable>
                ) : (
                  <Text className="text-gray-400">Não definido</Text>
                )}
              </View>
            </View>

            {/* Transfer Info */}
            <View className="flex-row flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
              <View className="flex-row items-center">
                <User size={16} className="text-gray-400 mr-1" />
                <Text className="text-sm text-gray-600">{transfer.requestedByName}</Text>
              </View>
              <View className="flex-row items-center">
                <Calendar size={16} className="text-gray-400 mr-1" />
                <Text className="text-sm text-gray-600">{formatDate(transfer.createdAt)}</Text>
              </View>
            </View>

            {/* Shipped/Received Info */}
            {transfer.shippedAt && (
              <View className="mt-3 pt-3 border-t border-gray-100">
                <View className="flex-row items-center">
                  <Truck size={16} className="text-blue-500 mr-2" />
                  <Text className="text-sm text-gray-600">
                    Despachado em {formatDate(transfer.shippedAt)}
                    {transfer.shippedByName && ` por ${transfer.shippedByName}`}
                  </Text>
                </View>
              </View>
            )}

            {transfer.receivedAt && (
              <View className="mt-2">
                <View className="flex-row items-center">
                  <CheckCircle size={16} className="text-green-500 mr-2" />
                  <Text className="text-sm text-gray-600">
                    Recebido em {formatDate(transfer.receivedAt)}
                    {transfer.receivedByName && ` por ${transfer.receivedByName}`}
                  </Text>
                </View>
              </View>
            )}

            {/* Notes */}
            {transfer.notes && (
              <View className="mt-3 pt-3 border-t border-gray-100">
                <Text className="text-sm text-gray-500">Observações:</Text>
                <Text className="text-sm text-gray-700 mt-1">{transfer.notes}</Text>
              </View>
            )}
          </View>

          {/* Items Section */}
          <View className="mx-4 mt-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-gray-900">
                Itens ({transfer.items?.length || 0})
              </Text>
              {canEdit && (
                <Pressable
                  onPress={() => setShowAddItemModal(true)}
                  className="flex-row items-center bg-blue-600 px-3 py-2 rounded-lg"
                >
                  <Plus size={16} color="white" />
                  <Text className="text-white font-medium ml-1">Adicionar</Text>
                </Pressable>
              )}
            </View>

            {/* Items List */}
            {transfer.items && transfer.items.length > 0 ? (
              <View className="gap-2">
                {transfer.items.map((item) => {
                  const hasDiscrepancy =
                    item.receivedQuantity !== undefined &&
                    item.receivedQuantity !== item.requestedQuantity;

                  return (
                    <View key={item.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
                      <Pressable onPress={() => toggleItemExpanded(item.id)} className="p-4">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1 flex-row items-center">
                            <Package size={20} className="text-gray-400 mr-3" />
                            <View className="flex-1">
                              <Text className="font-medium text-gray-900" numberOfLines={1}>
                                {item.productName}
                              </Text>
                              <View className="flex-row items-center">
                                <Text className="text-sm text-gray-500">
                                  {item.requestedQuantity} {item.unit}
                                </Text>
                                {hasDiscrepancy && (
                                  <View className="flex-row items-center ml-2">
                                    <AlertCircle size={14} className="text-yellow-500 mr-1" />
                                    <Text className="text-sm text-yellow-600">
                                      Recebido: {item.receivedQuantity}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                          <View className="flex-row items-center">
                            {canEdit && (
                              <Pressable
                                onPress={() => handleRemoveItem(item.id)}
                                className="p-2 mr-2"
                              >
                                <Trash2 size={18} className="text-red-500" />
                              </Pressable>
                            )}
                            {/* Status indicator for received items */}
                            {transfer.status === 'RECEIVED' ||
                            transfer.status === 'PARTIAL_RECEIVED' ? (
                              item.receivedQuantity === item.requestedQuantity ? (
                                <CheckCircle size={20} className="text-green-500" />
                              ) : item.receivedQuantity !== undefined &&
                                item.receivedQuantity > 0 ? (
                                <AlertCircle size={20} className="text-yellow-500" />
                              ) : (
                                <XCircle size={20} className="text-red-500" />
                              )
                            ) : expandedItems.has(item.id) ? (
                              <ChevronUp size={20} className="text-gray-400" />
                            ) : (
                              <ChevronDown size={20} className="text-gray-400" />
                            )}
                          </View>
                        </View>
                      </Pressable>

                      {/* Expanded content */}
                      {expandedItems.has(item.id) && (
                        <View className="px-4 pb-4 pt-2 border-t border-gray-100">
                          {item.productBarcode && (
                            <View className="flex-row items-center mb-2">
                              <Barcode size={14} className="text-gray-400 mr-2" />
                              <Text className="text-sm text-gray-600">{item.productBarcode}</Text>
                            </View>
                          )}
                          {item.lotNumber && (
                            <View className="flex-row items-center mb-2">
                              <Text className="text-sm text-gray-500">Lote: </Text>
                              <Text className="text-sm text-gray-700">{item.lotNumber}</Text>
                            </View>
                          )}
                          {item.notes && (
                            <Text className="text-sm text-gray-500">{item.notes}</Text>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="bg-white rounded-xl p-8 items-center">
                <Package size={48} className="text-gray-300 mb-3" />
                <Text className="text-gray-500 text-center">Nenhum item adicionado ainda</Text>
                {canEdit && (
                  <Button
                    onPress={() => setShowAddItemModal(true)}
                    className="mt-4"
                    variant="outline"
                  >
                    Adicionar Primeiro Item
                  </Button>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 pb-6">
          <View className="flex-row gap-3">
            {canShip && (
              <Button
                onPress={handleShip}
                isLoading={isLoading}
                leftIcon={<Truck size={18} color="white" />}
                className="flex-1"
              >
                Despachar
              </Button>
            )}

            {canReceive && (
              <Button
                onPress={() => setShowReceiveModal(true)}
                isLoading={isLoading}
                leftIcon={<Check size={18} color="white" />}
                className="flex-1 bg-green-600"
              >
                Receber
              </Button>
            )}

            {canCancel && !canShip && !canReceive && (
              <Button onPress={handleCancel} variant="outline" className="flex-1 border-red-300">
                Cancelar Transferência
              </Button>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Add Item Modal */}
      <Modal
        visible={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        title="Adicionar Item"
      >
        <View className="gap-4">
          {/* Barcode Scanner Button */}
          <Pressable
            onPress={handleScanBarcode}
            className="flex-row items-center justify-center bg-gray-100 p-4 rounded-lg border border-dashed border-gray-300"
          >
            <Barcode size={24} className="text-gray-600 mr-2" />
            <Text className="text-gray-600 font-medium">Escanear Código de Barras</Text>
          </Pressable>

          <View className="flex-row items-center">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="mx-3 text-gray-400 text-sm">ou</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          {/* Product Name */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Nome do Produto *</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-800"
              placeholder="Digite o nome do produto"
              value={newItem.productName}
              onChangeText={(text) => setNewItem((prev) => ({ ...prev, productName: text }))}
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Quantity and Unit */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-1">Quantidade *</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-800"
                placeholder="1"
                value={newItem.quantity}
                onChangeText={(text) => setNewItem((prev) => ({ ...prev, quantity: text }))}
                keyboardType="decimal-pad"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-1">Unidade</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-800"
                placeholder="UN"
                value={newItem.unit}
                onChangeText={(text) => setNewItem((prev) => ({ ...prev, unit: text }))}
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Lot Number */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Número do Lote</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-800"
              placeholder="Opcional"
              value={newItem.lotNumber}
              onChangeText={(text) => setNewItem((prev) => ({ ...prev, lotNumber: text }))}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View className="flex-row gap-3 mt-4">
            <Button onPress={() => setShowAddItemModal(false)} variant="outline" className="flex-1">
              Cancelar
            </Button>
            <Button onPress={handleAddItem} isLoading={isLoading} className="flex-1">
              Adicionar
            </Button>
          </View>
        </View>
      </Modal>

      {/* Receive Modal */}
      <Modal
        visible={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        title="Conferir Recebimento"
      >
        <View className="gap-4">
          <Text className="text-gray-600">
            Informe as quantidades recebidas. Divergências serão registradas.
          </Text>

          <ScrollView className="max-h-80">
            {transfer.items?.map((item) => (
              <View
                key={item.id}
                className="flex-row items-center justify-between py-3 border-b border-gray-100"
              >
                <View className="flex-1 mr-4">
                  <Text className="font-medium text-gray-900" numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <Text className="text-sm text-gray-500">
                    Enviado: {item.requestedQuantity} {item.unit}
                  </Text>
                </View>
                <View className="w-24">
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center text-gray-800"
                    value={receiveItems[item.id] || ''}
                    onChangeText={(text) =>
                      setReceiveItems((prev) => ({ ...prev, [item.id]: text }))
                    }
                    keyboardType="decimal-pad"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
            ))}
          </ScrollView>

          <View className="flex-row gap-3 mt-4">
            <Button onPress={() => setShowReceiveModal(false)} variant="outline" className="flex-1">
              Cancelar
            </Button>
            <Button onPress={handleReceive} isLoading={isLoading} className="flex-1 bg-green-600">
              Confirmar Recebimento
            </Button>
          </View>
        </View>
      </Modal>

      {/* Select Location Modal */}
      <Modal
        visible={showSelectLocationModal}
        onClose={() => setShowSelectLocationModal(false)}
        title="Selecionar Destino"
      >
        <View className="gap-2">
          <ScrollView className="max-h-80">
            {(availableLocations || [])
              .filter((loc) => loc.id !== transfer.sourceLocationId)
              .map((location) => (
                <Pressable
                  key={location.id}
                  onPress={() => handleSelectDestination(location.id)}
                  className="flex-row items-center p-3 rounded-lg border border-gray-200 mb-2"
                >
                  <MapPin size={20} className="text-gray-400 mr-3" />
                  <View className="flex-1">
                    <Text className="font-medium text-gray-900">{location.name}</Text>
                    {location.code && (
                      <Text className="text-sm text-gray-500">{location.code}</Text>
                    )}
                  </View>
                </Pressable>
              ))}
          </ScrollView>

          <Button
            onPress={() => setShowSelectLocationModal(false)}
            variant="outline"
            className="mt-4"
          >
            Cancelar
          </Button>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
