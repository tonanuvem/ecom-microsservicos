import CategoryIcon from '@mui/icons-material/Category'
import CheckroomIcon from '@mui/icons-material/Checkroom'
import ComputerIcon from '@mui/icons-material/Computer'
import EditIcon from '@mui/icons-material/Edit'
import GridViewIcon from '@mui/icons-material/GridView'
import InventoryIcon from '@mui/icons-material/Inventory'
import KitchenIcon from '@mui/icons-material/Kitchen'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import TableRowsIcon from '@mui/icons-material/TableRows'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useMemo, useState } from 'react'
import {
  BooleanInput, Create, Edit, EditButton, List, NumberInput, Show,
  SimpleForm, TextInput, TopToolbar, useListContext,
  useRecordContext, useRedirect,
} from 'react-admin'
import { BarraFiltros, ListaLocal } from '../components/comuns'
import { brl, nivelEstoque } from '../formatos'
import { useEstoqueMap, usePedidos, useVendasPorProduto } from '../hooks'

export const ProdutoIcon = ShoppingBagIcon

// Ícone de apoio quando o produto não tem imagem
const CATEGORY_ICONS = [
  { match: /eletro|comput|tech|inform|monitor|notebook|ssd|teclado|webcam|headset/i, icon: ComputerIcon },
  { match: /roupa|moda|vest|fashion/i,   icon: CheckroomIcon },
  { match: /livro|book|educa/i,          icon: MenuBookIcon },
  { match: /jogo|game|brinq|gamer/i,     icon: SportsEsportsIcon },
  { match: /cozinha|aliment|comida/i,    icon: KitchenIcon },
]

function IconeCategoria({ texto = '', tamanho = 40 }) {
  const achado = CATEGORY_ICONS.find(c => c.match.test(texto))
  const Icone = achado ? achado.icon : CategoryIcon
  return <Icone sx={{ fontSize: tamanho }} />
}

function Miniatura({ produto, altura = 160, raio = '16px 16px 0 0' }) {
  const [falhou, setFalhou] = useState(false)
  const temImagem = !!produto.imagem_url && !falhou
  return (
    <Box sx={{
      height: altura, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: temImagem ? '#F8FAFC' : 'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)',
      overflow: 'hidden', borderRadius: raio, position: 'relative', color: '#7C3AED',
    }}>
      {temImagem
        ? <Box component="img" src={produto.imagem_url} alt={produto.nome}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setFalhou(true)} />
        : <IconeCategoria texto={`${produto.nome} ${produto.descricao || ''}`} />}
    </Box>
  )
}

/* ------------------------------ Listagem -------------------------------- */

