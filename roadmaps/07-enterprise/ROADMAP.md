# 🏢 Enterprise Mobile - Roadmap de Melhorias

> **Projeto**: GIRO Mobile  
> **Responsabilidade**: Funcionalidades Enterprise (Requisições, Transferências, Aprovações)  
> **Criado**: 25 de Janeiro de 2026

---

## 📋 Resumo Executivo

Este roadmap detalha as melhorias necessárias para completar a integração Enterprise do GIRO Mobile, permitindo que almoxarifes e encarregados de obra realizem operações de requisição, transferência e inventário diretamente do celular.

---

## 🎯 Objetivos

| Objetivo                  | Descrição                               | Prioridade |
| ------------------------- | --------------------------------------- | ---------- |
| **Requisições Mobile**    | Criar e aprovar requisições de material | 🔴 Alta    |
| **Transferências Mobile** | Gerenciar transferências entre locais   | 🔴 Alta    |
| **Dashboard Enterprise**  | Visão consolidada para gestores         | 🟡 Média   |
| **Offline Robusto**       | Queue visual e sync confiável           | 🟡 Média   |
| **Notificações**          | Alertas de aprovações pendentes         | 🟢 Baixa   |

---

## 📊 Estado Atual vs Desejado

| Feature                   | Estado Atual    | Estado Desejado       |
| ------------------------- | --------------- | --------------------- |
| Inventário Multi-Local    | ✅ Implementado | ✅ Completo           |
| Sync Offline Inventário   | ✅ Implementado | ✅ Corrigido          |
| Requisições de Material   | ✅ Implementado | ✅ CRUD completo      |
| Aprovação de Requisições  | ✅ Implementado | ✅ Com notificações   |
| Transferências de Estoque | ✅ Implementado | ✅ CRUD completo      |
| Dashboard Enterprise      | ✅ Implementado | ✅ Métricas e alertas |
| Seletor de Contrato       | ✅ Implementado | ✅ Filtro global      |
| Scanner Otimizado         | ✅ Básico       | 🔄 Modo contínuo      |
| Offline Queue Visual      | ✅ Implementado | ✅ Com detalhes       |

---

## ✅ PROGRESSO DA IMPLEMENTAÇÃO

### Concluído em 25/01/2026:

| Task    | Descrição                   | Status |
| ------- | --------------------------- | ------ |
| ENT-001 | TypeScript types            | ✅     |
| ENT-002 | enterpriseContextStore      | ✅     |
| ENT-004 | useMaterialRequests hook    | ✅     |
| ENT-006 | RequestCard component       | ✅     |
| ENT-006 | ApprovalActions component   | ✅     |
| ENT-007 | useStockTransfers hook      | ✅     |
| ENT-008 | TransferCard component      | ✅     |
| ENT-008 | TransferActions component   | ✅     |
| ENT-011 | OfflineQueue component      | ✅     |
| ENT-005 | Tela requisicoes.tsx        | ✅     |
| ENT-008 | Tela transferencias.tsx     | ✅     |
| ENT-009 | Dashboard Enterprise        | ✅     |

### Pendente:

| Task    | Descrição                   | Status     |
| ------- | --------------------------- | ---------- |
| ENT-003 | Desktop WebSocket handlers  | ⬜ Pending |
| ENT-010 | Push Notifications          | ⬜ Pending |
| ENT-012 | Scanner modo contínuo       | ⬜ Pending |

---

## 🏗️ Arquitetura Proposta

