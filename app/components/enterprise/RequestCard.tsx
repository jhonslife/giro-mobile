/**
 * Card de Requisição de Material
 */

import { ChevronRight, Clock, AlertTriangle, Check, X, Package } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { MaterialRequest, RequestStatus, RequestPriority } from '@/types/material-request';

interface RequestCardProps {
  request: MaterialRequest;
  onPress: (request: MaterialRequest) => void;
  showContract?: boolean;
}

const STATUS_CONFIG: Record<
  RequestStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'outline' }
> = {
  DRAFT: { label: 'Rascunho', variant: 'outline' },
  PENDING: { label: 'Pendente', variant: 'warning' },
  APPROVED: { label: 'Aprovada', variant: 'success' },
  REJECTED: { label: 'Rejeitada', variant: 'error' },
  SEPARATING: { label: 'Separando', variant: 'default' },
  READY: { label: 'Pronta', variant: 'success' },
  DELIVERED: { label: 'Entregue', variant: 'success' },
  CANCELLED: { label: 'Cancelada', variant: 'error' },
};

const PRIORITY_CONFIG: Record<RequestPriority, { label: string; color: string }> = {
  LOW: { label: 'Baixa', color: 'text-gray-500' },
  NORMAL: { label: 'Normal', color: 'text-blue-600' },
  HIGH: { label: 'Alta', color: 'text-orange-600' },
  URGENT: { label: 'Urgente', color: 'text-red-600' },
};

export function RequestCard({ request, onPress, showContract = true }: RequestCardProps) {
  const statusConfig = STATUS_CONFIG[request.status];
  const priorityConfig = PRIORITY_CONFIG[request.priority];
  const itemsCount = request.items?.length ?? 0;

  return (
    <Pressable
      onPress={() => onPress(request)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3 active:bg-gray-50"
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900">{request.requestNumber}</Text>
          {showContract && (
            <Text className="text-sm text-gray-500">
              {request.contractCode} - {request.contractName}
            </Text>
          )}
        </View>
        <View className="flex-row items-center gap-2">
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          <ChevronRight size={20} className="text-gray-400" />
        </View>
      </View>

      <View className="flex-row items-center gap-4 mb-3">
        <View className="flex-row items-center gap-1">
          <Package size={14} className="text-gray-400" />
          <Text className="text-sm text-gray-600">
            {itemsCount} {itemsCount === 1 ? 'item' : 'itens'}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Clock size={14} className="text-gray-400" />
          <Text className="text-sm text-gray-600">{formatDate(request.createdAt)}</Text>
        </View>
        {request.priority !== 'NORMAL' && (
          <View className="flex-row items-center gap-1">
            <AlertTriangle size={14} className={priorityConfig.color} />
            <Text className={`text-sm font-medium ${priorityConfig.color}`}>
              {priorityConfig.label}
            </Text>
          </View>
        )}
      </View>

      <View className="flex-row items-center justify-between pt-2 border-t border-gray-100">
        <Text className="text-sm text-gray-500">Solicitante: {request.requesterName}</Text>
        <Text className="text-base font-semibold text-gray-900">
          {formatCurrency(request.totalEstimatedValue)}
        </Text>
      </View>

      {request.status === 'PENDING' && request.approvedById && (
        <View className="flex-row items-center gap-2 mt-2 pt-2 border-t border-gray-100">
          <Check size={14} className="text-green-600" />
          <Text className="text-sm text-green-700">Aprovado por {request.approvedByName}</Text>
        </View>
      )}

      {request.status === 'REJECTED' && request.rejectionReason && (
        <View className="flex-row items-center gap-2 mt-2 pt-2 border-t border-gray-100">
          <X size={14} className="text-red-600" />
          <Text className="text-sm text-red-700 flex-1" numberOfLines={1}>
            {request.rejectionReason}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Lista vazia de requisições
 */
export function EmptyRequestsList() {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <Package size={48} className="text-gray-300 mb-4" />
      <Text className="text-lg font-medium text-gray-500 text-center">
        Nenhuma requisição encontrada
      </Text>
      <Text className="text-sm text-gray-400 text-center mt-1">
        Crie uma nova requisição ou ajuste os filtros
      </Text>
    </View>
  );
}