function CardProduto({ record, estoque, vendas }) {
  const redirect = useRedirect()
  const nivel = nivelEstoque(estoque)
  return (
    <Card sx={{
      height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer',
      transition: 'transform .15s, box-shadow .15s',
      '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(91,33,182,.15)' },
    }}
      onClick={() => redirect('show', 'produtos', record.id)}
    >
      <Box sx={{ position: 'relative' }}>
        <Miniatura produto={record} />
        <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: .5 }}>
          <Chip size="small" label={record.ativo ? 'Ativo' : 'Inativo'}
            color={record.ativo ? 'success' : 'default'}
            sx={{ fontWeight: 700, fontSize: '.65rem' }} />
        </Box>
        <Box sx={{ position: 'absolute', bottom: 8, left: 8 }}>
          <Chip size="small" label={nivel.rotulo} color={nivel.cor}
            icon={<InventoryIcon sx={{ fontSize: 14 }} />}
            sx={{ fontWeight: 700, fontSize: '.65rem', bgcolor: '#fff' }}
            variant={nivel.chave === 'ok' ? 'outlined' : 'filled'} />
        </Box>
      </Box>

      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: .5, p: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} noWrap title={record.nome}>
          {record.nome}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', minHeight: 32,
        }}>
          {record.descricao || 'Sem descrição'}
        </Typography>

        <Box sx={{ mt: 'auto', pt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="h6" fontWeight={800} color="primary.main">{brl(record.preco)}</Typography>
            {vendas?.unidades > 0 && (
              <Tooltip title={`${brl(vendas.receita)} em receita confirmada`}>
                <Chip size="small" variant="outlined" icon={<TrendingUpIcon sx={{ fontSize: 14 }} />}
                  label={`${vendas.unidades} vend.`} />
              </Tooltip>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button size="small" variant="outlined" startIcon={<EditIcon sx={{ fontSize: 14 }} />}
              onClick={e => { e.stopPropagation(); redirect('edit', 'produtos', record.id) }}>
              Editar
            </Button>
            <Button size="small" onClick={e => { e.stopPropagation(); redirect('show', 'produtos', record.id) }}>
              Detalhes
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

function GradeProdutos({ estoqueMap, vendasMap }) {
  const { data, isPending } = useListContext()
  if (isPending) return null
  if (!data?.length) {
    return <Typography p={3} color="text.secondary">Nenhum produto encontrado com os filtros atuais.</Typography>
  }
  return (
    <Box p={2}>
      <Grid container spacing={2}>
        {data.map(record => (
          <Grid key={record.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <CardProduto record={record} estoque={estoqueMap[record.id]} vendas={vendasMap[record.id]} />
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

function TabelaProdutos({ estoqueMap, vendasMap }) {
  const { data, isPending } = useListContext()
  const redirect = useRedirect()
  if (isPending) return null
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 700 }}>Produto</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700 }}>Preço</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Estoque</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700 }}>Vendidos</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700 }}>Receita</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700 }}>Capital parado</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {(data || []).map(p => {
          const qtd = estoqueMap[p.id]
          const nivel = nivelEstoque(qtd)
          const v = vendasMap[p.id]
          return (
            <TableRow key={p.id} hover sx={{ cursor: 'pointer' }} onClick={() => redirect('show', 'produtos', p.id)}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 40, height: 40, flexShrink: 0 }}>
                    <Miniatura produto={p} altura={40} raio="8px" />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{p.nome}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block"
                      sx={{ maxWidth: 320 }}>
                      {p.descricao || '—'}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{brl(p.preco)}</TableCell>
              <TableCell><Chip size="small" label={nivel.rotulo} color={nivel.cor} /></TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{v?.unidades || 0}</TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{brl(v?.receita || 0)}</TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {brl((qtd || 0) * Number(p.preco || 0))}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

const ORDENACOES = [
  { chave: 'nome:ASC',    rotulo: 'Nome (A–Z)' },
  { chave: 'preco:DESC',  rotulo: 'Maior preço' },
  { chave: 'preco:ASC',   rotulo: 'Menor preço' },
]

function ProdutosConteudo() {
  const estoqueMap = useEstoqueMap()
  const vendasMap  = useVendasPorProduto()
  const { setSort, sort } = useListContext()
  const [busca, setBusca] = useState('')
  const [nivel, setNivel] = useState([])   // ruptura | critico | ok
  const [visao, setVisao] = useState('grade')

  const filtrar = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return (p) => {
      if (nivel.length) {
        const n = nivelEstoque(estoqueMap[p.id]).chave
        if (!nivel.includes(n)) return false
      }
      if (!q) return true
      return `${p.nome} ${p.descricao || ''}`.toLowerCase().includes(q)
    }
  }, [busca, nivel, estoqueMap])

  const alternar = (n) => setNivel(a => (a.includes(n) ? a.filter(x => x !== n) : [...a, n]))
  const chaveOrdem = `${sort?.field}:${sort?.order}`

  return (
    <ListaLocal filtrar={filtrar}>
      <BarraFiltros
        busca={busca}
        setBusca={setBusca}
        placeholder="Buscar produto por nome ou descrição…"
        chips={[
          { valor: 'ruptura', rotulo: 'Em ruptura',    ativo: nivel.includes('ruptura'), cor: 'error',   onClick: () => alternar('ruptura') },
          { valor: 'critico', rotulo: 'Estoque baixo', ativo: nivel.includes('critico'), cor: 'warning', onClick: () => alternar('critico') },
          { valor: 'ok',      rotulo: 'Disponível',    ativo: nivel.includes('ok'),      cor: 'success', onClick: () => alternar('ok') },
        ]}
        resumo={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TextField
              select size="small" value={ORDENACOES.some(o => o.chave === chaveOrdem) ? chaveOrdem : 'nome:ASC'}
              onChange={e => {
                const [field, order] = e.target.value.split(':')
                setSort({ field, order })
              }}
              sx={{ minWidth: 150 }}
            >
              {ORDENACOES.map(o => <MenuItem key={o.chave} value={o.chave}>{o.rotulo}</MenuItem>)}
            </TextField>
            <ToggleButtonGroup
              size="small" exclusive value={visao}
              onChange={(_, v) => v && setVisao(v)}
            >
              <ToggleButton value="grade"><GridViewIcon fontSize="small" /></ToggleButton>
              <ToggleButton value="tabela"><TableRowsIcon fontSize="small" /></ToggleButton>
            </ToggleButtonGroup>
          </Box>
        }
      />
      <ResumoCatalogo estoqueMap={estoqueMap} vendasMap={vendasMap} />
      {visao === 'grade'
        ? <GradeProdutos estoqueMap={estoqueMap} vendasMap={vendasMap} />
        : <TabelaProdutos estoqueMap={estoqueMap} vendasMap={vendasMap} />}
    </ListaLocal>
  )
}

/** Faixa de totais do que está filtrado — leitura de negócio do catálogo. */
function ResumoCatalogo({ estoqueMap, vendasMap }) {
  const { data = [], total = 0 } = useListContext()
  const capital = data.reduce((a, p) => a + (estoqueMap[p.id] || 0) * Number(p.preco || 0), 0)
  const receita = data.reduce((a, p) => a + (vendasMap[p.id]?.receita || 0), 0)
  const semGiro = data.filter(p => !vendasMap[p.id]).length
  const itens = [
    { rotulo: 'Produtos', valor: total },
    { rotulo: 'Capital em estoque', valor: brl(capital) },
    { rotulo: 'Receita gerada', valor: brl(receita) },
    { rotulo: 'Sem venda', valor: semGiro },
  ]
  return (
    <Box sx={{ display: 'flex', gap: 3, px: 2, py: 1.5, flexWrap: 'wrap', bgcolor: '#F8F5FF' }}>
      {itens.map(i => (
        <Box key={i.rotulo}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
            {i.rotulo}
          </Typography>
          <Typography variant="subtitle2" fontWeight={800}>{i.valor}</Typography>
        </Box>
      ))}
    </Box>
  )
}

// incluir_inativos: o endpoint esconde os desativados por padrão (é a vitrine);
// o admin precisa deles para o badge "Inativo" e para reativar um produto.
// perPage alto: o filtro por nível de estoque cruza o serviço de estoque, então
// a tela precisa do catálogo inteiro em memória (a paginação é feita no cliente).
export const ProdutoList = () => (
  <List sort={{ field: 'nome', order: 'ASC' }} perPage={1000} pagination={false}
    filter={{ incluir_inativos: true }}>
    <ProdutosConteudo />
  </List>
)

/* ------------------------------- Detalhe -------------------------------- */

const ProdutoDetalhe = () => {
  const record     = useRecordContext()
  const estoqueMap = useEstoqueMap()
  const vendasMap  = useVendasPorProduto()
  const redirect   = useRedirect()
  const pedidos    = usePedidos()

  if (!record) return null
  const qtd    = estoqueMap[record.id]
  const nivel  = nivelEstoque(qtd)
  const vendas = vendasMap[record.id] || { unidades: 0, receita: 0, pedidos: 0 }
  const historico = pedidos
    .filter(p => (p.itens || []).some(i => i.produto_id === record.id))
    .sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)))
    .slice(0, 8)

  return (
    <Box p={{ xs: 2, md: 3 }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <Miniatura produto={record} altura={260} />
            <CardContent>
              <Typography variant="h6" fontWeight={800}>{record.nome}</Typography>
              <Typography variant="body2" color="text.secondary" mt={.5}>
                {record.descricao || 'Sem descrição'}
              </Typography>
              <Typography variant="h4" fontWeight={800} color="primary.main" mt={2}>
                {brl(record.preco)}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                <Chip size="small" label={record.ativo ? 'Ativo' : 'Inativo'} color={record.ativo ? 'success' : 'default'} />
                <Chip size="small" label={nivel.rotulo} color={nivel.cor} />
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" mt={2} sx={{ fontFamily: 'monospace' }}>
                {record.id}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Grid container spacing={2} mb={1}>
            {[
              { rotulo: 'Unidades vendidas', valor: vendas.unidades },
              { rotulo: 'Receita confirmada', valor: brl(vendas.receita) },
              { rotulo: 'Em estoque', valor: qtd == null ? '—' : `${qtd} un.` },
              { rotulo: 'Capital parado', valor: brl((qtd || 0) * Number(record.preco || 0)) },
            ].map(k => (
              <Grid key={k.rotulo} size={{ xs: 6, md: 3 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="caption" color="text.secondary"
                      sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                      {k.rotulo}
                    </Typography>
                    <Typography variant="h6" fontWeight={800} noWrap>{k.valor}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>
                Pedidos que incluem este produto
              </Typography>
              {!historico.length
                ? <Typography variant="body2" color="text.secondary">
                    Este produto ainda não foi vendido.
                  </Typography>
                : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Pedido</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Qtd</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Total do pedido</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historico.map(p => {
                        const item = (p.itens || []).find(i => i.produto_id === record.id)
                        return (
                          <TableRow key={p.id} hover sx={{ cursor: 'pointer' }}
                            onClick={() => redirect('show', 'pedidos', p.id)}>
                            <TableCell sx={{ fontFamily: 'monospace' }}>#{p.id.slice(0, 8)}</TableCell>
                            <TableCell>{p.status}</TableCell>
                            <TableCell align="right">{item?.quantidade ?? '—'}</TableCell>
                            <TableCell align="right">{brl(p.total)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              <Divider sx={{ my: 2 }} />
              <Button size="small" onClick={() => redirect('list', 'estoque')}>Ajustar estoque</Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export const ProdutoShow = () => (
  <Show actions={<TopToolbar><EditButton /></TopToolbar>} title=" ">
    <ProdutoDetalhe />
  </Show>
)

const camposProduto = (
  <>
    <TextInput source="nome" label="Nome do produto" required fullWidth />
    <TextInput source="descricao" label="Descrição" multiline rows={3} fullWidth />
    <NumberInput source="preco" label="Preço (R$)" required min={0} />
    <TextInput source="imagem_url" label="URL da imagem" fullWidth
      helperText="Em branco: um ícone é escolhido automaticamente a partir do nome do produto" />
    <BooleanInput source="ativo" label="Ativo" defaultValue />
  </>
)

export const ProdutoCreate = () => (
  <Create redirect="list"><SimpleForm>{camposProduto}</SimpleForm></Create>
)

export const ProdutoEdit = () => (
  <Edit redirect="show"><SimpleForm>{camposProduto}</SimpleForm></Edit>
)
