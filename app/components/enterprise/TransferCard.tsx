/**
 * Card de Transferência de Estoque
 */

import { Pressable, Text, View } from 'react-native';
import {
  ArrowRight,
  Calendar,
  Package,
  Truck,
  User,
  Clock,
  Check,
  X,
  AlertCircle,
} from 'lucide-react-native';
import { StockTransfer, TransferStatus } from '@/types/stock-transfer';
import { formatDate } from '@/lib/utils';

interface TransferCardProps {
  transfer: StockTransfer;
  onPress?: () => void;
  showLocations?: boolean;
}

const STATUS_CONFIG: Record<
  TransferStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  DRAFT: {
    label: 'Rascunho',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    icon: <Clock size={14} className="text-gray-600" />,
  },
  PENDING: {
    label: 'Pendente',
    color: 'text-yellow-600',
    bg: 'bg-yellow-100',
    icon: <Clock size={14} className="text-yellow-600" />,
  },
  APPROVED: {
    label: 'Aprovado',
    color: 'text-green-600',
    bg: 'bg-green-100',
    icon: <Check size={14} className="text-green-600" />,
  },
  REJECTED: {
    label: 'Rejeitado',
    color: 'text-red-600',
    bg: 'bg-red-100',
    icon: <X size={14} className="text-red-600" />,
  },
  IN_TRANSIT: {
    label: 'Em Trânsito',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    icon: <Truck size={14} className="text-blue-600" />,
  },
  RECEIVED: {
    label: 'Recebido',
    color: 'text-green-600',
    bg: 'bg-green-100',
    icon: <Check size={14} className="text-green-600" />,
  },
  PARTIAL_RECEIVED: {
    label: 'Recebido Parcial',
    color: 'text-yellow-600',
    bg: 'bg-yellow-100',
    icon: <AlertCircle size={14} className="text-yellow-600" />,
  },
  CANCELLED: {
    label: 'Cancelado',
    color: 'text-red-600',
    bg: 'bg-red-100',
    icon: <X size={14} className="text-red-600" />,
  },
};

export function TransferCard({ transfer, onPress, showLocations = true }: TransferCardProps) {
  const statusConfig = STATUS_CONFIG[transfer.status];
  const totalItems = transfer.items.length;
  const totalQuantity = transfer.items.reduce((sum, item) => sum + item.requestedQuantity, 0);

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-xl border border-gray-200 p-4 mb-3 active:bg-gray-50"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Text className="font-semibold text-gray-900">{transfer.transferNumber}</Text>
          {transfer.status === 'IN_TRANSIT' && (
            <Truck size={16} className="text-blue-500 animate-pulse" />
          )}
        </View>

        <View className={`flex-row items-center gap-1 px-2 py-1 rounded-full ${statusConfig.bg}`}>
          {statusConfig.icon}
          <Text className={`text-xs font-medium ${statusConfig.color}`}>{statusConfig.label}</Text>
        </View>
      </View>

      {/* Locations */}
      {showLocations && (
        <View className="flex-row items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
          <View className="flex-1">
            <Text className="text-xs text-gray-500">Origem</Text>
            <Text className="text-sm font-medium text-gray-700" numberOfLines={1}>
              {transfer.sourceLocationName || 'Local não definido'}
            </Text>
          </View>

          <ArrowRight size={16} className="text-gray-400" />

          <View className="flex-1">
            <Text className="text-xs text-gray-500">Destino</Text>
            <Text className="text-sm font-medium text-gray-700" numberOfLines={1}>
              {transfer.destinationLocationName || 'Local não definido'}
            </Text>
          </View>
        </View>
      )}

      {/* Items Summary */}
      <View className="flex-row items-center gap-4 mb-2">
        <View className="flex-row items-center gap-1">
          <Package size={14} className="text-gray-400" />
          <Text className="text-sm text-gray-600">
            {totalItems} {totalItems === 1 ? 'item' : 'itens'}
          </Text>
        </View>
        <Text className="text-gray-300">•</Text>
        <Text className="text-sm text-gray-600">
          {totalQuantity} {totalQuantity === 1 ? 'unidade' : 'unidades'}
        </Text>
      </View>

      {/* Footer */}
      <View className="flex-row items-center justify-between pt-2 border-t border-gray-100">
        <View className="flex-row items-center gap-1">
          <User size={12} className="text-gray-400" />
          <Text className="text-xs text-gray-500" numberOfLines={1}>
            {transfer.requestedByName}
          </Text>
        </View>

        <View className="flex-row items-center gap-1">
          <Calendar size={12} className="text-gray-400" />
          <Text className="text-xs text-gray-500">{formatDate(transfer.createdAt)}</Text>
        </View>
      </View>

      {/* Shipping/Receiving Info */}
      {transfer.status !== 'DRAFT' && transfer.shippedAt && (
        <View className="mt-2 pt-2 border-t border-gray-100">
          <View className="flex-row items-center gap-2">
            <Truck size={12} className="text-blue-400" />
            <Text className="text-xs text-gray-500">
              Enviado em {formatDate(transfer.shippedAt)}
            </Text>
          </View>

          {transfer.receivedAt && (
            <View className="flex-row items-center gap-2 mt-1">
              <Check size={12} className="text-green-400" />
              <Text className="text-xs text-gray-500">
                Recebido em {formatDate(transfer.receivedAt)}
              </Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

/**
 * Card compacto para lista de transferências
 */
export function TransferCardCompact({
  transfer,
  onPress,
}: {
  transfer: StockTransfer;
  onPress?: () => void;
}) {
  const statusConfig = STATUS_CONFIG[transfer.status];

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between p-3 bg-white rounded-lg border border-gray-200 mb-2 active:bg-gray-50"
    >
      <View className="flex-1 flex-row items-center gap-3">
        {statusConfig.icon}
        <View className="flex-1">
          <Text className="font-medium text-gray-800" numberOfLines={1}>
            {transfer.transferNumber}
          </Text>
          <Text className="text-xs text-gray-500" numberOfLines={1}>
            {transfer.sourceLocationName} → {transfer.destinationLocationName}
          </Text>
        </View>
      </View>

      <View className="items-end">
        <View className={`px-2 py-0.5 rounded-full ${statusConfig.bg}`}>
          <Text className={`text-xs ${statusConfig.color}`}>{statusConfig.label}</Text>
        </View>
        <Text className="text-xs text-gray-400 mt-1">
          {transfer.items.length} {transfer.items.length === 1 ? 'item' : 'itens'}
        </Text>
      </View>
    </Pressable>
  );
}