```
app/
├── (tabs)/
│   ├── index.tsx                    # Home/Scanner
│   ├── estoque.tsx                  # Consulta estoque
│   ├── inventario.tsx               # Inventário varejo
│   ├── inventario-enterprise.tsx    # ✅ Inventário multi-local
│   ├── requisicoes.tsx              # 🆕 Requisições de material
│   ├── transferencias.tsx           # 🆕 Transferências de estoque
│   ├── dashboard-enterprise.tsx     # 🆕 Dashboard gestor
│   ├── validade.tsx                 # Controle validade
│   └── configuracoes.tsx            # Configurações
│
├── components/
│   ├── enterprise/
│   │   ├── SyncStatusIndicator.tsx  # ✅ Existente
│   │   ├── ContractPicker.tsx       # 🆕 Seletor de contrato
│   │   ├── LocationSelector.tsx     # 🆕 Seletor de local
│   │   ├── RequestCard.tsx          # 🆕 Card de requisição
│   │   ├── RequestItemRow.tsx       # 🆕 Item da requisição
│   │   ├── TransferCard.tsx         # 🆕 Card de transferência
│   │   ├── ApprovalActions.tsx      # 🆕 Botões aprovar/rejeitar
│   │   ├── OfflineQueue.tsx         # 🆕 Visualização queue
│   │   └── EnterpriseDashboard.tsx  # 🆕 Widgets do dashboard
│   │
├── hooks/
│   ├── useEnterpriseInventory.ts    # ✅ Existente
│   ├── useMaterialRequests.ts       # 🆕 CRUD requisições
│   ├── useStockTransfers.ts         # 🆕 CRUD transferências
│   ├── useEnterpriseContracts.ts    # 🆕 Lista contratos
│   ├── useApprovals.ts              # 🆕 Fluxo aprovações
│   └── useEnterpriseNotifications.ts # 🆕 Push notifications
│
├── stores/
│   ├── enterpriseInventoryStore.ts  # ✅ Existente
│   ├── requestsStore.ts             # 🆕 Estado requisições
│   ├── transfersStore.ts            # 🆕 Estado transferências
│   └── enterpriseContextStore.ts    # 🆕 Contrato/obra ativo
│
└── types/
    ├── enterprise-inventory.ts      # ✅ Existente
    ├── material-request.ts          # 🆕 Tipos requisição
    ├── stock-transfer.ts            # 🆕 Tipos transferência
    └── enterprise-context.ts        # 🆕 Contexto enterprise
```

---

## 📅 Sprints de Implementação

### Sprint 1: Tipos e Infraestrutura (2 dias)

#### ENT-001: Tipos TypeScript para Enterprise

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 2h

**Arquivos**:

- `app/types/material-request.ts`
- `app/types/stock-transfer.ts`
- `app/types/enterprise-context.ts`

```typescript
// material-request.ts
export interface MaterialRequest {
  id: string;
  requestNumber: string;
  contractId: string;
  contractCode: string;
  requesterId: string;
  requesterName: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status:
    | 'DRAFT'
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED'
    | 'SEPARATING'
    | 'READY'
    | 'DELIVERED'
    | 'CANCELLED';
  notes?: string;
  items: MaterialRequestItem[];
  createdAt: string;
  approvedAt?: string;
  approvedById?: string;
  approvedByName?: string;
}

export interface MaterialRequestItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  unit: string;
  requestedQuantity: number;
  approvedQuantity?: number;
  deliveredQuantity?: number;
  notes?: string;
}
```

---

#### ENT-002: Store de Contexto Enterprise

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 1h

**Arquivo**: `app/stores/enterpriseContextStore.ts`

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface EnterpriseContextState {
  // Current context
  activeContractId: string | null;
  activeContractCode: string | null;
  activeContractName: string | null;
  activeLocationId: string | null;
  activeLocationName: string | null;

  // User role
  userRole: 'ALMOXARIFE' | 'ENCARREGADO' | 'SUPERVISOR' | 'GESTOR' | null;
  canApprove: boolean;
  approvalLimit: number;

  // Actions
  setActiveContract: (id: string, code: string, name: string) => void;
  setActiveLocation: (id: string, name: string) => void;
  setUserRole: (role: string, canApprove: boolean, limit: number) => void;
  clearContext: () => void;
}
```

---

#### ENT-003: Handlers WebSocket no Desktop

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 3h

**Arquivo**: `GIRO/apps/desktop/src-tauri/src/services/mobile_handlers/enterprise.rs`

**Ações a implementar**:

```rust
// Requisições
"enterprise.request.list" -> list_material_requests
"enterprise.request.get" -> get_material_request
"enterprise.request.create" -> create_material_request
"enterprise.request.submit" -> submit_material_request
"enterprise.request.approve" -> approve_material_request
"enterprise.request.reject" -> reject_material_request

// Transferências
"enterprise.transfer.list" -> list_stock_transfers
"enterprise.transfer.get" -> get_stock_transfer
"enterprise.transfer.create" -> create_stock_transfer
"enterprise.transfer.approve" -> approve_stock_transfer
"enterprise.transfer.ship" -> ship_stock_transfer
"enterprise.transfer.receive" -> receive_stock_transfer

// Dashboard
"enterprise.dashboard" -> get_enterprise_dashboard
"enterprise.contracts" -> list_contracts
"enterprise.locations" -> list_locations
```

---

### Sprint 2: Hooks e Tela de Requisições (3 dias)

#### ENT-004: Hook useMaterialRequests

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 3h

**Arquivo**: `app/hooks/useMaterialRequests.ts`

```typescript
interface UseMaterialRequestsResult {
  // State
  requests: MaterialRequest[];
  currentRequest: MaterialRequest | null;
  isLoading: boolean;
  error: string | null;
  pendingActionsCount: number;

