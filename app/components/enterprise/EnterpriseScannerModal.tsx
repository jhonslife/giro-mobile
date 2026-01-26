/**
 * Enterprise Scanner Modal
 *
 * Modal que encapsula o scanner de barcode para uso em requisições e transferências.
 * Permite escanear produtos e adicioná-los diretamente.
 */

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, Barcode, Package, Plus, Minus, AlertCircle } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { Button } from '@/components/ui/Button';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useHaptics } from '@/hooks/useHaptics';
import type { Product } from '@/types/product';

export interface ScannedItem {
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  unit: string;
  currentStock?: number;
}

interface EnterpriseScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onAddItem: (item: ScannedItem) => Promise<void>;
  title?: string;
  showStock?: boolean;
  defaultUnit?: string;
}

export function EnterpriseScannerModal({
  visible,
  onClose,
  onAddItem,
  title = 'Escanear Produto',
  showStock = true,
  defaultUnit = 'UN',
}: EnterpriseScannerModalProps) {
  const { getProduct, isConnected } = useWebSocket();
  const { hapticSuccess, hapticError } = useHaptics();

  const [mode, setMode] = useState<'scan' | 'result' | 'manual'>('scan');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Current product state
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [barcode, setBarcode] = useState('');

  // Manual entry state
  const [manualProductName, setManualProductName] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');

  // Handle barcode scan
  const handleScan = useCallback(
    async (scannedBarcode: string) => {
      if (!isConnected) {
        setError('Não conectado ao servidor');
        hapticError();
        return;
      }

      setIsLoading(true);
      setError(null);
      setBarcode(scannedBarcode);

      try {
        const product = await getProduct(scannedBarcode);

        if (product) {
          setCurrentProduct(product);
          setMode('result');
          hapticSuccess();
        } else {
          setError('Produto não encontrado');
          setMode('result');
          hapticError();
        }
      } catch (err) {
        setError((err as Error).message || 'Erro ao buscar produto');
        setMode('result');
        hapticError();
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, getProduct, hapticSuccess, hapticError]
  );

  // Handle add item
  const handleAddItem = async () => {
    const qty = parseFloat(quantity);

    if (qty <= 0) {
      setError('Quantidade deve ser maior que zero');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'manual') {
        // Manual entry
        if (!manualProductName.trim()) {
          setError('Nome do produto é obrigatório');
          setIsLoading(false);
          return;
        }

        await onAddItem({
          productId: '', // Will be generated or matched on server
          productName: manualProductName.trim(),
          barcode: manualBarcode.trim(),
          quantity: qty,
          unit: defaultUnit,
        });
      } else if (currentProduct) {
        // From scanned product
        await onAddItem({
          productId: currentProduct.id,
          productName: currentProduct.name,
          barcode: barcode,
          quantity: qty,
          unit: currentProduct.unit || defaultUnit,
          currentStock: currentProduct.currentStock,
        });
      } else {
        // Scanned but not found - add with barcode only
        await onAddItem({
          productId: '',
          productName: `Produto ${barcode}`,
          barcode: barcode,
          quantity: qty,
          unit: defaultUnit,
        });
      }

      hapticSuccess();
      resetState();
    } catch (err) {
      setError((err as Error).message || 'Erro ao adicionar item');
      hapticError();
    } finally {
      setIsLoading(false);
    }
  };

  // Reset state
  const resetState = () => {
    setMode('scan');
    setCurrentProduct(null);
    setQuantity('1');
    setBarcode('');
    setError(null);
    setManualProductName('');
    setManualBarcode('');
  };

  // Increment/decrement quantity
  const incrementQuantity = () => {
    const current = parseFloat(quantity) || 0;
    setQuantity(String(current + 1));
  };

  const decrementQuantity = () => {
    const current = parseFloat(quantity) || 0;
    if (current > 1) {
      setQuantity(String(current - 1));
    }
  };

  // Handle close
  const handleClose = () => {
    resetState();
    onClose();
  };

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      className="absolute inset-0 bg-black/50 z-50"
    >
      <Animated.View
        entering={SlideInDown.springify().damping(15)}
        exiting={SlideOutDown}
        className="flex-1 mt-20 bg-white rounded-t-3xl overflow-hidden"
      >
        <SafeAreaView className="flex-1" edges={['bottom']}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
            <Text className="text-lg font-bold text-gray-900">{title}</Text>
            <Pressable onPress={handleClose} className="p-2" testID="close-button">
              <X size={24} className="text-gray-600" />
            </Pressable>
          </View>

          {/* Mode Tabs */}
          <View className="flex-row border-b border-gray-200">
            <Pressable
              onPress={() => setMode('scan')}
              className={`flex-1 py-3 items-center ${mode === 'scan' || mode === 'result' ? 'border-b-2 border-blue-600' : ''}`}
            >
              <Barcode
                size={20}
                className={mode === 'scan' || mode === 'result' ? 'text-blue-600' : 'text-gray-400'}
              />
              <Text
                className={`text-sm mt-1 ${mode === 'scan' || mode === 'result' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}
              >
                Escanear
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMode('manual');
                setCurrentProduct(null);
                setError(null);
              }}
              className={`flex-1 py-3 items-center ${mode === 'manual' ? 'border-b-2 border-blue-600' : ''}`}
            >
              <Package
                size={20}
                className={mode === 'manual' ? 'text-blue-600' : 'text-gray-400'}
              />
              <Text
                className={`text-sm mt-1 ${mode === 'manual' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}
              >
                Manual
              </Text>
            </Pressable>
          </View>

          {/* Content */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            {mode === 'scan' && (
              <View className="flex-1">
                <BarcodeScanner onScan={handleScan} isActive={!isLoading} showFlashButton={true} />

                {isLoading && (
                  <View className="absolute inset-0 bg-black/30 items-center justify-center">
                    <View className="bg-white rounded-xl p-6">
                      <Text className="text-gray-600">Buscando produto...</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {mode === 'result' && (
              <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 20 }}>
                {currentProduct ? (
                  <>
                    {/* Product Found */}
                    <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                      <View className="flex-row items-start">
                        <Package size={24} className="text-green-600 mr-3" />
                        <View className="flex-1">
                          <Text className="text-lg font-semibold text-gray-900">
                            {currentProduct.name}
                          </Text>
                          <Text className="text-sm text-gray-500 mt-1">Código: {barcode}</Text>
                          {showStock && currentProduct.currentStock !== undefined && (
                            <Text className="text-sm text-gray-500">
                              Estoque atual: {currentProduct.currentStock}{' '}
                              {currentProduct.unit || defaultUnit}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Quantity Selector */}
                    <View className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                      <Text className="text-sm font-medium text-gray-700 mb-3">Quantidade</Text>
                      <View className="flex-row items-center justify-center">
                        <Pressable
                          onPress={decrementQuantity}
                          className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center"
                        >
                          <Minus size={24} className="text-gray-600" />
                        </Pressable>
                        <TextInput
                          className="w-24 mx-4 text-center text-2xl font-bold text-gray-900"
                          value={quantity}
                          onChangeText={setQuantity}
                          keyboardType="decimal-pad"
                        />
                        <Pressable
                          onPress={incrementQuantity}
                          className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center"
                        >
                          <Plus size={24} className="text-blue-600" />
                        </Pressable>
                      </View>
                      <Text className="text-center text-sm text-gray-500 mt-2">
                        {currentProduct.unit || defaultUnit}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    {/* Product Not Found */}
                    <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                      <View className="flex-row items-start">
                        <AlertCircle size={24} className="text-yellow-600 mr-3" />
                        <View className="flex-1">
                          <Text className="text-lg font-semibold text-gray-900">
                            Produto não encontrado
                          </Text>
                          <Text className="text-sm text-gray-500 mt-1">Código: {barcode}</Text>
                          <Text className="text-sm text-gray-500 mt-2">
                            Você pode adicionar o item manualmente ou escanear outro código.
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Quantity for unknown product */}
                    <View className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                      <Text className="text-sm font-medium text-gray-700 mb-3">
                        Adicionar mesmo assim?
                      </Text>
                      <View className="flex-row items-center justify-center">
                        <Pressable
                          onPress={decrementQuantity}
                          className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center"
                        >
                          <Minus size={24} className="text-gray-600" />
                        </Pressable>
                        <TextInput
                          className="w-24 mx-4 text-center text-2xl font-bold text-gray-900"
                          value={quantity}
                          onChangeText={setQuantity}
                          keyboardType="decimal-pad"
                        />
                        <Pressable
                          onPress={incrementQuantity}
                          className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center"
                        >
                          <Plus size={24} className="text-blue-600" />
                        </Pressable>
                      </View>
                    </View>
                  </>
                )}

                {/* Error Message */}
                {error && (
                  <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                    <Text className="text-red-700 text-center">{error}</Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View className="flex-row gap-3">
                  <Button
                    label="Escanear Outro"
                    onPress={resetState}
                    variant="outline"
                    className="flex-1"
                  />
                  <Button
                    label="Adicionar"
                    onPress={handleAddItem}
                    loading={isLoading}
                    className="flex-1"
                  />
                </View>
              </ScrollView>
            )}

            {mode === 'manual' && (
              <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Manual Entry Form */}
                <View className="gap-4">
                  <View>
                    <Text className="text-sm font-medium text-gray-700 mb-1">
                      Nome do Produto *
                    </Text>
                    <TextInput
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-800"
                      placeholder="Digite o nome do produto"
                      value={manualProductName}
                      onChangeText={setManualProductName}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View>
                    <Text className="text-sm font-medium text-gray-700 mb-1">
                      Código de Barras (opcional)
                    </Text>
                    <TextInput
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-800"
                      placeholder="Digite ou escaneie"
                      value={manualBarcode}
                      onChangeText={setManualBarcode}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  {/* Quantity Selector */}
                  <View className="bg-white border border-gray-200 rounded-xl p-4">
                    <Text className="text-sm font-medium text-gray-700 mb-3">Quantidade</Text>
                    <View className="flex-row items-center justify-center">
                      <Pressable
                        onPress={decrementQuantity}
                        className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center"
                      >
                        <Minus size={24} className="text-gray-600" />
                      </Pressable>
                      <TextInput
                        className="w-24 mx-4 text-center text-2xl font-bold text-gray-900"
                        value={quantity}
                        onChangeText={setQuantity}
                        keyboardType="decimal-pad"
                      />
                      <Pressable
                        onPress={incrementQuantity}
                        className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center"
                      >
                        <Plus size={24} className="text-blue-600" />
                      </Pressable>
                    </View>
                    <Text className="text-center text-sm text-gray-500 mt-2">{defaultUnit}</Text>
                  </View>

                  {/* Error Message */}
                  {error && (
                    <View className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <Text className="text-red-700 text-center">{error}</Text>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View className="flex-row gap-3 mt-4">
                    <Button
                      label="Cancelar"
                      onPress={handleClose}
                      variant="outline"
                      className="flex-1"
                    />
                    <Button
                      label="Adicionar"
                      onPress={handleAddItem}
                      loading={isLoading}
                      className="flex-1"
                    />
                  </View>
                </View>
              </ScrollView>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Animated.View>
    </Animated.View>
  );
}
