import BlockIcon from '@mui/icons-material/Block'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom'
import InventoryIcon from '@mui/icons-material/Inventory'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import PersonIcon from '@mui/icons-material/Person'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useMemo, useState } from 'react'
import {
  Create, Datagrid, Edit, EditButton, List, NumberInput, Show,
  SimpleForm, TextInput, TopToolbar, useGetList, useListContext,
  useRecordContext, useRedirect,
} from 'react-admin'
import { BarraFiltros, ListaLocal } from '../components/comuns'
import { brl, formatarData, tempoRelativo } from '../formatos'
import { LISTA_TUDO, useProdutosMap, useUsuariosMap } from '../hooks'

export const PedidoIcon = ReceiptLongIcon

const STATUS_META = {
  PENDENTE:   { cor: '#fab219', label: 'Pendente',   icone: <HourglassBottomIcon sx={{ fontSize: 16 }} /> },
  CONFIRMADO: { cor: '#0ca30c', label: 'Confirmado', icone: <CheckCircleIcon sx={{ fontSize: 16 }} /> },
  CANCELADO:  { cor: '#d03b3b', label: 'Cancelado',  icone: <BlockIcon sx={{ fontSize: 16 }} /> },
  ENTREGUE:   { cor: '#2a78d6', label: 'Entregue',   icone: <LocalShippingIcon sx={{ fontSize: 16 }} /> },
}

const meta = (status) => STATUS_META[status] || { cor: '#64748B', label: status || '—', icone: null }

/** Chip de status: cor + ícone + rótulo (nunca só a cor). */
export function StatusPedido({ status, size = 'small' }) {
  const m = meta(status)
  return (
    <Chip
      size={size}
      icon={m.icone ? <Box sx={{ display: 'flex', color: '#fff !important', ml: .5 }}>{m.icone}</Box> : undefined}
      label={m.label}
      sx={{ bgcolor: m.cor, color: '#fff', fontWeight: 700 }}
    />
  )
}

const StatusChip = () => {
  const record = useRecordContext()
  return record ? <StatusPedido status={record.status} /> : null
}

const TotalField = () => {
  const record = useRecordContext()
  if (!record) return null
  return (
    <Typography fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
      {brl(record.total)}
    </Typography>
  )
}

/** Identificador curto + data, com cópia do UUID completo. */
const PedidoRefField = () => {
  const record = useRecordContext()
  if (!record) return null
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: .5 }}>
        <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
          #{record.id.slice(0, 8)}
        </Typography>
        <Tooltip title="Copiar ID completo">
          <IconButton
            size="small"
            onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(record.id) }}
          >
            <ContentCopyIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Typography variant="caption" color="text.secondary">
        {formatarData(record.criado_em)}
      </Typography>
    </Box>
  )
}

const ClienteField = ({ usuarios }) => {
  const record = useRecordContext()
  if (!record) return null
  const u = usuarios[record.usuario_id]
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Avatar sx={{ width: 28, height: 28, bgcolor: '#EDE9FE', color: '#5B21B6', fontSize: 13, fontWeight: 700 }}>
        {(u?.nome || '?').charAt(0).toUpperCase()}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {u?.nome || `${record.usuario_id.slice(0, 8)}…`}
        </Typography>
        {u?.email && <Typography variant="caption" color="text.secondary" noWrap>{u.email}</Typography>}
      </Box>
    </Box>
  )
}

/** Itens do pedido direto na linha: quantidade + prévia dos produtos. */
const ItensField = () => {
  const record = useRecordContext()
  if (!record) return null
  const itens = record.itens || []
  const unidades = itens.reduce((a, i) => a + (Number(i.quantidade) || 0), 0)
  const resumo = itens.map(i => `${i.quantidade}× ${i.nome_produto}`).join(' · ')
  return (
    <Tooltip title={resumo || 'Sem itens'}>
      <Box sx={{ maxWidth: 260 }}>
        <Chip size="small" variant="outlined" color="primary"
          label={`${itens.length} ${itens.length === 1 ? 'item' : 'itens'} · ${unidades} un.`} />
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {resumo || '—'}
        </Typography>
      </Box>
    </Tooltip>
  )
}

