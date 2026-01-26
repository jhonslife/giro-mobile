/**
 * Tela de Requisições de Material - Enterprise
 */

import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Plus,
  Search,
  Filter,
  ClipboardList,
  Package,
  Clock,
  Check,
  AlertCircle,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { RequestCard } from '@/components/enterprise/RequestCard';
import { OfflineQueue } from '@/components/enterprise/OfflineQueue';
import { useMaterialRequests } from '@/hooks/useMaterialRequests';
import { useEnterpriseContextStore } from '@/stores/enterpriseContextStore';
import { MaterialRequest, RequestStatus, RequestPriority } from '@/types/material-request';

type StatusFilter = RequestStatus | 'all';
type PriorityFilter = RequestPriority | 'all';

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string; icon: React.ReactNode }> = [
  { value: 'all', label: 'Todas', icon: <ClipboardList size={16} /> },
  { value: 'DRAFT', label: 'Rascunho', icon: <Clock size={16} /> },
  { value: 'PENDING', label: 'Aguardando', icon: <AlertCircle size={16} /> },
  { value: 'APPROVED', label: 'Aprovadas', icon: <Check size={16} /> },
  { value: 'SEPARATING', label: 'Separação', icon: <Package size={16} /> },
];

const PRIORITY_FILTERS: Array<{ value: PriorityFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'LOW', label: 'Baixa' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
];

