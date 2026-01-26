/**
 * Tela de Transferências de Estoque - Enterprise
 */

import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Plus,
  Search,
  Filter,
  ArrowRightLeft,
  Truck,
  Clock,
  Check,
  Package,
  AlertCircle,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TransferCard } from '@/components/enterprise/TransferCard';
import { OfflineQueue } from '@/components/enterprise/OfflineQueue';
import { useStockTransfers } from '@/hooks/useStockTransfers';
import { useEnterpriseContextStore } from '@/stores/enterpriseContextStore';
import { StockTransfer, TransferStatus } from '@/types/stock-transfer';

type StatusFilter = TransferStatus | 'all';

const STATUS_FILTERS: Array<{
  value: StatusFilter;
  label: string;
  icon: React.ReactNode;
}> = [
  { value: 'all', label: 'Todas', icon: <ArrowRightLeft size={16} /> },
  { value: 'DRAFT', label: 'Rascunho', icon: <Clock size={16} /> },
  { value: 'IN_TRANSIT', label: 'Em Trânsito', icon: <Truck size={16} /> },
  { value: 'RECEIVED', label: 'Recebidas', icon: <Check size={16} /> },
  { value: 'PARTIAL_RECEIVED', label: 'Parcial', icon: <AlertCircle size={16} /> },
];

const VIEW_MODES = [
  { value: 'all', label: 'Todas' },
  { value: 'outgoing', label: 'Enviadas' },
  { value: 'incoming', label: 'Recebidas' },
] as const;

type ViewMode = (typeof VIEW_MODES)[number]['value'];

