// Pagamentos é uma tela de leitura — de propósito.
//
// Um pagamento não nasce no admin: nasce no provedor. O fluxo é
// POST /v1/pagamentos/sessao (cria a cobrança PENDENTE do pedido) e depois
// POST /v1/pagamentos/webhook, que o provedor chama com o resultado e que é o
// único lugar que aprova/recusa, grava o valor cobrado e publica a notificação
// do cliente (PEDIDO_CONFIRMADO / PAGAMENTO_RECUSADO).
//
// Esse registro é idempotente por construção: `pedido_id` e `idempotency_key`
// são únicos, um pedido tem no máximo um pagamento. Um Create no admin
// inventaria uma cobrança que o provedor não reconhece (e esbarraria na
// unicidade), e um Edit deixaria o status do pagamento divergir do pedido sem
// passar pelo webhook — sem notificação e sem referência externa. Por isso o
// serviço não expõe POST /v1/pagamentos nem PUT /v1/pagamentos/{id}: as telas
// de escrita que existiam aqui batiam em 405 depois de preencher o formulário.
// Para simular pagamento em aula, use o webhook (Swagger do serviço ou
// scripts/seed.sh).
import PaymentIcon from '@mui/icons-material/Payment'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import {
  Datagrid, List, Show, SimpleShowLayout, TextField, TopToolbar,
  useRecordContext, useRedirect,
} from 'react-admin'

export const PagamentoIcon = PaymentIcon

const STATUS_COLOR = { PENDENTE: 'warning', APROVADO: 'success', RECUSADO: 'error' }

const StatusChip = () => {
  const record = useRecordContext()
  if (!record) return null
  return <Chip label={record.status} color={STATUS_COLOR[record.status] || 'default'} size="small" />
}

const ValorField = () => {
  const record = useRecordContext()
  if (!record) return null
  return (
    <Typography fontWeight={700} color="primary.main">
      {Number(record.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
    </Typography>
  )
}

export const PagamentoList = () => (
  <List sort={{ field: 'criado_em', order: 'DESC' }} perPage={25}>
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TextField source="pedido_id" label="Pedido" />
      <StatusChip label="Status" source="status" />
      <ValorField label="Valor" source="valor" />
      {/* referencia_ext é o identificador da cobrança no provedor — fica vazio
          enquanto o webhook não chegou. O serviço não tem campo `provedor`. */}
      <TextField source="referencia_ext" label="Referência externa" emptyText="—" />
      <TextField source="criado_em" label="Criado em" />
    </Datagrid>
  </List>
)

/** Atalho para o pedido cobrado: é por ele que se chega ao cliente e aos itens. */
const AcoesPagamento = () => {
  const record   = useRecordContext()
  const redirect = useRedirect()
  if (!record) return null
  return (
    <TopToolbar>
      <Button
        size="small"
        startIcon={<ReceiptLongIcon />}
        onClick={() => redirect('show', 'pedidos', record.pedido_id)}
      >
        Abrir pedido
      </Button>
    </TopToolbar>
  )
}

export const PagamentoShow = () => (
  <Show actions={<AcoesPagamento />}>
    <SimpleShowLayout>
      <TextField source="id" label="ID do pagamento" />
      <TextField source="pedido_id" label="Pedido" />
      <StatusChip label="Status" />
      <ValorField label="Valor cobrado" />
      <TextField source="referencia_ext" label="Referência no provedor" emptyText="—" />
      <TextField source="criado_em" label="Criado em" />
      <Box sx={{ pt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          O resultado do pagamento chega pelo webhook do provedor
          (POST /v1/pagamentos/webhook) — não é editável aqui.
        </Typography>
      </Box>
    </SimpleShowLayout>
  </Show>
)