/** Detalhe expandido na própria linha da lista. */
const PedidoExpand = () => {
  const record = useRecordContext()
  const itens = record?.itens || []
  if (!itens.length) return <Typography p={2} variant="body2" color="text.secondary">Sem itens</Typography>
  return (
    <Box sx={{ py: 1.5, px: 2, bgcolor: '#F8F5FF' }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={1}>
        ITENS DO PEDIDO
      </Typography>
      <TabelaItens itens={itens} total={record.total} />
    </Box>
  )
}

/** Tabela de itens reaproveitada pela linha expandida e pela tela de detalhe. */
export function TabelaItens({ itens, total, produtos = {}, onAbrirProduto }) {
  const subtotal = itens.reduce((a, i) => a + Number(i.preco_unit) * Number(i.quantidade), 0)
  return (
    <Table size="small" sx={{ mt: .5 }}>
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 700, fontSize: '.75rem' }}>Produto</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '.75rem' }}>Qtd</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '.75rem' }}>Preço unit.</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '.75rem' }}>Subtotal</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {itens.map((item, i) => {
          const prod = produtos[item.produto_id]
          return (
            <TableRow
              key={i}
              hover={!!onAbrirProduto}
              sx={{ cursor: onAbrirProduto ? 'pointer' : 'default' }}
              onClick={onAbrirProduto ? () => onAbrirProduto(item.produto_id) : undefined}
            >
              <TableCell sx={{ fontSize: '.8rem' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: 1.5, overflow: 'hidden', flexShrink: 0,
                    border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)',
                  }}>
                    {prod?.imagem_url
                      ? <Box component="img" src={prod.imagem_url} alt=""
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => { e.target.style.display = 'none' }} />
                      : <InventoryIcon sx={{ fontSize: 18, color: '#7C3AED' }} />}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600}>{item.nome_produto}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {String(item.produto_id).slice(0, 8)}…
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: '.8rem', fontVariantNumeric: 'tabular-nums' }}>
                {item.quantidade}
              </TableCell>
              <TableCell align="right" sx={{ fontSize: '.8rem', fontVariantNumeric: 'tabular-nums' }}>
                {brl(item.preco_unit)}
              </TableCell>
              <TableCell align="right" sx={{ fontSize: '.8rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {brl(item.preco_unit * item.quantidade)}
              </TableCell>
            </TableRow>
          )
        })}
        <TableRow>
          <TableCell colSpan={3} align="right" sx={{ fontWeight: 700, border: 0 }}>Soma dos itens</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700, border: 0, fontVariantNumeric: 'tabular-nums' }}>
            {brl(subtotal)}
          </TableCell>
        </TableRow>
        {total != null && Math.abs(subtotal - Number(total)) > 0.01 && (
          <TableRow>
            <TableCell colSpan={4} sx={{ border: 0, pt: 0 }}>
              <Alert severity="warning" sx={{ py: 0 }}>
                Total gravado no pedido ({brl(total)}) difere da soma dos itens ({brl(subtotal)}).
              </Alert>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

const FILTROS_STATUS = ['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'ENTREGUE']

function PedidosConteudo({ usuarios }) {
  const [busca, setBusca]   = useState('')
  const [status, setStatus] = useState([])

  const filtrar = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return (p) => {
      if (status.length && !status.includes(p.status)) return false
      if (!q) return true
      const u = usuarios[p.usuario_id]
      const alvo = [
        p.id, p.usuario_id, u?.nome, u?.email, p.status,
        ...(p.itens || []).map(i => i.nome_produto),
      ].join(' ').toLowerCase()
      return alvo.includes(q)
    }
  }, [busca, status, usuarios])

  const alternar = (s) => setStatus(a => (a.includes(s) ? a.filter(x => x !== s) : [...a, s]))

  return (
    <ListaLocal filtrar={filtrar}>
      <BarraFiltros
        busca={busca}
        setBusca={setBusca}
        placeholder="Buscar por pedido, cliente ou produto…"
        chips={FILTROS_STATUS.map(s => ({
          valor: s, rotulo: STATUS_META[s].label, ativo: status.includes(s), onClick: () => alternar(s),
        }))}
        resumo={<ResumoLista />}
      />
      <Datagrid rowClick="show" bulkActionButtons={false} expand={<PedidoExpand />}>
        <PedidoRefField label="Pedido" source="criado_em" />
        <ClienteField label="Cliente" usuarios={usuarios} source="usuario_id" />
        <ItensField label="Itens" />
        <StatusChip label="Status" source="status" />
        <TotalField label="Total" source="total" />
      </Datagrid>
    </ListaLocal>
  )
}

/** Contagem e soma do que está visível após os filtros. */
function ResumoLista() {
  const { data = [], total = 0 } = useListContext()
  const soma = data.reduce((a, p) => a + (Number(p.total) || 0), 0)
  return `${total} pedido(s) · ${brl(soma)} nesta página`
}

export const PedidoList = () => {
  const usuarios = useUsuariosMap()
  return (
    // perPage alto: a busca cruza nome/e-mail do cliente (serviço de usuários) e
    // os produtos de cada pedido, então filtramos a coleção inteira no cliente.
    <List sort={{ field: 'criado_em', order: 'DESC' }} perPage={1000} pagination={false} exporter={exportarPedidos}>
      <PedidosConteudo usuarios={usuarios} />
    </List>
  )
}

/** CSV com uma linha por item — formato útil para análise fora da tela. */
function exportarPedidos(pedidos) {
  const linhas = [['pedido_id', 'criado_em', 'status', 'usuario_id', 'produto', 'quantidade', 'preco_unit', 'subtotal', 'total_pedido']]
  pedidos.forEach(p => {
    const itens = p.itens || []
    if (!itens.length) linhas.push([p.id, p.criado_em, p.status, p.usuario_id, '', '', '', '', p.total])
    itens.forEach(i => linhas.push([
      p.id, p.criado_em, p.status, p.usuario_id, i.nome_produto, i.quantidade,
      i.preco_unit, (i.preco_unit * i.quantidade).toFixed(2), p.total,
    ]))
  })
  const csv = linhas.map(l => l.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'pedidos.csv'
  a.click()
  URL.revokeObjectURL(url)
}

/* ------------------------------- Detalhe -------------------------------- */

const ShowActions = () => (
  <TopToolbar><EditButton /></TopToolbar>
)

const PedidoDetalhe = () => {
  const record   = useRecordContext()
  const usuarios = useUsuariosMap()
  const produtos = useProdutosMap()
  const redirect = useRedirect()
  const { data: pagamentos } = useGetList('pagamentos', LISTA_TUDO)

  if (!record) return null
  const cliente   = usuarios[record.usuario_id]
  const itens     = record.itens || []
  const unidades  = itens.reduce((a, i) => a + Number(i.quantidade), 0)
  const pagamento = (pagamentos || []).find(p => p.pedido_id === record.id)

  return (
    <Box p={{ xs: 2, md: 3 }}>
      <Grid container spacing={3}>
        {/* Cabeçalho */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="h5" fontWeight={800}>
                Pedido #{record.id.slice(0, 8)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                {record.id}
              </Typography>
            </Box>
            <StatusPedido status={record.status} size="medium" />
            <Box sx={{ flex: 1 }} />
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h5" fontWeight={800} color="success.main">{brl(record.total)}</Typography>
              <Typography variant="caption" color="text.secondary">
                {itens.length} {itens.length === 1 ? 'item' : 'itens'} · {unidades} unidade(s)
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ mt: 2 }} />
        </Grid>

        {/* Itens */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>Produtos do pedido</Typography>
              {itens.length
                ? <TabelaItens
                    itens={itens}
                    total={record.total}
                    produtos={produtos}
                    onAbrirProduto={(id) => produtos[id] && redirect('show', 'produtos', id)}
                  />
                : <Typography variant="body2" color="text.secondary">Este pedido não possui itens registrados.</Typography>}
            </CardContent>
          </Card>
        </Grid>

        {/* Cliente, datas e pagamento */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <PersonIcon fontSize="small" color="primary" />
                <Typography variant="subtitle1" fontWeight={700}>Cliente</Typography>
              </Box>
              <Typography variant="body2" fontWeight={600}>
                {cliente?.nome || 'Cliente não encontrado'}
              </Typography>
              {cliente?.email && <Typography variant="body2" color="text.secondary">{cliente.email}</Typography>}
              {cliente?.role && <Chip size="small" label={cliente.role} sx={{ mt: 1 }} />}
              <Typography variant="caption" color="text.secondary" display="block" mt={1} sx={{ fontFamily: 'monospace' }}>
                {record.usuario_id}
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Linha do tempo</Typography>
              <Linha rotulo="Criado em" valor={`${formatarData(record.criado_em)} (${tempoRelativo(record.criado_em)})`} />
              <Linha rotulo="Status atual" valor={meta(record.status).label} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Pagamento</Typography>
              {pagamento
                ? (
                  <>
                    <Linha rotulo="Status" valor={pagamento.status} />
                    <Linha rotulo="ID" valor={`${pagamento.id.slice(0, 8)}…`} />
                  </>
                )
                : <Typography variant="body2" color="text.secondary">
                    Nenhum pagamento registrado para este pedido.
                  </Typography>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

const Linha = ({ rotulo, valor }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: .5 }}>
    <Typography variant="body2" color="text.secondary">{rotulo}</Typography>
    <Typography variant="body2" fontWeight={600} textAlign="right">{valor}</Typography>
  </Box>
)

export const PedidoShow = () => (
  <Show actions={<ShowActions />} title=" ">
    <PedidoDetalhe />
  </Show>
)

export const PedidoCreate = () => (
  <Create redirect="list">
    <SimpleForm>
      <TextInput source="usuario_id" label="ID do Usuário" required fullWidth />
      <NumberInput source="total" label="Total (R$)" required min={0} />
      <TextInput source="status" label="Status" defaultValue="PENDENTE" disabled />
    </SimpleForm>
  </Create>
)

export const PedidoEdit = () => (
  <Edit redirect="show">
    <SimpleForm>
      <TextInput source="usuario_id" label="ID do Usuário" fullWidth />
      <NumberInput source="total" label="Total (R$)" min={0} />
      <TextInput source="status" label="Status" helperText="PENDENTE · CONFIRMADO · CANCELADO · ENTREGUE" />
    </SimpleForm>
  </Edit>
)