export default function TransferenciasScreen() {
  const router = useRouter();
  const {
    transfers,
    isLoading,
    error,
    isOnline,
    isSyncing,
    inTransitCount,
    pendingReceiveCount,
    loadTransfers,
    createTransfer,
    syncPendingActions,
  } = useStockTransfers();

  const { activeContract, activeLocation } = useEnterpriseContextStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [showNewTransferModal, setShowNewTransferModal] = useState(false);

  // Load transfers on mount
  useEffect(() => {
    loadTransfers();
  }, []);

  const handleRefresh = useCallback(() => {
    loadTransfers();
  }, [loadTransfers]);

  // Workaround for typed routes
  const navigate = (path: string) => {
    router.push(path as any);
  };

  const handleCreateTransfer = async () => {
    if (!activeLocation) return;

    const id = await createTransfer({
      fromLocationId: activeLocation.id,
      toLocationId: '',
    });
    setShowNewTransferModal(false);
    navigate(`/transferencias/${id}`);
  };

  const handleTransferPress = (transfer: StockTransfer) => {
    navigate(`/transferencias/${transfer.id}`);
  };

  // Filter transfers
  const filteredTransfers = transfers.filter((t) => {
    // Status filter
    if (selectedStatus !== 'all' && t.status !== selectedStatus) {
      return false;
    }

    // View mode filter
    if (viewMode === 'outgoing' && activeLocation) {
      if (t.sourceLocationId !== activeLocation.id) return false;
    }
    if (viewMode === 'incoming' && activeLocation) {
      if (t.destinationLocationId !== activeLocation.id) return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        t.transferNumber.toLowerCase().includes(query) ||
        t.sourceLocationName.toLowerCase().includes(query) ||
        t.destinationLocationName.toLowerCase().includes(query)
      );
    }

    return true;
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Transferências',
          headerRight: () => (
            <Pressable onPress={() => setShowNewTransferModal(true)} className="mr-4">
              <Plus size={24} className="text-blue-600" />
            </Pressable>
          ),
        }}
      />

      <View className="flex-1 px-4">
        {/* Context Banner */}
        {activeContract && (
          <View className="bg-purple-50 rounded-lg p-3 mb-4 mt-2">
            <Text className="text-xs text-purple-600 font-medium">Local Ativo</Text>
            <Text className="text-purple-800 font-semibold">
              {activeLocation?.name || 'Nenhum local selecionado'}
            </Text>
            <Text className="text-sm text-purple-600">{activeContract.name}</Text>
          </View>
        )}

        {/* Stats Cards */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-blue-50 rounded-lg p-3">
            <View className="flex-row items-center gap-2">
              <Truck size={20} className="text-blue-600" />
              <Text className="text-2xl font-bold text-blue-800">{inTransitCount}</Text>
            </View>
            <Text className="text-xs text-blue-600">Em trânsito</Text>
          </View>
          {pendingReceiveCount > 0 && (
            <View className="flex-1 bg-yellow-50 rounded-lg p-3">
              <View className="flex-row items-center gap-2">
                <Package size={20} className="text-yellow-600" />
                <Text className="text-2xl font-bold text-yellow-800">{pendingReceiveCount}</Text>
              </View>
              <Text className="text-xs text-yellow-600">Para receber</Text>
            </View>
          )}
        </View>

        {/* Offline Queue */}
        <OfflineQueue isOnline={isOnline} isSyncing={isSyncing} onSync={syncPendingActions} />

        {/* View Mode Tabs */}
        <View className="flex-row bg-gray-100 rounded-lg p-1 mb-4">
          {VIEW_MODES.map((mode) => (
            <Pressable
              key={mode.value}
              onPress={() => setViewMode(mode.value)}
              className={`flex-1 py-2 rounded-md ${
                viewMode === mode.value ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  viewMode === mode.value ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                {mode.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center gap-2 mb-4">
          <View className="flex-1 flex-row items-center bg-white border border-gray-200 rounded-lg px-3">
            <Search size={18} className="text-gray-400" />
            <TextInput
              className="flex-1 p-3 text-gray-800"
              placeholder="Buscar transferências..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9ca3af"
            />
          </View>
          <Pressable
            onPress={() => setShowFilters(true)}
            className={`p-3 rounded-lg border ${
              selectedStatus !== 'all' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
            }`}
          >
            <Filter
              size={20}
              className={selectedStatus !== 'all' ? 'text-blue-600' : 'text-gray-600'}
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
              {item.value === 'IN_TRANSIT' && inTransitCount > 0 && (
                <View className="bg-blue-400 rounded-full px-1.5 py-0.5 ml-1">
                  <Text className="text-xs text-white font-bold">{inTransitCount}</Text>
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

        {/* Transfers List */}
        <FlatList
          data={filteredTransfers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TransferCard transfer={item} onPress={() => handleTransferPress(item)} />
          )}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            !isLoading ? (
              <View className="items-center justify-center py-12">
                <ArrowRightLeft size={48} className="text-gray-300 mb-4" />
                <Text className="text-gray-500 text-lg font-medium mb-2">
                  Nenhuma transferência encontrada
                </Text>
                <Text className="text-gray-400 text-center">
                  {searchQuery || selectedStatus !== 'all'
                    ? 'Tente ajustar os filtros'
                    : 'Crie sua primeira transferência'}
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />

        {/* FAB */}
        <Pressable
          onPress={() => setShowNewTransferModal(true)}
          className="absolute bottom-6 right-4 w-14 h-14 bg-purple-600 rounded-full items-center justify-center shadow-lg"
        >
          <Plus size={28} className="text-white" />
        </Pressable>
      </View>

      {/* Filters Modal */}
      <Modal visible={showFilters} onClose={() => setShowFilters(false)} title="Filtros">
        <View className="p-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Status</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {STATUS_FILTERS.map((status) => (
              <Pressable
                key={status.value}
                onPress={() => setSelectedStatus(status.value)}
                className={`px-4 py-2 rounded-full ${
                  selectedStatus === status.value ? 'bg-blue-600' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={
                    selectedStatus === status.value ? 'text-white font-medium' : 'text-gray-700'
                  }
                >
                  {status.label}
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
                setViewMode('all');
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

      {/* New Transfer Modal */}
      <Modal
        visible={showNewTransferModal}
        onClose={() => setShowNewTransferModal(false)}
        title="Nova Transferência"
      >
        <View className="p-4">
          <View className="bg-purple-50 rounded-lg p-4 mb-4">
            <Text className="text-purple-800 font-medium mb-2">Criar transferência de estoque</Text>
            <Text className="text-purple-600 text-sm">
              Origem: {activeLocation?.name || 'Não selecionado'}
            </Text>
          </View>

          {!activeLocation && (
            <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <Text className="text-yellow-700 text-sm">
                Selecione um local de origem antes de criar uma transferência.
              </Text>
            </View>
          )}

          <View className="flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => setShowNewTransferModal(false)}
            >
              <Text className="text-gray-700">Cancelar</Text>
            </Button>
            <Button
              variant="default"
              className="flex-1 bg-purple-600"
              onPress={handleCreateTransfer}
              disabled={!activeLocation}
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
