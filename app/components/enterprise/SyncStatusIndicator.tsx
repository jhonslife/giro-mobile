/**
 * Offline Sync Status Indicator Component
 * Shows connection status and pending sync count with auto-sync trigger
 */

import { Cloud, CloudOff, RefreshCw, WifiOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

interface SyncStatusIndicatorProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt?: Date | null;
  onSync: () => Promise<void>;
}

export function SyncStatusIndicator({
  isOnline,
  isSyncing,
  pendingCount,
  lastSyncAt,
  onSync,
}: SyncStatusIndicatorProps) {
  const { showToast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);

  // Rotate animation for syncing
  useEffect(() => {
    if (isSyncing || syncing) {
      rotation.value = withRepeat(withTiming(360, { duration: 1000 }), -1, false);
    } else {
      rotation.value = 0;
    }
  }, [isSyncing, syncing, rotation]);

  // Pulse animation for pending items
  useEffect(() => {
    if (pendingCount > 0 && !isSyncing) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.1, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1,
        true
      );
    } else {
      pulse.value = 1;
    }
  }, [pendingCount, isSyncing, pulse]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animatedBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const handleSync = async () => {
    if (!isOnline || isSyncing || syncing || pendingCount === 0) return;

    setSyncing(true);
    try {
      await onSync();
      showToast({
        type: 'success',
        title: 'Sincronizado',
        message: `${pendingCount} contagens enviadas`,
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erro ao sincronizar',
        message: 'Tente novamente mais tarde',
      });
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = () => {
    if (!lastSyncAt) return 'Nunca';
    const now = new Date();
    const diff = now.getTime() - lastSyncAt.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}min atrás`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    return lastSyncAt.toLocaleDateString('pt-BR');
  };

  return (
    <Pressable
      onPress={handleSync}
      disabled={!isOnline || isSyncing || syncing || pendingCount === 0}
      className="flex-row items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border active:bg-accent"
    >
      {/* Connection Status Icon */}
      {isOnline ? (
        isSyncing || syncing ? (
          <Animated.View style={animatedIconStyle}>
            <RefreshCw size={18} className="text-primary" />
          </Animated.View>
        ) : (
          <Cloud size={18} className="text-green-500" />
        )
      ) : (
        <CloudOff size={18} className="text-yellow-500" />
      )}

      {/* Status Text */}
      <View className="flex-1">
        <Text className="text-sm font-medium text-foreground">
          {isOnline ? (isSyncing || syncing ? 'Sincronizando...' : 'Conectado') : 'Offline'}
        </Text>
        <Text className="text-xs text-muted-foreground">Sync: {formatLastSync()}</Text>
      </View>

      {/* Pending Count Badge */}
      {pendingCount > 0 && (
        <Animated.View style={animatedBadgeStyle}>
          <Badge
            className={`${
              isOnline ? 'bg-primary text-primary-foreground' : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {pendingCount}
          </Badge>
        </Animated.View>
      )}
    </Pressable>
  );
}

/**
 * Minimal inline status for headers
 */
interface InlineSyncStatusProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
}

export function InlineSyncStatus({ isOnline, isSyncing, pendingCount }: InlineSyncStatusProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isSyncing) {
      rotation.value = withRepeat(withTiming(360, { duration: 1000 }), -1, false);
    } else {
      rotation.value = 0;
    }
  }, [isSyncing, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View className="flex-row items-center gap-1">
      {pendingCount > 0 && (
        <Badge variant="outline" className={isOnline ? 'border-primary' : 'border-yellow-500'}>
          <Text className={`text-xs ${isOnline ? 'text-primary' : 'text-yellow-600'}`}>
            {pendingCount}
          </Text>
        </Badge>
      )}
      {isSyncing ? (
        <Animated.View style={animatedStyle}>
          <RefreshCw size={16} className="text-primary" />
        </Animated.View>
      ) : isOnline ? (
        <Cloud size={16} className="text-green-500" />
      ) : (
        <WifiOff size={16} className="text-yellow-500" />
      )}
    </View>
  );
}

/**
 * Offline Banner for full-width display
 */
interface OfflineBannerProps {
  isOnline: boolean;
  pendingCount: number;
  onRetry?: () => void;
}

export function OfflineBanner({ isOnline, pendingCount, onRetry }: OfflineBannerProps) {
  if (isOnline) return null;

  return (
    <View className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <WifiOff size={16} className="text-yellow-600" />
        <Text className="text-sm text-yellow-800">
          Modo offline • {pendingCount > 0 ? `${pendingCount} pendentes` : 'Salvo localmente'}
        </Text>
      </View>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          className="px-3 py-1 bg-yellow-200 rounded-md active:bg-yellow-300"
        >
          <Text className="text-xs font-medium text-yellow-800">Reconectar</Text>
        </Pressable>
      )}
    </View>
  );
}
