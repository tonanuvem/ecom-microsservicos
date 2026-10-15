import PaymentIcon from '@mui/icons-material/Payment'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import {
  Create, Datagrid, Edit, List,
  NumberInput, SimpleForm, TextField, TextInput, useRecordContext,
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
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField source="pedido_id" label="Pedido" />
      <StatusChip label="Status" />
      <ValorField label="Valor" />
      <TextField source="provedor" label="Provedor" />
      <TextField source="criado_em" label="Criado em" />
    </Datagrid>
  </List>
)

export const PagamentoCreate = () => (
  <Create redirect="list">
    <SimpleForm>
      <TextInput source="pedido_id" label="ID do Pedido" required fullWidth />
      <NumberInput source="valor" label="Valor (R$)" required min={0} />
      <TextInput source="provedor" label="Provedor de Pagamento" />
      <TextInput source="idempotency_key" label="Chave de Idempotência" fullWidth />
    </SimpleForm>
  </Create>
)

export const PagamentoEdit = () => (
  <Edit redirect="list">
    <SimpleForm>
      <TextInput source="pedido_id" label="ID do Pedido" fullWidth />
      <NumberInput source="valor" label="Valor (R$)" min={0} />
      <TextInput source="status" label="Status" />
      <TextInput source="provedor" label="Provedor" />
      <TextInput source="referencia_ext" label="Referência Externa" fullWidth />
    </SimpleForm>
  </Edit>
)
