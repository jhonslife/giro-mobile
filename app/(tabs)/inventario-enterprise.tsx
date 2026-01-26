/**
 * Enterprise Inventory Screen - Multi-location inventory for industrial warehouses
 */

import {
  AlertTriangle,
  Building2,
  Check,
  ChevronRight,
  ClipboardList,
  Cloud,
  CloudOff,
  MapPin,
  Play,
  RefreshCw,
  Save,
  ScanLine,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { EmptyState, Loading } from '@/components/ui/Loading';
import { ConfirmModal, Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useHaptics } from '@/hooks/useHaptics';
import { useEnterpriseInventory } from '@/hooks/useEnterpriseInventory';
import { formatQuantity } from '@/lib/utils';
import type { AvailableLocation, EnterpriseInventoryItem } from '@/types/enterprise-inventory';

const LOCATION_TYPE_COLORS = {
  CENTRAL: 'bg-blue-100 text-blue-800',
  FIELD: 'bg-green-100 text-green-800',
  TRANSIT: 'bg-yellow-100 text-yellow-800',
};

export default function EnterpriseInventarioScreen() {
  // Modals
  const [_showLocationPicker, setShowLocationPicker] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCountModal, setShowCountModal] = useState(false);

  // Form state
  const [inventoryName, setInventoryName] = useState('');
  const [countInput, setCountInput] = useState('');
  const [countNotes, setCountNotes] = useState('');
  const [selectedItem, setSelectedItem] = useState<EnterpriseInventoryItem | null>(null);

  const { showToast } = useToast();
  const { hapticSuccess, hapticError, hapticSelection } = useHaptics();

  const {
    currentInventory,
    items,
    availableLocations,
    selectedLocationId,
    summary,
    isLoading,
    isOnline,
    isSyncing,
    pendingCountsCount,
    error,
    loadAvailableLocations,
    selectLocation,
    startInventory,
    countProduct,
    skipProduct,
    finishInventory,
    cancelInventory,
    getNextPendingItem,
  } = useEnterpriseInventory();

  // Handle location selection
  const handleSelectLocation = (location: AvailableLocation) => {
    selectLocation(location.id);
    setShowLocationPicker(false);
    setShowStartModal(true);
    setInventoryName(`Inventário ${location.name} - ${new Date().toLocaleDateString('pt-BR')}`);
  };

  // Start inventory
  const handleStartInventory = async () => {
    if (!selectedLocationId) return;

    try {
      await startInventory(selectedLocationId, inventoryName);
      hapticSuccess();
      setShowStartModal(false);
      showToast({
        type: 'success',
        title: 'Inventário iniciado',
        message: 'Comece a escanear os produtos',
      });
    } catch (err) {
      hapticError();
      showToast({
        type: 'error',
        title: 'Erro ao iniciar',
        message: error || 'Não foi possível iniciar o inventário',
      });
    }
  };

  // Count item
  const handleCountItem = async () => {
    if (!selectedItem || !countInput) return;

    const count = parseFloat(countInput);
    if (isNaN(count) || count < 0) {
      showToast({
        type: 'error',
        title: 'Quantidade inválida',
        message: 'Digite um número válido',
      });
      return;
    }

    try {
      await countProduct(selectedItem.productId, count, countNotes || undefined);
      hapticSuccess();
      setCountInput('');
      setCountNotes('');
      setSelectedItem(null);
      setShowCountModal(false);

      // Auto-select next pending item
      const next = getNextPendingItem();
      if (next) {
        setSelectedItem(next);
        setShowCountModal(true);
      }
    } catch (err) {
      hapticError();
      showToast({
        type: 'error',
        title: 'Erro ao registrar',
        message: 'Não foi possível registrar a contagem',
      });
    }
  };

  // Skip item
  const handleSkipItem = () => {
    if (!selectedItem) return;
    skipProduct(selectedItem.productId);
    hapticSelection();
    setSelectedItem(null);
    setShowCountModal(false);
  };

  // Finish inventory
  const handleFinishInventory = async (applyAdjustments: boolean) => {
    try {
      await finishInventory(applyAdjustments);
      hapticSuccess();
      setShowFinishModal(false);
      showToast({
        type: 'success',
        title: 'Inventário finalizado',
        message: applyAdjustments ? 'Ajustes de estoque aplicados' : 'Inventário salvo sem ajustes',
      });
    } catch (err) {
      hapticError();
      showToast({
        type: 'error',
        title: 'Erro ao finalizar',
        message: 'Não foi possível finalizar o inventário',
      });
    }
  };

  // Cancel inventory
  const handleCancelInventory = async () => {
    try {
      await cancelInventory();
      hapticSelection();
      setShowCancelModal(false);
      showToast({
        type: 'info',
        title: 'Inventário cancelado',
        message: 'Todas as contagens foram descartadas',
      });
    } catch (err) {
      hapticError();
    }
  };

  // Render location item
  const renderLocationItem = ({ item }: { item: AvailableLocation }) => (
    <Pressable onPress={() => handleSelectLocation(item)} className="mb-3 active:scale-[0.98]">
      <Card>
        <CardContent className="flex-row items-center py-4">
          <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-4">
            {item.type === 'CENTRAL' ? (
              <Building2 size={24} className="text-primary" />
            ) : (
              <MapPin size={24} className="text-primary" />
            )}
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-foreground">{item.name}</Text>
            <Text className="text-sm text-muted-foreground">{item.code}</Text>
            {item.contractName && (
              <Text className="text-xs text-muted-foreground mt-1">📋 {item.contractName}</Text>
            )}
          </View>
          <View className="items-end">
            <Badge className={LOCATION_TYPE_COLORS[item.type]}>{item.type}</Badge>
            <Text className="text-sm text-muted-foreground mt-1">{item.itemCount} itens</Text>
          </View>
          <ChevronRight size={20} className="text-muted-foreground ml-2" />
        </CardContent>
      </Card>
    </Pressable>
  );

  // Render inventory item
  const renderInventoryItem = ({ item }: { item: EnterpriseInventoryItem }) => {
    const isCounted = item.status === 'counted';
    const isSkipped = item.status === 'skipped';
    const hasDifference = isCounted && item.difference !== 0;

    return (
      <Pressable
        onPress={() => {
          setSelectedItem(item);
          setCountInput(item.countedQuantity?.toString() || '');
          setShowCountModal(true);
        }}
        className="mb-3 active:scale-[0.98]"
      >
        <Card className={isCounted ? 'border-primary' : isSkipped ? 'border-muted' : ''}>
          <CardContent className="flex-row items-center py-4">
            {/* Status Icon */}
            <View
              className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${
                isCounted
                  ? hasDifference
                    ? 'bg-warning/20'
                    : 'bg-primary/20'
                  : isSkipped
                    ? 'bg-muted'
                    : 'bg-muted/50'
              }`}
            >
              {isCounted ? (
                hasDifference ? (
                  <AlertTriangle size={20} className="text-warning" />
                ) : (
                  <Check size={20} className="text-primary" />
                )
              ) : isSkipped ? (
                <X size={20} className="text-muted-foreground" />
              ) : (
                <ClipboardList size={20} className="text-muted-foreground" />
              )}
            </View>

            {/* Product Info */}
            <View className="flex-1">
              <Text className="font-medium text-foreground" numberOfLines={1}>
                {item.productName}
              </Text>
              <Text className="text-sm text-muted-foreground">
                {item.productCode} • {item.productBarcode || 'Sem código de barras'}
              </Text>
              {item.category && (
                <Badge variant="outline" className="mt-1 self-start">
                  {item.category}
                </Badge>
              )}
            </View>

            {/* Count Info */}
            <View className="items-end ml-2">
              {isCounted ? (
                <>
                  <Text className="text-lg font-bold text-foreground">
                    {formatQuantity(item.countedQuantity!, item.unit)}
                  </Text>
                  {hasDifference && (
                    <Text
                      className={`text-sm font-medium ${
                        item.difference > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {item.difference > 0 ? '+' : ''}
                      {item.difference}
                    </Text>
                  )}
                </>
              ) : (
                <Text className="text-sm text-muted-foreground">
                  Esperado: {formatQuantity(item.expectedQuantity, item.unit)}
                </Text>
              )}
            </View>
          </CardContent>
        </Card>
      </Pressable>
    );
  };

  // Loading state
  if (isLoading && !currentInventory) {
    return <Loading text="Carregando..." />;
  }

  // No active inventory - show location picker
  if (!currentInventory) {
    return (
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="p-4 border-b border-border">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-foreground">Inventário Enterprise</Text>
              <Text className="text-muted-foreground">Selecione um local para inventariar</Text>
            </View>
            {/* Connection Status */}
            <View className="flex-row items-center">
              {isOnline ? (
                <Cloud size={20} className="text-green-500" />
              ) : (
                <CloudOff size={20} className="text-yellow-500" />
              )}
            </View>
          </View>
        </View>

        {/* Location List */}
        <FlatList
          data={availableLocations}
          keyExtractor={(item) => item.id}
          renderItem={renderLocationItem}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <EmptyState
              icon={<MapPin size={48} className="text-muted-foreground" />}
              title="Nenhum local disponível"
              description="Conecte-se ao GIRO Desktop para carregar os locais de estoque"
            />
          }
          ListHeaderComponent={
            <Button variant="outline" onPress={loadAvailableLocations} className="mb-4">
              <RefreshCw size={16} className="mr-2" />
              <Text>Atualizar Locais</Text>
            </Button>
          }
        />
      </View>
    );
  }

  // Active inventory view
  return (
    <View className="flex-1 bg-background">
      {/* Header with inventory info */}
      <View className="p-4 border-b border-border bg-card">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1">
            <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
              {currentInventory.name}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {currentInventory.location.locationName}
            </Text>
          </View>
          {/* Connection & Sync Status */}
          <View className="flex-row items-center gap-2">
            {pendingCountsCount > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800">
                {pendingCountsCount} pendente{pendingCountsCount > 1 ? 's' : ''}
              </Badge>
            )}
            {isSyncing ? (
              <RefreshCw size={20} className="text-primary animate-spin" />
            ) : isOnline ? (
              <Cloud size={20} className="text-green-500" />
            ) : (
              <CloudOff size={20} className="text-yellow-500" />
            )}
          </View>
        </View>

        {/* Progress */}
        <View className="flex-row items-center gap-4">
          <View className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <View
              className="h-full bg-primary rounded-full"
              style={{ width: `${summary.completionPercentage}%` }}
            />
          </View>
          <Text className="text-sm font-medium text-foreground">
            {summary.completionPercentage}%
          </Text>
        </View>

        {/* Quick Stats */}
        <View className="flex-row mt-3 gap-4">
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-foreground">{summary.countedProducts}</Text>
            <Text className="text-xs text-muted-foreground">Contados</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-foreground">{summary.pendingProducts}</Text>
            <Text className="text-xs text-muted-foreground">Pendentes</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-warning">
              {summary.productsWithDifference}
            </Text>
            <Text className="text-xs text-muted-foreground">Divergentes</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row p-4 gap-2 border-b border-border">
        <Button
          variant="default"
          className="flex-1"
          onPress={() => {
            const next = getNextPendingItem();
            if (next) {
              setSelectedItem(next);
              setShowCountModal(true);
            } else {
              showToast({
                type: 'info',
                title: 'Tudo contado!',
                message: 'Não há itens pendentes',
              });
            }
          }}
        >
          <ScanLine size={16} className="mr-2" />
          <Text className="text-primary-foreground font-medium">Escanear</Text>
        </Button>
        <Button
          variant="outline"
          onPress={() => setShowFinishModal(true)}
          disabled={summary.countedProducts === 0}
        >
          <Save size={16} className="mr-2" />
          <Text>Finalizar</Text>
        </Button>
        <Button variant="ghost" onPress={() => setShowCancelModal(true)}>
          <X size={16} className="text-destructive" />
        </Button>
      </View>

      {/* Items List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderInventoryItem}
        contentContainerStyle={{ padding: 16 }}
      />

      {/* Count Modal */}
      <Modal
        visible={showCountModal}
        onClose={() => {
          setShowCountModal(false);
          setSelectedItem(null);
          setCountInput('');
          setCountNotes('');
        }}
        title="Registrar Contagem"
      >
        {selectedItem && (
          <View className="gap-4">
            <View>
              <Text className="text-lg font-semibold text-foreground">
                {selectedItem.productName}
              </Text>
              <Text className="text-muted-foreground">{selectedItem.productCode}</Text>
              <Text className="text-sm text-muted-foreground mt-1">
                Esperado: {formatQuantity(selectedItem.expectedQuantity, selectedItem.unit)}
              </Text>
            </View>

            <Input
              label="Quantidade Contada"
              value={countInput}
              onChangeText={setCountInput}
              keyboardType="numeric"
              placeholder="0"
              autoFocus
            />

            <Input
              label="Observações (opcional)"
              value={countNotes}
              onChangeText={setCountNotes}
              placeholder="Ex: Produto danificado, embalagem aberta..."
              multiline
            />

            <View className="flex-row gap-2 mt-2">
              <Button variant="outline" onPress={handleSkipItem} className="flex-1">
                <Text>Pular</Text>
              </Button>
              <Button onPress={handleCountItem} className="flex-1">
                <Check size={16} className="mr-2" />
                <Text className="text-primary-foreground">Confirmar</Text>
              </Button>
            </View>
          </View>
        )}
      </Modal>

      {/* Start Modal */}
      <Modal
        visible={showStartModal}
        onClose={() => setShowStartModal(false)}
        title="Iniciar Inventário"
      >
        <View className="gap-4">
          <Input
            label="Nome do Inventário"
            value={inventoryName}
            onChangeText={setInventoryName}
            placeholder="Ex: Inventário Mensal - Janeiro"
          />
          <Button onPress={handleStartInventory}>
            <Play size={16} className="mr-2" />
            <Text className="text-primary-foreground">Iniciar</Text>
          </Button>
        </View>
      </Modal>

      {/* Finish Modal */}
      <ConfirmModal
        visible={showFinishModal}
        onClose={() => setShowFinishModal(false)}
        title="Finalizar Inventário"
        message={`${summary.countedProducts} produtos contados, ${summary.productsWithDifference} com divergência. Deseja aplicar os ajustes de estoque?`}
        confirmText="Aplicar Ajustes"
        cancelText="Salvar sem Ajustes"
        onConfirm={() => handleFinishInventory(true)}
        onCancel={() => handleFinishInventory(false)}
      />

      {/* Cancel Modal */}
      <ConfirmModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancelar Inventário"
        message="Todas as contagens serão descartadas. Esta ação não pode ser desfeita."
        confirmText="Cancelar Inventário"
        onConfirm={handleCancelInventory}
        variant="destructive"
      />
    </View>
  );
}
