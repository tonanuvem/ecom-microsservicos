import EmailIcon from '@mui/icons-material/Email'
import NotificationsIcon from '@mui/icons-material/Notifications'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import {
  Datagrid, List, Show, SimpleShowLayout, TextField, useRecordContext,
} from 'react-admin'

export const NotificacaoIcon = NotificationsIcon

const TIPO_COLOR = {
  PEDIDO_CONFIRMADO:    'success',
  PAGAMENTO_RECUSADO:   'error',
  PEDIDO_CANCELADO:     'warning',
  BOAS_VINDAS:          'info',
}

const TipoChip = () => {
  const record = useRecordContext()
  if (!record) return null
  return (
    <Chip
      icon={<EmailIcon fontSize="small" />}
      label={record.tipo?.replace(/_/g, ' ')}
      color={TIPO_COLOR[record.tipo] || 'default'}
      size="small"
    />
  )
}

export const NotificacaoList = () => (
  <List perPage={25}>
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TipoChip label="Tipo" />
      <TextField source="destinatario_email" label="Destinatário" />
      <TextField source="tentativas" label="Tentativas" />
      <TextField source="criado_em" label="Criado em" />
    </Datagrid>
  </List>
)

/** Conteúdo notificado: só o detalhe traz o payload (a listagem é enxuta). */
const PayloadField = () => {
  const record = useRecordContext()
  const payload = record?.payload
  if (!payload) return <Typography variant="body2" color="text.secondary">—</Typography>
  return (
    <Box component="pre" sx={{
      m: 0, p: 1.5, borderRadius: 1, bgcolor: '#F8F5FF', fontSize: '.8rem',
      fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    }}>
      {JSON.stringify(payload, null, 2)}
    </Box>
  )
}

export const NotificacaoShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="id" label="ID" />
      <TextField source="tipo" label="Tipo" />
      <TextField source="destinatario_email" label="E-mail" />
      <TextField source="destinatario_nome" label="Nome" emptyText="—" />
      <TextField source="status" label="Status do envio" />
      <TextField source="tentativas" label="Tentativas" />
      <TextField source="criado_em" label="Criado em" />
      <PayloadField label="Payload" />
    </SimpleShowLayout>
  </Show>
)