  // Actions
  loadRequests: (filters?: RequestFilters) => Promise<void>;
  loadRequest: (id: string) => Promise<void>;
  createRequest: (data: CreateRequestInput) => Promise<string>;
  addItem: (requestId: string, item: AddItemInput) => Promise<void>;
  removeItem: (requestId: string, itemId: string) => Promise<void>;
  submitRequest: (requestId: string) => Promise<void>;
  approveRequest: (requestId: string, notes?: string) => Promise<void>;
  rejectRequest: (requestId: string, reason: string) => Promise<void>;

  // Offline
  syncPendingActions: () => Promise<void>;
}
```

---

#### ENT-005: Tela de Requisições

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 4h

**Arquivo**: `app/(tabs)/requisicoes.tsx`

**Funcionalidades**:

- Lista de requisições com filtros (status, período)
- Criar nova requisição com scanner
- Ver detalhes da requisição
- Aprovar/Rejeitar (se tiver permissão)
- Badge com pendentes

---

#### ENT-006: Componentes de Requisição

- **Prioridade**: 🟡 Alta
- **Estimativa**: 2h

**Arquivos**:

- `app/components/enterprise/RequestCard.tsx`
- `app/components/enterprise/RequestItemRow.tsx`
- `app/components/enterprise/ApprovalActions.tsx`

---

### Sprint 3: Transferências e Dashboard (3 dias)

#### ENT-007: Hook useStockTransfers

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 3h

**Arquivo**: `app/hooks/useStockTransfers.ts`

---

#### ENT-008: Tela de Transferências

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 4h

**Arquivo**: `app/(tabs)/transferencias.tsx`

**Funcionalidades**:

- Lista de transferências (origem/destino)
- Criar transferência com scanner
- Confirmar recebimento
- Workflow visual (etapas)

---

#### ENT-009: Dashboard Enterprise

- **Prioridade**: 🟡 Média
- **Estimativa**: 3h

**Arquivo**: `app/(tabs)/dashboard-enterprise.tsx`

**Widgets**:

- Requisições pendentes de aprovação
- Transferências em trânsito
- Estoque baixo por localização
- Últimas movimentações

---

### Sprint 4: UX e Polimento (2 dias)

#### ENT-010: Notificações Locais

- **Prioridade**: 🟢 Baixa
- **Estimativa**: 2h

**Arquivo**: `app/hooks/useEnterpriseNotifications.ts`

- Expo Notifications para alertas
- Vibração em aprovações pendentes
- Badge no ícone do app

---

#### ENT-011: Queue Offline Visual

- **Prioridade**: 🟡 Média
- **Estimativa**: 2h

**Arquivo**: `app/components/enterprise/OfflineQueue.tsx`

- Mostrar ações pendentes
- Retry manual
- Limpar falhas

---

#### ENT-012: Scanner Modo Contínuo

- **Prioridade**: 🟢 Baixa
- **Estimativa**: 2h

- Escanear múltiplos itens em sequência
- Som/vibração para cada scan
- Lista de itens escaneados

---

## 📈 Métricas de Sucesso

| Métrica                     | Meta   |
| --------------------------- | ------ |
| Tempo para criar requisição | < 30s  |
| Taxa de sync offline        | > 99%  |
| Aprovações via mobile       | > 70%  |
| Crashes                     | < 0.1% |

---

## 🧪 Testes Necessários

| Categoria     | Arquivos                                        | Cobertura Meta |
| ------------- | ----------------------------------------------- | -------------- |
| Unit - Hooks  | `__tests__/hooks/useMaterialRequests.test.ts`   | 80%            |
| Unit - Stores | `__tests__/stores/requestsStore.test.ts`        | 80%            |
| Integration   | `__tests__/integration/enterprise-flow.test.ts` | 60%            |
| E2E           | `e2e/enterprise.spec.ts`                        | 40%            |

---

## 🔗 Dependências do Desktop

Para que o mobile funcione, o desktop precisa ter:

1. ✅ `sync_mobile_counts` - Corrigido nesta sessão
2. ⬜ Handlers WebSocket para requisições
3. ⬜ Handlers WebSocket para transferências
4. ⬜ Handler para dashboard enterprise
5. ⬜ Broadcast de eventos (aprovações em tempo real)

---

## 📝 Próximos Passos Imediatos

1. **Criar tipos TypeScript** (ENT-001) - 2h
2. **Criar store de contexto** (ENT-002) - 1h
3. **Implementar handler enterprise no desktop** (ENT-003) - 3h
4. **Criar hook useMaterialRequests** (ENT-004) - 3h
5. **Criar tela de requisições** (ENT-005) - 4h

**Total estimado Sprint 1-2**: ~16h de desenvolvimento

---

_Roadmap gerado em 25/01/2026 pelo Agente Enterprise_
