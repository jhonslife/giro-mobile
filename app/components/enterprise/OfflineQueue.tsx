/**
 * Visualização da Queue Offline de Ações Pendentes
 */

import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Trash2,
  AlertCircle,
  Check,
  Package,
  ArrowRightLeft,
  ClipboardList,
} from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';

interface PendingAction {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
  synced: boolean;
  retryCount: number;
  lastError?: string;
}

interface OfflineQueueProps {
  pendingCounts?: number;
  pendingRequestActions?: PendingAction[];
  pendingTransferActions?: PendingAction[];
  isOnline: boolean;
  isSyncing: boolean;
  onSync: () => Promise<void>;
  onClear?: () => void;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  create: <ClipboardList size={16} className="text-blue-500" />,
  add_item: <Package size={16} className="text-green-500" />,
  remove_item: <Trash2 size={16} className="text-red-500" />,
  submit: <Check size={16} className="text-purple-500" />,
  approve: <Check size={16} className="text-green-600" />,
  reject: <AlertCircle size={16} className="text-red-600" />,
  ship: <ArrowRightLeft size={16} className="text-blue-600" />,
  receive: <Package size={16} className="text-green-600" />,
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Criar',
  add_item: 'Adicionar item',
  remove_item: 'Remover item',
  submit: 'Enviar para aprovação',
  approve: 'Aprovar',
  reject: 'Rejeitar',
  ship: 'Enviar',
  receive: 'Receber',
};

export function OfflineQueue({
  pendingCounts = 0,
  pendingRequestActions = [],
  pendingTransferActions = [],
  isOnline,
  isSyncing,
  onSync,
  onClear,
}: OfflineQueueProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const totalPending = pendingCounts + pendingRequestActions.length + pendingTransferActions.length;
  const hasErrors = [...pendingRequestActions, ...pendingTransferActions].some(
    (a) => a.retryCount > 0 && a.lastError
  );

  if (totalPending === 0) return null;

  return (
    <>
      <Pressable
        onPress={() => setShowDetails(true)}
        className={`flex-row items-center justify-between p-3 rounded-lg mb-4 ${
          hasErrors ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
        }`}
      >
        <View className="flex-row items-center gap-2">
          {isOnline ? (
            <Cloud size={20} className="text-yellow-600" />
          ) : (
            <CloudOff size={20} className="text-gray-500" />
          )}
          <View>
            <Text className={`font-medium ${hasErrors ? 'text-red-700' : 'text-yellow-700'}`}>
              {totalPending} {totalPending === 1 ? 'ação pendente' : 'ações pendentes'}
            </Text>
            <Text className={`text-sm ${hasErrors ? 'text-red-600' : 'text-yellow-600'}`}>
              {isOnline
                ? hasErrors
                  ? 'Algumas ações falharam'
                  : 'Aguardando sincronização'
                : 'Aguardando conexão'}
            </Text>
          </View>
        </View>

        <Button variant="ghost" onPress={onSync} disabled={!isOnline || isSyncing} className="px-3">
          <RefreshCw
            size={18}
            className={`${isSyncing ? 'animate-spin' : ''} ${
              isOnline ? 'text-yellow-700' : 'text-gray-400'
            }`}
          />
        </Button>
      </Pressable>

      {/* Modal de Detalhes */}
      <Modal visible={showDetails} onClose={() => setShowDetails(false)} title="Ações Pendentes">
        <View className="p-4">
          {/* Contagens de inventário */}
          {pendingCounts > 0 && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-500 mb-2">
                Contagens de Inventário
              </Text>
              <View className="bg-gray-50 rounded-lg p-3">
                <View className="flex-row items-center gap-2">
                  <Package size={16} className="text-blue-500" />
                  <Text className="text-gray-700">
                    {pendingCounts} contagem(ns) aguardando sync
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Requisições */}
          {pendingRequestActions.length > 0 && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-500 mb-2">Requisições</Text>
              <FlatList
                data={pendingRequestActions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <PendingActionItem action={item} />}
                scrollEnabled={false}
              />
            </View>
          )}

          {/* Transferências */}
          {pendingTransferActions.length > 0 && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-500 mb-2">Transferências</Text>
              <FlatList
                data={pendingTransferActions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <PendingActionItem action={item} />}
                scrollEnabled={false}
              />
            </View>
          )}

          {/* Actions */}
          <View className="flex-row gap-3 mt-4">
            {onClear && (
              <Button
                variant="outline"
                className="flex-1 border-red-300"
                onPress={() => setShowClearConfirm(true)}
              >
                <Trash2 size={16} className="text-red-600 mr-2" />
                <Text className="text-red-600">Limpar</Text>
              </Button>
            )}
            <Button
              variant="default"
              className="flex-1"
              onPress={onSync}
              disabled={!isOnline || isSyncing}
            >
              <RefreshCw
                size={16}
                className={`text-white mr-2 ${isSyncing ? 'animate-spin' : ''}`}
              />
              <Text className="text-white">{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</Text>
            </Button>
          </View>
        </View>
      </Modal>

      {/* Confirmar limpeza */}
      <ConfirmModal
        visible={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={() => {
          onClear?.();
          setShowClearConfirm(false);
          setShowDetails(false);
        }}
        title="Limpar Ações Pendentes?"
        message="Esta ação irá remover todas as ações pendentes. Os dados não sincronizados serão perdidos."
        confirmText="Limpar"
        confirmVariant="destructive"
      />
    </>
  );
}

function PendingActionItem({ action }: { action: PendingAction }) {
  const hasError = action.retryCount > 0 && action.lastError;

  return (
    <View
      className={`flex-row items-center gap-3 p-3 rounded-lg mb-2 ${
        hasError ? 'bg-red-50' : 'bg-gray-50'
      }`}
    >
      {ACTION_ICONS[action.type] || <AlertCircle size={16} className="text-gray-400" />}

      <View className="flex-1">
        <Text className={`font-medium ${hasError ? 'text-red-700' : 'text-gray-700'}`}>
          {ACTION_LABELS[action.type] || action.type}
        </Text>
        <Text className="text-xs text-gray-500">
          {formatDate(action.createdAt)}
          {action.retryCount > 0 && ` • ${action.retryCount} tentativa(s)`}
        </Text>
        {hasError && (
          <Text className="text-xs text-red-600 mt-1" numberOfLines={1}>
            {action.lastError}
          </Text>
        )}
      </View>

      {hasError ? (
        <AlertCircle size={16} className="text-red-500" />
      ) : (
        <Cloud size={16} className="text-yellow-500" />
      )}
    </View>
  );
}

/**
 * Indicador compacto de queue offline (para header)
 */
export function OfflineQueueBadge({
  count,
  isOnline,
  onPress,
}: {
  count: number;
  isOnline: boolean;
  onPress?: () => void;
}) {
  if (count === 0) return null;

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-1 px-2 py-1 rounded-full ${
        isOnline ? 'bg-yellow-100' : 'bg-gray-100'
      }`}
    >
      {isOnline ? (
        <Cloud size={14} className="text-yellow-600" />
      ) : (
        <CloudOff size={14} className="text-gray-500" />
      )}
      <Text className={`text-xs font-medium ${isOnline ? 'text-yellow-700' : 'text-gray-600'}`}>
        {count}
      </Text>
    </Pressable>
  );
}