export default function RequisicoesScreen() {
  const router = useRouter();
  const {
    requests,
    isLoading,
    error,
    isOnline,
    isSyncing,
    loadRequests,
    createRequest,
    syncPendingActions,
  } = useMaterialRequests();

  const { activeContract, activeLocation } = useEnterpriseContextStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [selectedPriority, setSelectedPriority] = useState<PriorityFilter>('all');
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);

  // Load requests on mount
  useEffect(() => {
    loadRequests();
  }, []);

  const handleRefresh = useCallback(() => {
    loadRequests();
  }, [loadRequests]);

  const handleCreateRequest = async () => {
    if (!activeContract) return;

    const id = await createRequest({
      contractId: activeContract.id,
      activityId: activeLocation?.id || '',
      priority: 'NORMAL' as RequestPriority,
    });
    setShowNewRequestModal(false);
    // Navigate to detail
    navigate(`/requisicoes/${id}`);
  };

  // Workaround for typed routes
  const navigate = (path: string) => {
    router.push(path as any);
  };

  const handleRequestPress = (request: MaterialRequest) => {
    navigate(`/requisicoes/${request.id}`);
  };

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    // Status filter
    if (selectedStatus !== 'all' && req.status !== selectedStatus) {
      return false;
    }

    // Priority filter
    if (selectedPriority !== 'all' && req.priority !== selectedPriority) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        req.requestNumber.toLowerCase().includes(query) ||
        req.requesterName.toLowerCase().includes(query) ||
        req.items.some((item) => item.productName.toLowerCase().includes(query))
      );
    }

    return true;
  });

  // Count pending approvals
  const pendingApprovalCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Requisições',
          headerRight: () => (
            <Pressable onPress={() => setShowNewRequestModal(true)} className="mr-4">
              <Plus size={24} className="text-blue-600" />
            </Pressable>
          ),
        }}
      />

      <View className="flex-1 px-4">
        {/* Context Banner */}
        {activeContract && (
          <View className="bg-blue-50 rounded-lg p-3 mb-4 mt-2">
            <Text className="text-xs text-blue-600 font-medium">Contrato Ativo</Text>
            <Text className="text-blue-800 font-semibold">{activeContract.name}</Text>
            {activeLocation && (
              <Text className="text-sm text-blue-600">Local: {activeLocation.name}</Text>
            )}
          </View>
        )}

        {/* Offline Queue */}
        <OfflineQueue isOnline={isOnline} isSyncing={isSyncing} onSync={syncPendingActions} />

        {/* Search Bar */}
        <View className="flex-row items-center gap-2 mb-4">
          <View className="flex-1 flex-row items-center bg-white border border-gray-200 rounded-lg px-3">
            <Search size={18} className="text-gray-400" />
            <TextInput
              className="flex-1 p-3 text-gray-800"
              placeholder="Buscar requisições..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9ca3af"
            />
          </View>
          <Pressable
            onPress={() => setShowFilters(true)}
            className={`p-3 rounded-lg border ${
              selectedStatus !== 'all' || selectedPriority !== 'all'
                ? 'bg-blue-50 border-blue-200'
                : 'bg-white border-gray-200'
            }`}
          >
            <Filter
              size={20}
              className={
                selectedStatus !== 'all' || selectedPriority !== 'all'
                  ? 'text-blue-600'
                  : 'text-gray-600'
              }
            />
          </Pressable>
        </View>

        {/* Status Pills */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.value}
          className="mb-4 max-h-12"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedStatus(item.value)}
              className={`flex-row items-center gap-1 px-3 py-2 mr-2 rounded-full ${
                selectedStatus === item.value ? 'bg-blue-600' : 'bg-white border border-gray-200'
              }`}
            >
              {item.icon}
              <Text
                className={
                  selectedStatus === item.value ? 'text-white font-medium' : 'text-gray-700'
                }
              >
                {item.label}
              </Text>
              {item.value === 'PENDING' && pendingApprovalCount > 0 && (
                <View className="bg-red-500 rounded-full px-1.5 py-0.5 ml-1">
                  <Text className="text-xs text-white font-bold">{pendingApprovalCount}</Text>
                </View>
              )}
            </Pressable>
          )}
        />

        {/* Error Message */}
        {error && (
          <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <Text className="text-red-700">{error}</Text>
          </View>
        )}

        {/* Requests List */}
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RequestCard request={item} onPress={() => handleRequestPress(item)} />
          )}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            !isLoading ? (
              <View className="items-center justify-center py-12">
                <ClipboardList size={48} className="text-gray-300 mb-4" />
                <Text className="text-gray-500 text-lg font-medium mb-2">
                  Nenhuma requisição encontrada
                </Text>
                <Text className="text-gray-400 text-center">
                  {searchQuery || selectedStatus !== 'all'
                    ? 'Tente ajustar os filtros'
                    : 'Crie sua primeira requisição'}
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />

        {/* FAB */}
        <Pressable
          onPress={() => setShowNewRequestModal(true)}
          className="absolute bottom-6 right-4 w-14 h-14 bg-blue-600 rounded-full items-center justify-center shadow-lg"
        >
          <Plus size={28} className="text-white" />
        </Pressable>
      </View>

      {/* Filters Modal */}
      <Modal visible={showFilters} onClose={() => setShowFilters(false)} title="Filtros">
        <View className="p-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Prioridade</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {PRIORITY_FILTERS.map((priority) => (
              <Pressable
                key={priority.value}
                onPress={() => setSelectedPriority(priority.value)}
                className={`px-4 py-2 rounded-full ${
                  selectedPriority === priority.value ? 'bg-blue-600' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={
                    selectedPriority === priority.value ? 'text-white font-medium' : 'text-gray-700'
                  }
                >
                  {priority.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="flex-row gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => {
                setSelectedStatus('all');
                setSelectedPriority('all');
                setSearchQuery('');
              }}
            >
              <Text className="text-gray-700">Limpar Filtros</Text>
            </Button>
            <Button variant="default" className="flex-1" onPress={() => setShowFilters(false)}>
              <Text className="text-white">Aplicar</Text>
            </Button>
          </View>
        </View>
      </Modal>

      {/* New Request Modal */}
      <Modal
        visible={showNewRequestModal}
        onClose={() => setShowNewRequestModal(false)}
        title="Nova Requisição"
      >
        <View className="p-4">
          <View className="bg-blue-50 rounded-lg p-4 mb-4">
            <Text className="text-blue-800 font-medium mb-2">Criar requisição de material</Text>
            <Text className="text-blue-600 text-sm">
              Contrato: {activeContract?.name || 'Não selecionado'}
            </Text>
            <Text className="text-blue-600 text-sm">
              Local: {activeLocation?.name || 'Não selecionado'}
            </Text>
          </View>

          {!activeContract && (
            <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <Text className="text-yellow-700 text-sm">
                Selecione um contrato antes de criar uma requisição.
              </Text>
            </View>
          )}

          <View className="flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => setShowNewRequestModal(false)}
            >
              <Text className="text-gray-700">Cancelar</Text>
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onPress={handleCreateRequest}
              disabled={!activeContract}
            >
              <Plus size={16} className="text-white mr-2" />
              <Text className="text-white font-medium">Criar</Text>
            </Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
