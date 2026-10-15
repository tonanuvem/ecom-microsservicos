import CategoryIcon from '@mui/icons-material/Category'
import InventoryIcon from '@mui/icons-material/Inventory'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import {
  Create, Datagrid, Edit, List,
  NumberInput, SimpleForm, TextInput, useDataProvider, useRecordContext,
} from 'react-admin'

export const EstoqueIcon = InventoryIcon

// Busca nome do produto pelo ID
function useProdutoNome(produto_id) {
  const dataProvider = useDataProvider()
  const [nome, setNome] = useState(null)
  useEffect(() => {
    if (!produto_id) return
    dataProvider.getOne('produtos', { id: produto_id })
      .then(({ data }) => setNome(data.nome))
      .catch(() => setNome(null))
  }, [produto_id, dataProvider])
  return nome
}

const ProdutoNomeField = () => {
  const record = useRecordContext()
  const nome = useProdutoNome(record?.produto_id)
  if (!record) return null
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{
        width: 32, height: 32, borderRadius: 1.5,
        bgcolor: 'linear-gradient(135deg, #EDE9FE, #DDD6FE)',
        background: 'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <CategoryIcon sx={{ fontSize: 18, color: '#7C3AED' }} />
      </Box>
      <Box>
        {nome
          ? <Typography variant="body2" fontWeight={600}>{nome}</Typography>
          : <Skeleton width={120} height={18} />
        }
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
          {record.produto_id?.slice(0, 8)}…
        </Typography>
      </Box>
    </Box>
  )
}

const QuantidadeField = () => {
  const record = useRecordContext()
  if (!record) return null
  const qty = record.quantidade || 0
  const pct = Math.min((qty / 100) * 100, 100)
  const color = qty === 0 ? '#EF4444' : qty < 10 ? '#F59E0B' : '#10B981'
  return (
    <Box sx={{ minWidth: 140 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" fontWeight={700}>{qty} un.</Typography>
        {qty < 10 && <WarningAmberIcon sx={{ color: '#F59E0B', fontSize: 16 }} />}
      </Box>
      <LinearProgress variant="determinate" value={pct}
        sx={{ height: 6, borderRadius: 3, bgcolor: '#F1F5F9',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }} />
    </Box>
  )
}

const StatusEstoque = () => {
  const record = useRecordContext()
  if (!record) return null
  const qty = record.quantidade || 0
  if (qty === 0) return <Chip label="Esgotado"   color="error"   size="small" />
  if (qty < 10)  return <Chip label="Baixo"      color="warning" size="small" />
  return               <Chip label="Disponível" color="success" size="small" />
}

export const EstoqueList = () => (
  <List perPage={25}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <ProdutoNomeField label="Produto" />
      <QuantidadeField label="Quantidade" />
      <StatusEstoque label="Status" />
    </Datagrid>
  </List>
)

export const EstoqueCreate = () => (
  <Create redirect="list">
    <SimpleForm>
      <TextInput source="produto_id" label="ID do Produto" required fullWidth />
      <NumberInput source="quantidade" label="Quantidade" required min={0} />
    </SimpleForm>
  </Create>
)

export const EstoqueEdit = () => (
  <Edit redirect="list">
    <SimpleForm>
      <TextInput source="produto_id" label="ID do Produto" required fullWidth />
      <NumberInput source="quantidade" label="Quantidade" required min={0} />
    </SimpleForm>
  </Edit>
)
