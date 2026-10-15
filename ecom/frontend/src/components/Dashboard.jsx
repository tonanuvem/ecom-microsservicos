import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import BlockIcon from '@mui/icons-material/Block'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined'
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom'
import InventoryIcon from '@mui/icons-material/Inventory'
import LocalMallIcon from '@mui/icons-material/LocalMall'
import NorthEastIcon from '@mui/icons-material/NorthEast'
import PeopleIcon from '@mui/icons-material/People'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import RefreshIcon from '@mui/icons-material/Refresh'
import SouthEastIcon from '@mui/icons-material/SouthEast'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { Title, useRedirect } from 'react-admin'
import { VIZ, brl, brlCompacto, pct } from '../formatos'
import { PERIODOS, useAnalytics } from '../useAnalytics'
import { BarraStatus, BarrasHorizontais, ColunasPorDia, Sparkline } from './charts'

/** Cartão-herói: o número que o negócio lê primeiro. */
function CartaoReceita({ m, onClick }) {
  const delta = m?.variacaoReceita
  const subiu = (delta ?? 0) >= 0
  return (
    <Card
      onClick={onClick}
      sx={{
        height: '100%', cursor: 'pointer', border: 'none', color: '#fff',
        background: 'linear-gradient(135deg, #065F46 0%, #10B981 100%)',
        transition: 'transform .15s, box-shadow .15s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 28px rgba(6,95,70,.28)' },
      }}
    >
      <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box>
          <Typography variant="caption" sx={{ opacity: .9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
            Receita confirmada · {m?.periodo.rotulo}
          </Typography>
          <Typography sx={{ fontSize: 48, fontWeight: 800, lineHeight: 1.1, mt: .5 }}>
            {m ? brl(m.receita) : <Skeleton width={220} sx={{ bgcolor: 'rgba(255,255,255,.3)' }} />}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            {delta != null && (
              <Chip
                size="small"
                icon={subiu
                  ? <NorthEastIcon sx={{ fontSize: 14, color: '#fff !important' }} />
                  : <SouthEastIcon sx={{ fontSize: 14, color: '#fff !important' }} />}
                label={`${subiu ? '+' : ''}${pct(delta, 0)} vs. período anterior`}
                sx={{ bgcolor: 'rgba(255,255,255,.22)', color: '#fff', fontWeight: 700 }}
              />
            )}
            <Typography variant="caption" sx={{ opacity: .9 }}>
              {m ? `${m.pedidos.confirmados} pedidos confirmados · ticket ${brl(m.ticketMedio)}` : ''}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right' }}>
          <Sparkline valores={(m?.receitaPorDia || []).map(d => d.valor)} />
          <Typography variant="caption" sx={{ opacity: .8 }}>evolução diária</Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

/** Stat tile compacto: rótulo · valor · contexto. Clicável quando há drill-down. */
function Tile({ titulo, valor, contexto, icone, cor = '#5B21B6', onClick, alerta }) {
  return (
    <Card
      onClick={onClick}
      sx={{
        height: '100%', cursor: onClick ? 'pointer' : 'default',
        borderLeft: `4px solid ${alerta ? VIZ.status.CANCELADO : cor}`,
        transition: 'transform .15s, box-shadow .15s',
        '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: '0 8px 20px rgba(0,0,0,.10)' } : {},
      }}
    >
      <CardContent sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase' }}>
              {titulo}
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: .25 }} noWrap>
              {valor ?? <Skeleton width={80} />}
            </Typography>
            {contexto && (
              <Typography variant="caption" color="text.secondary" noWrap display="block">{contexto}</Typography>
            )}
          </Box>
          <Box sx={{ color: alerta ? VIZ.status.CANCELADO : cor, opacity: .85, flexShrink: 0 }}>{icone}</Box>
        </Box>
      </CardContent>
    </Card>
  )
}

function Painel({ titulo, acao, children, icone }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {icone}
            <Typography variant="subtitle1" fontWeight={700}>{titulo}</Typography>
          </Box>
          {acao}
        </Box>
        {children}
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const [periodo, setPeriodo] = useState('30')
  const { metricas: m, carregando, erros, recarregar } = useAnalytics(periodo)
  const redirect = useRedirect()

  const statusSegmentos = [
    { rotulo: 'Confirmados', valor: m?.pedidos.confirmados || 0, cor: VIZ.status.CONFIRMADO, icone: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
    { rotulo: 'Pendentes',   valor: m?.pedidos.pendentes   || 0, cor: VIZ.status.PENDENTE,   icone: <HourglassBottomIcon sx={{ fontSize: 14 }} /> },
    { rotulo: 'Cancelados',  valor: m?.pedidos.cancelados  || 0, cor: VIZ.status.CANCELADO,  icone: <BlockIcon sx={{ fontSize: 14 }} /> },
  ]
  const totalPedidos = m?.pedidos.total || 0

  const alertas = []
  if (m?.estoque.rupturas.length)  alertas.push({ nivel: 'error',   texto: `${m.estoque.rupturas.length} SKU(s) em ruptura — cerca de ${brlCompacto(m.estoque.receitaBloqueada)} de venda bloqueada`, ir: 'estoque' })
  if (m?.pedidos.pendentes)        alertas.push({ nivel: 'warning', texto: `${m.pedidos.pendentes} pedido(s) pendente(s) somando ${brl(m.receitaEmRisco)}`, ir: 'pedidos' })
  if (m?.estoque.criticos.length)  alertas.push({ nivel: 'warning', texto: `${m.estoque.criticos.length} produto(s) com estoque crítico (< 10 un.)`, ir: 'estoque' })
  if (m?.notifFalha)               alertas.push({ nivel: 'warning', texto: `${m.notifFalha} notificação(ões) com falha de envio`, ir: 'notificacoes' })
  if (m?.catalogo.semVenda)        alertas.push({ nivel: 'info',    texto: `${m.catalogo.semVenda} produto(s) do catálogo sem nenhuma venda no período`, ir: 'produtos' })

  return (
    <Box p={3}>
      <Title title="Dashboard" />

      {/* Cabeçalho + controle de período */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUpIcon color="primary" />
          <Typography variant="h5" fontWeight={800} color="text.primary">Visão Geral</Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ display: 'flex', gap: .5, bgcolor: '#fff', p: .5, borderRadius: 2, border: '1px solid #E2E8F0' }}>
          {PERIODOS.map(p => (
            <Chip
              key={p.chave}
              label={p.rotulo}
              size="small"
              onClick={() => setPeriodo(p.chave)}
              color={periodo === p.chave ? 'primary' : 'default'}
              variant={periodo === p.chave ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
        <Tooltip title="Recarregar">
          <IconButton onClick={recarregar} size="small"><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>

      {carregando && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
      {erros.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Sem resposta de: {erros.join(', ')}. Os indicadores abaixo consideram apenas os serviços disponíveis.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Herói + indicadores de risco */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <CartaoReceita m={m} onClick={() => redirect('list', 'pedidos')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <Tile
            titulo="Receita em risco"
            valor={m ? brlCompacto(m.receitaEmRisco) : null}
            contexto={`${m?.pedidos.pendentes ?? 0} pedido(s) pendentes`}
            icone={<HourglassBottomIcon />}
            cor={VIZ.status.PENDENTE}
            onClick={() => redirect('list', 'pedidos')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <Tile
            titulo="Receita perdida"
            valor={m ? brlCompacto(m.receitaPerdida) : null}
            contexto={`cancelamento de ${pct(m?.taxaCancel, 0)}`}
            icone={<BlockIcon />}
            cor={VIZ.status.CANCELADO}
            onClick={() => redirect('list', 'pedidos')}
          />
        </Grid>

        {/* Linha de KPIs operacionais */}
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <Tile titulo="Ticket médio" valor={m ? brl(m.ticketMedio) : null}
            contexto={`${(m?.cesta ?? 0).toFixed(1).replace('.', ',')} itens por pedido`}
            icone={<AttachMoneyIcon />} cor="#5B21B6" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <Tile titulo="Conversão" valor={m ? pct(m.taxaConversao, 0) : null}
            contexto={`${m?.pedidos.confirmados ?? 0} de ${totalPedidos} pedidos`}
            icone={<CheckCircleIcon />} cor={VIZ.status.CONFIRMADO} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <Tile titulo="Unidades vendidas" valor={m ? m.unidades : null}
            contexto={`${m?.ranking.length ?? 0} SKU(s) com venda`}
            icone={<LocalMallIcon />} cor="#F97316"
            onClick={() => redirect('list', 'produtos')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <Tile titulo="Capital em estoque" valor={m ? brlCompacto(m.estoque.valor) : null}
            contexto={`${m?.estoque.rupturas.length ?? 0} em ruptura · ${m?.estoque.criticos.length ?? 0} crítico(s)`}
            icone={<InventoryIcon />} cor="#3B82F6"
            alerta={!!m?.estoque.rupturas.length}
            onClick={() => redirect('list', 'estoque')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <Tile titulo="Aprovação de pagamento"
            valor={m ? (m.pagamentos.taxaAprovacao == null ? '—' : pct(m.pagamentos.taxaAprovacao, 0)) : null}
            contexto={`${m?.pagamentos.aprovados ?? 0} aprovados (${brlCompacto(m?.pagamentos.valorAprovado || 0)}) · ${m?.pagamentos.recusados ?? 0} recusados`}
            icone={<ReceiptLongIcon />} cor="#0EA5E9"
            onClick={() => redirect('list', 'pagamentos')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <Tile titulo="Clientes compradores"
            valor={m ? `${m.clientes.compradores}/${m.clientes.base}` : null}
            contexto={`${(m?.clientes.pedidosPorCliente ?? 0).toFixed(1).replace('.', ',')} pedidos por cliente`}
            icone={<PeopleIcon />} cor="#7C3AED"
            onClick={() => redirect('list', 'usuarios')} />
        </Grid>

        {/* Receita por dia */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Painel titulo={`Receita confirmada por dia · ${m?.periodo.rotulo ?? ''}`}>
            <ColunasPorDia dados={m?.receitaPorDia || []} />
          </Painel>
        </Grid>

        {/* Composição por status */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Painel titulo="Composição dos pedidos">
            <BarraStatus segmentos={statusSegmentos} />
            <Box mt={2}>
              {statusSegmentos.map(s => (
                <Box key={s.rotulo} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: .5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.cor, flexShrink: 0 }} />
                  <Box sx={{ color: s.cor, display: 'flex' }}>{s.icone}</Box>
                  <Typography variant="body2" sx={{ flex: 1 }}>{s.rotulo}</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {s.valor}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ width: 42, textAlign: 'right' }}>
                    {totalPedidos ? `${Math.round((s.valor / totalPedidos) * 100)}%` : '—'}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Painel>
        </Grid>

        {/* Top produtos */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Painel
            titulo="Top produtos por receita"
            acao={<Button size="small" onClick={() => redirect('list', 'produtos')}>Ver catálogo</Button>}
          >
            <BarrasHorizontais
              dados={(m?.ranking || []).slice(0, 5).map(r => ({
                chave: r.produto_id, rotulo: r.nome, valor: r.receita,
                secundario: `${r.unidades} un. vendidas`,
              }))}
            />
          </Painel>
        </Grid>

        {/* Alertas acionáveis */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Painel titulo="Alertas de operação" icone={<WarningAmberIcon color="warning" fontSize="small" />}>
            {alertas.length === 0
              ? <Typography variant="body2" color="text.secondary">Nenhum alerta. Operação saudável no período.</Typography>
              : alertas.map((a, i) => (
                  <Alert
                    key={i}
                    severity={a.nivel}
                    icon={a.nivel === 'error' ? <ErrorOutlineIcon fontSize="inherit" /> : undefined}
                    sx={{ mb: 1, py: 0, alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => redirect('list', a.ir)}
                  >
                    <Typography variant="body2">{a.texto}</Typography>
                  </Alert>
                ))
            }
            {m?.estoque.rupturas.length > 0 && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="caption" fontWeight={700} color="text.secondary">EM RUPTURA</Typography>
                {m.estoque.rupturas.slice(0, 4).map(e => (
                  <Typography key={e.id} variant="body2" noWrap>
                    • {e.produto?.nome || e.produto_id.slice(0, 8)}
                  </Typography>
                ))}
              </>
            )}
          </Painel>
        </Grid>

        {/* Reposição por cobertura */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Painel
            titulo="Reposição sugerida"
            acao={<Button size="small" onClick={() => redirect('list', 'estoque')}>Ver estoque</Button>}
          >
            {(() => {
              const lista = (m?.estoque.itens || [])
                .filter(e => e.quantidade === 0 || e.cobertura != null || e.quantidade < 10)
                .sort((a, b) => (a.cobertura ?? 999) - (b.cobertura ?? 999) || a.quantidade - b.quantidade)
                .slice(0, 5)
              if (!lista.length) return <Typography variant="body2" color="text.secondary">Estoque adequado em todo o catálogo.</Typography>
              return lista.map((e, i) => (
                <Box key={e.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                    <Box sx={{
                      width: 36, height: 36, borderRadius: 1.5, flexShrink: 0, overflow: 'hidden',
                      border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)',
                    }}>
                      {e.produto?.imagem_url
                        ? <Box component="img" src={e.produto.imagem_url} alt=""
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={ev => { ev.target.style.display = 'none' }} />
                        : <InventoryIcon sx={{ fontSize: 18, color: '#7C3AED' }} />}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {e.produto?.nome || e.produto_id.slice(0, 14)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {e.quantidade} un. · {brlCompacto(e.valor)} parado
                      </Typography>
                    </Box>
                    {e.quantidade === 0
                      ? <Chip size="small" color="error" label="Ruptura" />
                      : e.cobertura != null
                        ? <Tooltip title="Dias de cobertura no ritmo atual de venda">
                            <Chip size="small" color={e.cobertura <= 7 ? 'warning' : 'default'} label={`${e.cobertura}d`} />
                          </Tooltip>
                        : <Chip size="small" variant="outlined" label="sem giro" />}
                  </Box>
                  {i < lista.length - 1 && <Divider />}
                </Box>
              ))
            })()}
          </Painel>
        </Grid>

        {/* Pedidos recentes */}
        <Grid size={{ xs: 12 }}>
          <Painel
            titulo="Pedidos recentes"
            acao={<Button size="small" onClick={() => redirect('list', 'pedidos')}>Ver todos</Button>}
          >
            {!m?.pedidos.recentes.length
              ? <Typography variant="body2" color="text.secondary">Nenhum pedido no período.</Typography>
              : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 1 }}>
                  {m.pedidos.recentes.map(p => (
                    <Box
                      key={p.id}
                      onClick={() => redirect('show', 'pedidos', p.id)}
                      sx={{
                        p: 1.5, border: '1px solid #E2E8F0', borderRadius: 2, cursor: 'pointer',
                        '&:hover': { bgcolor: '#F8F5FF', borderColor: '#DDD6FE' },
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={700}>{brl(p.total)}</Typography>
                        <Chip size="small" label={p.status}
                          sx={{ bgcolor: VIZ.status[p.status] || '#94A3B8', color: '#fff' }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" noWrap>
                        {m.clientes.nomeCliente[p.usuario_id] || p.usuario_id.slice(0, 8)} ·{' '}
                        {(p.itens?.length || 0)} {(p.itens?.length || 0) === 1 ? 'item' : 'itens'} ·{' '}
                        {String(p.criado_em).slice(0, 16).replace('T', ' ')}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
          </Painel>
        </Grid>
      </Grid>
    </Box>
  )
}
