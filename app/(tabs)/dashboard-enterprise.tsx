/**
 * Dashboard Enterprise - Visão Geral para Almoxarifado
 */

import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Building2,
  ClipboardList,
  ArrowRightLeft,
  Package,
  AlertTriangle,
  ChevronRight,
  Truck,
  Check,
  Clock,
  BarChart3,
  Settings,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEnterpriseContextStore } from '@/stores/enterpriseContextStore';
import { useMaterialRequests } from '@/hooks/useMaterialRequests';
import { useStockTransfers } from '@/hooks/useStockTransfers';
import { RequestCard } from '@/components/enterprise/RequestCard';
import { TransferCardCompact } from '@/components/enterprise/TransferCard';
import { OfflineQueueBadge } from '@/components/enterprise/OfflineQueue';
import { Modal } from '@/components/ui/Modal';

export default function DashboardEnterpriseScreen() {
  const router = useRouter();
  const {
    activeContract,
    activeLocation,
    availableContracts: contracts,
    setActiveContract,
    canApprove,
  } = useEnterpriseContextStore();

  const {
    requests,
    loadRequests,
    pendingActionsCount: requestPendingActions,
    isOnline: requestsOnline,
  } = useMaterialRequests();

  const {
    transfers,
    loadTransfers,
    pendingActionsCount: transferPendingActions,
    isOnline: transfersOnline,
  } = useStockTransfers();

  const [showContractSelector, setShowContractSelector] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isOnline = requestsOnline && transfersOnline;
  const totalPendingActions = requestPendingActions + transferPendingActions;

  // Computed stats
  const pendingApprovalCount = requests.filter((r) => r.status === 'PENDING').length;
  const inTransitCount = transfers.filter((t) => t.status === 'IN_TRANSIT').length;
  const pendingReceiveCount = transfers.filter(
    (t) => t.status === 'IN_TRANSIT' && t.destinationLocationId === activeLocation?.id
  ).length;
  const deliveredTodayCount = requests.filter(
    (r) =>
      r.status === 'DELIVERED' && new Date(r.updatedAt).toDateString() === new Date().toDateString()
  ).length;

  useEffect(() => {
    loadRequests();
    loadTransfers();
  }, [activeContract, activeLocation]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadRequests(), loadTransfers()]);
    setIsRefreshing(false);
  };

  // Filter recent items
  const pendingApprovalRequests = requests.filter((r) => r.status === 'PENDING').slice(0, 3);

  const inTransitTransfers = transfers.filter((t) => t.status === 'IN_TRANSIT').slice(0, 3);

  const recentRequests = requests.slice(0, 5);

  // Helper for route navigation (expo-router typed routes workaround)
  const navigate = (path: string) => {
    router.push(path as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Dashboard',
          headerRight: () => (
            <View className="flex-row items-center gap-2 mr-4">
              <OfflineQueueBadge
                count={totalPendingActions}
                isOnline={isOnline}
                onPress={() => navigate('/configuracoes')}
              />
              <Pressable onPress={() => navigate('/configuracoes')}>
                <Settings size={22} className="text-gray-600" />
              </Pressable>
            </View>
          ),
        }}
      />

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Contract Selector */}
        <Pressable
          onPress={() => setShowContractSelector(true)}
          className="mx-4 mt-4 bg-blue-600 rounded-xl p-4"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
                <Building2 size={20} className="text-white" />
              </View>
              <View>
                <Text className="text-blue-100 text-xs">Contrato Ativo</Text>
                <Text className="text-white font-semibold text-lg">
                  {activeContract?.name || 'Selecione um contrato'}
                </Text>
                {activeLocation && (
                  <Text className="text-blue-200 text-sm">📍 {activeLocation.name}</Text>
                )}
              </View>
            </View>
            <ChevronRight size={20} className="text-white" />
          </View>
        </Pressable>

        {/* Quick Stats */}
        <View className="flex-row gap-3 mx-4 mt-4">
          <StatsCard
            title="Aguardando Aprovação"
            value={pendingApprovalCount}
            icon={<Clock size={20} className="text-yellow-600" />}
            bgColor="bg-yellow-50"
            textColor="text-yellow-700"
            onPress={() => navigate('/requisicoes')}
          />
          <StatsCard
            title="Em Trânsito"
            value={inTransitCount}
            icon={<Truck size={20} className="text-blue-600" />}
            bgColor="bg-blue-50"
            textColor="text-blue-700"
            onPress={() => navigate('/transferencias')}
          />
        </View>

        <View className="flex-row gap-3 mx-4 mt-3">
          <StatsCard
            title="Para Receber"
            value={pendingReceiveCount}
            icon={<Package size={20} className="text-purple-600" />}
            bgColor="bg-purple-50"
            textColor="text-purple-700"
            onPress={() => navigate('/transferencias')}
          />
          <StatsCard
            title="Finalizadas Hoje"
            value={deliveredTodayCount}
            icon={<Check size={20} className="text-green-600" />}
            bgColor="bg-green-50"
            textColor="text-green-700"
            onPress={() => navigate('/requisicoes')}
          />
        </View>

        {/* Pending Approvals Section */}
        {canApprove() && pendingApprovalRequests.length > 0 && (
          <View className="mt-6 mx-4">
            <SectionHeader
              title="Aguardando sua Aprovação"
              count={pendingApprovalCount}
              onSeeAll={() => navigate('/requisicoes')}
            />
            {pendingApprovalRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onPress={() => navigate(`/requisicoes/${request.id}`)}
              />
            ))}
          </View>
        )}

        {/* In Transit Transfers */}
        {inTransitTransfers.length > 0 && (
          <View className="mt-6 mx-4">
            <SectionHeader
              title="Transferências em Trânsito"
              count={inTransitCount}
              onSeeAll={() => navigate('/transferencias')}
            />
            {inTransitTransfers.map((transfer) => (
              <TransferCardCompact
                key={transfer.id}
                transfer={transfer}
                onPress={() => navigate(`/transferencias/${transfer.id}`)}
              />
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View className="mt-6 mx-4">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Ações Rápidas</Text>
          <View className="flex-row gap-3">
            <QuickActionCard
              title="Nova Requisição"
              icon={<ClipboardList size={24} className="text-blue-600" />}
              bgColor="bg-blue-50"
              onPress={() => navigate('/requisicoes')}
            />
            <QuickActionCard
              title="Nova Transferência"
              icon={<ArrowRightLeft size={24} className="text-purple-600" />}
              bgColor="bg-purple-50"
              onPress={() => navigate('/transferencias')}
            />
          </View>
          <View className="flex-row gap-3 mt-3">
            <QuickActionCard
              title="Inventário"
              icon={<Package size={24} className="text-green-600" />}
              bgColor="bg-green-50"
              onPress={() => navigate('/inventario-enterprise')}
            />
            <QuickActionCard
              title="Relatórios"
              icon={<BarChart3 size={24} className="text-orange-600" />}
              bgColor="bg-orange-50"
              onPress={() => navigate('/configuracoes')}
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View className="mt-6 mx-4">
          <SectionHeader title="Atividade Recente" onSeeAll={() => navigate('/requisicoes')} />
          {recentRequests.length > 0 ? (
            recentRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onPress={() => navigate(`/requisicoes/${request.id}`)}
              />
            ))
          ) : (
            <View className="items-center py-8 bg-white rounded-xl">
              <ClipboardList size={40} className="text-gray-300 mb-2" />
              <Text className="text-gray-500">Nenhuma atividade recente</Text>
            </View>
          )}
        </View>

        {/* Alerts Section */}
        {(pendingReceiveCount > 0 || pendingApprovalCount > 5) && (
          <View className="mt-6 mx-4 mb-4">
            <Text className="text-lg font-semibold text-gray-800 mb-3">Alertas</Text>
            {pendingReceiveCount > 0 && (
              <AlertCard
                type="warning"
                title="Transferências Pendentes"
                message={`Você tem ${pendingReceiveCount} transferência(s) aguardando recebimento`}
                onPress={() => navigate('/transferencias')}
              />
            )}
            {pendingApprovalCount > 5 && (
              <AlertCard
                type="info"
                title="Aprovações Acumuladas"
                message={`${pendingApprovalCount} requisições aguardando aprovação`}
                onPress={() => navigate('/requisicoes')}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Contract Selector Modal */}
      <Modal
        visible={showContractSelector}
        onClose={() => setShowContractSelector(false)}
        title="Selecionar Contrato"
      >
        <View className="p-4">
          <FlatList
            data={contracts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setActiveContract(item);
                  setShowContractSelector(false);
                }}
                className={`p-4 rounded-lg mb-2 ${
                  activeContract?.id === item.id
                    ? 'bg-blue-50 border-2 border-blue-500'
                    : 'bg-gray-50'
                }`}
              >
                <Text
                  className={`font-semibold ${
                    activeContract?.id === item.id ? 'text-blue-700' : 'text-gray-800'
                  }`}
                >
                  {item.name}
                </Text>
                <Text className="text-sm text-gray-500">{item.code}</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <View className="items-center py-8">
                <Text className="text-gray-500">Nenhum contrato disponível</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Helper Components
function StatsCard({
  title,
  value,
  icon,
  bgColor,
  textColor,
  onPress,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} className={`flex-1 ${bgColor} rounded-xl p-4 active:opacity-80`}>
      <View className="flex-row items-center justify-between mb-2">
        {icon}
        <Text className={`text-2xl font-bold ${textColor}`}>{value}</Text>
      </View>
      <Text className={`text-sm ${textColor}`}>{title}</Text>
    </Pressable>
  );
}

function QuickActionCard({
  title,
  icon,
  bgColor,
  onPress,
}: {
  title: string;
  icon: React.ReactNode;
  bgColor: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 ${bgColor} rounded-xl p-4 items-center active:opacity-80`}
    >
      {icon}
      <Text className="text-gray-700 font-medium mt-2 text-center">{title}</Text>
    </Pressable>
  );
}

function SectionHeader({
  title,
  count,
  onSeeAll,
}: {
  title: string;
  count?: number;
  onSeeAll?: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between mb-3">
      <View className="flex-row items-center gap-2">
        <Text className="text-lg font-semibold text-gray-800">{title}</Text>
        {count !== undefined && count > 0 && (
          <View className="bg-red-500 rounded-full px-2 py-0.5">
            <Text className="text-xs text-white font-bold">{count}</Text>
          </View>
        )}
      </View>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} className="flex-row items-center">
          <Text className="text-blue-600 text-sm">Ver todas</Text>
          <ChevronRight size={16} className="text-blue-600" />
        </Pressable>
      )}
    </View>
  );
}

function AlertCard({
  type,
  title,
  message,
  onPress,
}: {
  type: 'warning' | 'info' | 'error';
  title: string;
  message: string;
  onPress?: () => void;
}) {
  const colors = {
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  };

  const config = colors[type];

  return (
    <Pressable
      onPress={onPress}
      className={`${config.bg} border ${config.border} rounded-lg p-4 mb-2 flex-row items-start gap-3 active:opacity-80`}
    >
      <AlertTriangle size={20} className={config.text} />
      <View className="flex-1">
        <Text className={`font-medium ${config.text}`}>{title}</Text>
        <Text className={`text-sm ${config.text} opacity-80`}>{message}</Text>
      </View>
      <ChevronRight size={16} className={config.text} />
    </Pressable>
  );
}
