/**
 * Tela de Detalhes da Requisição de Material
 *
 * Exibe detalhes completos de uma requisição, permite edição de itens,
 * submissão para aprovação e ações de aprovação/rejeição para supervisores.
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
  Send,
  Check,
  X,
  Clock,
  User,
  MapPin,
  AlertTriangle,
  Barcode,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { BarcodeScanner } from '@/components/scanner';
import { useMaterialRequests } from '@/hooks/useMaterialRequests';
import { useEnterpriseContextStore } from '@/stores/enterpriseContextStore';
import { useAuthStore } from '@/stores/authStore';
import { RequestStatus, RequestPriority } from '@/types/material-request';

const STATUS_LABELS: Record<RequestStatus, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Aguardando Aprovação',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  SEPARATING: 'Em Separação',
  READY: 'Pronta para Retirada',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelada',
};

const STATUS_COLORS: Record<RequestStatus, { bg: string; text: string; border: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  SEPARATING: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  READY: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  DELIVERED: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300' },
};

const PRIORITY_LABELS: Record<RequestPriority, string> = {
  LOW: 'Baixa',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

const PRIORITY_COLORS: Record<RequestPriority, { bg: string; text: string }> = {
  LOW: { bg: 'bg-gray-100', text: 'text-gray-600' },
  NORMAL: { bg: 'bg-blue-100', text: 'text-blue-600' },
  HIGH: { bg: 'bg-orange-100', text: 'text-orange-600' },
  URGENT: { bg: 'bg-red-100', text: 'text-red-600' },
};

export default function RequisicaoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { activeContract } = useEnterpriseContextStore();
  const {
    currentRequest: request,
    loadRequest,
    addItem,
    removeItem,
    submitRequest,
    approveRequest,
    rejectRequest,
    cancelRequest,
  } = useMaterialRequests();

  const [isLoadingRequest, setIsLoadingRequest] = useState(true);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // New item form state
  const [newItem, setNewItem] = useState({
    productId: '',
    productName: '',
    barcode: '',
    quantity: '1',
    unit: 'UN',
    notes: '',
  });

  // Load request details
  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    if (!id) return;
    setIsLoadingRequest(true);
    try {
      await loadRequest(id);
    } catch (error) {
      console.error('Erro ao carregar requisição:', error);
      Alert.alert('Erro', 'Não foi possível carregar a requisição');
    } finally {
      setIsLoadingRequest(false);
    }
  };

  // Check if user can edit this request
  const canEdit = request?.status === 'DRAFT' && request.requesterId === user?.id;
  const canSubmit =
    request?.status === 'DRAFT' &&
    request.requesterId === user?.id &&
    (request.items?.length ?? 0) > 0;
  const canApprove =
    request?.status === 'PENDING' &&
    ['ADMIN', 'MANAGER', 'SUPERVISOR', 'ALMOXARIFE_SENIOR'].includes(user?.role || '');
  const canCancel =
    ['DRAFT', 'PENDING'].includes(request?.status || '') &&
    (request?.requesterId === user?.id || ['ADMIN', 'MANAGER'].includes(user?.role || ''));

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
    if (!request || !newItem.productId || !newItem.quantity) {
      Alert.alert('Erro', 'Preencha os campos obrigatórios');
      return;
    }

    try {
      await addItem(request.id, {
        productId: newItem.productId,
        quantity: parseFloat(newItem.quantity),
        notes: newItem.notes || undefined,
      });
      setShowAddItemModal(false);
      setNewItem({
        productId: '',
        productName: '',
        barcode: '',
        quantity: '1',
        unit: 'UN',
        notes: '',
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível adicionar o item');
    }
  };

  // Handle remove item
  const handleRemoveItem = async (itemId: string) => {
    if (!request) return;

    Alert.alert('Remover Item', 'Tem certeza que deseja remover este item?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeItem(request.id, itemId);
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível remover o item');
          }
        },
      },
    ]);
  };

  // Handle submit for approval
  const handleSubmit = async () => {
    if (!request) return;

    Alert.alert(
      'Enviar para Aprovação',
      'Após enviar, a requisição não poderá ser editada até ser aprovada ou rejeitada. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            try {
              await submitRequest(request.id);
              Alert.alert('Sucesso', 'Requisição enviada para aprovação');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível enviar a requisição');
            }
          },
        },
      ]
    );
  };

  // Handle approve
  const handleApprove = async () => {
    if (!request) return;

    Alert.alert('Aprovar Requisição', 'Tem certeza que deseja aprovar esta requisição?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprovar',
        onPress: async () => {
          try {
            await approveRequest({ requestId: request.id });
            Alert.alert('Sucesso', 'Requisição aprovada');
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível aprovar a requisição');
          }
        },
      },
    ]);
  };

  // Handle reject
  const handleReject = async () => {
    if (!request || !rejectReason.trim()) {
      Alert.alert('Erro', 'Informe o motivo da rejeição');
      return;
    }

    try {
      await rejectRequest({ requestId: request.id, reason: rejectReason });
      setShowRejectModal(false);
      setRejectReason('');
      Alert.alert('Sucesso', 'Requisição rejeitada');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível rejeitar a requisição');
    }
  };

  // Handle cancel
  const handleCancel = async () => {
    if (!request) return;

    Alert.alert('Cancelar Requisição', 'Tem certeza que deseja cancelar esta requisição?', [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Sim, Cancelar',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelRequest(request.id);
            router.back();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível cancelar a requisição');
          }
        },
      },
    ]);
  };

  // Handle barcode scan
  const handleScanBarcode = () => {
    setShowScannerModal(true);
  };

  // Process scanned barcode
  const handleBarcodeScanned = (barcode: string) => {
    setShowScannerModal(false);
    setNewItem((prev) => ({ ...prev, barcode, productName: `Produto: ${barcode}` }));
    setShowAddItemModal(true);
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

  if (isLoadingRequest) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-4 text-gray-500">Carregando requisição...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center px-6">
          <AlertTriangle size={48} className="text-gray-400 mb-4" />
          <Text className="text-gray-600 text-lg font-medium text-center">
            Requisição não encontrada
          </Text>
          <Button onPress={() => router.back()} className="mt-6">
            Voltar
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const statusColors = STATUS_COLORS[request.status];
  const priorityColors = PRIORITY_COLORS[request.priority];

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
            <Text className="text-lg font-bold text-gray-900">{request.requestNumber}</Text>
            <Text className="text-sm text-gray-500">{activeContract?.name}</Text>
          </View>
          <View className={`px-3 py-1 rounded-full ${statusColors.bg}`}>
            <Text className={`text-sm font-medium ${statusColors.text}`}>
              {STATUS_LABELS[request.status]}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Request Info Card */}
          <View className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
            <View className="flex-row flex-wrap gap-4">
              {/* Priority */}
              <View className="flex-row items-center">
                <View className={`px-2 py-1 rounded ${priorityColors.bg}`}>
                  <Text className={`text-xs font-medium ${priorityColors.text}`}>
                    {PRIORITY_LABELS[request.priority]}
                  </Text>
                </View>
              </View>

              {/* Requester */}
              <View className="flex-row items-center">
                <User size={16} className="text-gray-400 mr-1" />
                <Text className="text-sm text-gray-600">{request.requesterName}</Text>
              </View>

              {/* Location */}
              {request.activityName && (
                <View className="flex-row items-center">
                  <MapPin size={16} className="text-gray-400 mr-1" />
                  <Text className="text-sm text-gray-600">{request.activityName}</Text>
                </View>
              )}

              {/* Date */}
              <View className="flex-row items-center">
                <Clock size={16} className="text-gray-400 mr-1" />
                <Text className="text-sm text-gray-600">{formatDate(request.createdAt)}</Text>
              </View>
            </View>

            {/* Notes */}
            {request.notes && (
              <View className="mt-3 pt-3 border-t border-gray-100">
                <Text className="text-sm text-gray-600 italic">"{request.notes}"</Text>
              </View>
            )}

            {/* Rejection Reason */}
            {request.rejectionReason && (
              <View className="mt-3 pt-3 border-t border-red-100 bg-red-50 p-2 rounded">
                <Text className="text-xs font-bold text-red-800 mb-1">Motivo da Rejeição:</Text>
                <Text className="text-sm text-red-700">{request.rejectionReason}</Text>
              </View>
            )}
          </View>

          {/* Items List */}
          <View className="mx-4 mt-6 mb-2 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-900">
              Itens ({request.items?.length || 0})
            </Text>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Plus size={16} />}
                onPress={() => setShowAddItemModal(true)}
              >
                Adicionar
              </Button>
            )}
          </View>

          {!request.items || request.items.length === 0 ? (
            <View className="mx-4 mt-2 p-8 bg-white rounded-xl items-center justify-center border border-dashed border-gray-300">
              <Package size={48} className="text-gray-300 mb-4" />
              <Text className="text-gray-500 text-center">Nenhum item na requisição</Text>
              {canEdit && (
                <Button onPress={() => setShowAddItemModal(true)} className="mt-4">
                  Adicionar Primeiro Item
                </Button>
              )}
            </View>
          ) : (
            <View className="mx-4 space-y-3">
              {request.items.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => toggleItemExpanded(item.id)}
                  className="bg-white rounded-xl p-4 shadow-sm"
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-3">
                      <Text className="font-medium text-gray-900 text-base">
                        {item.productName}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <View className="bg-gray-100 px-2 py-0.5 rounded mr-2">
                          <Text className="text-xs text-gray-600 font-medium">
                            {item.requestedQuantity} {item.unit}
                          </Text>
                        </View>
                        {item.notes && (
                          <Text className="text-xs text-gray-500 flex-1" numberOfLines={1}>
                            {item.notes}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View>
                      {expandedItems.has(item.id) ? (
                        <ChevronUp size={20} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-400" />
                      )}
                    </View>
                  </View>

                  {expandedItems.has(item.id) && (
                    <Animated.View entering={FadeIn} className="mt-4 pt-4 border-t border-gray-100">
                      <View className="space-y-2">
                        {item.productCode && (
                          <View className="flex-row justify-between">
                            <Text className="text-sm text-gray-500">Código:</Text>
                            <Text className="text-sm text-gray-900">{item.productCode}</Text>
                          </View>
                        )}
                        {item.notes && (
                          <View>
                            <Text className="text-sm text-gray-500 mb-1">Observações:</Text>
                            <Text className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                              {item.notes}
                            </Text>
                          </View>
                        )}

                        {canEdit && (
                          <View className="flex-row justify-end mt-4 pt-2 border-t border-gray-100">
                            <Button
                              variant="ghost"
                              leftIcon={<Trash2 size={16} />}
                              className="text-red-600"
                              onPress={() => handleRemoveItem(item.id)}
                            >
                              Remover
                            </Button>
                          </View>
                        )}
                      </View>
                    </Animated.View>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Actions */}
      <View className="bg-white border-t border-gray-200 p-4 safe-bottom">
        <View className="flex-row gap-3">
          {canSubmit && (
            <Button
              leftIcon={<Send size={20} color="white" />}
              className="flex-1"
              onPress={handleSubmit}
            >
              Enviar para Aprovação
            </Button>
          )}

          {canApprove && (
            <>
              <Button
                variant="outline"
                leftIcon={<X size={20} />}
                className="flex-1 border-red-200 text-red-700"
                onPress={() => setShowRejectModal(true)}
              >
                Rejeitar
              </Button>
              <Button
                leftIcon={<Check size={20} color="white" />}
                className="flex-1 bg-green-600"
                onPress={handleApprove}
              >
                Aprovar
              </Button>
            </>
          )}

          {canCancel && (
            <Button
              variant="outline"
              className="flex-1 border-red-200 text-red-600"
              onPress={handleCancel}
            >
              Cancelar Requisição
            </Button>
          )}

          {!canSubmit && !canApprove && !canCancel && (
            <Button variant="outline" onPress={() => router.back()} className="flex-1">
              Voltar
            </Button>
          )}
        </View>
      </View>

      {/* Add Item Modal */}
      <Modal
        visible={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        title="Adicionar Item"
      >
        <View className="space-y-4">
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Produto</Text>
            <Pressable
              onPress={handleScanBarcode}
              className="flex-row items-center border border-gray-300 rounded-lg p-3 bg-gray-50"
            >
              <Barcode size={20} className="text-gray-500 mr-2" />
              <Text className="text-gray-500 flex-1">
                {newItem.productName || 'Escanear ou buscar produto...'}
              </Text>
            </Pressable>
          </View>

          {/* Temporary Inputs for prototype */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">ID Produto (Temp)</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3"
              value={newItem.productId}
              onChangeText={(t) => setNewItem((p) => ({ ...p, productId: t }))}
              placeholder="ID do produto"
            />
          </View>
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Nome Produto (Temp)</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3"
              value={newItem.productName}
              onChangeText={(t) => setNewItem((p) => ({ ...p, productName: t }))}
              placeholder="Nome do produto"
            />
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-1">Quantidade</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                value={newItem.quantity}
                onChangeText={(t) => setNewItem((p) => ({ ...p, quantity: t }))}
                keyboardType="numeric"
                placeholder="0.00"
              />
            </View>
            <View className="w-1/3">
              <Text className="text-sm font-medium text-gray-700 mb-1">Unidade</Text>
              <View className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                <Text className="text-gray-700">{newItem.unit}</Text>
              </View>
            </View>
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Observações</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 h-24"
              value={newItem.notes}
              onChangeText={(t) => setNewItem((p) => ({ ...p, notes: t }))}
              placeholder="Detalhes adicionais..."
              multiline
              textAlignVertical="top"
            />
          </View>

          <Button onPress={handleAddItem} className="mt-4">
            Adicionar Item
          </Button>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Rejeitar Requisição"
      >
        <View className="space-y-4">
          <Text className="text-gray-600">
            Por favor, informe o motivo da rejeição. Esta informação será visível para o
            solicitante.
          </Text>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Motivo</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 h-32"
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Descreva o motivo da rejeição..."
              multiline
              textAlignVertical="top"
              autoFocus
            />
          </View>

          <View className="flex-row gap-3 mt-2">
            <Button variant="outline" onPress={() => setShowRejectModal(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onPress={handleReject} className="flex-1 bg-red-600">
              Confirmar Rejeição
            </Button>
          </View>
        </View>
      </Modal>

      {/* Scanner Modal */}
      <Modal
        visible={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        title="Escanear Código de Barras"
      >
        <View className="h-80">
          <BarcodeScanner
            onScan={handleBarcodeScanned}
            isActive={showScannerModal}
            showFlashButton
          />
        </View>
        <Button variant="outline" onPress={() => setShowScannerModal(false)} className="mt-4">
          Cancelar
        </Button>
      </Modal>
    </SafeAreaView>
  );
}
