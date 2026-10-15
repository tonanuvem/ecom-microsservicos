// Primitivos de gráfico em SVG inline — sem dependências extras.
// Regras aplicadas: marca ≤24px com topo arredondado e base na linha de base,
// rótulo direto apenas no extremo, legenda fora do gráfico, texto nunca na cor
// da série.
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { VIZ, brl, brlCompacto } from '../formatos'

const diaCurto = (iso) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

/** Retângulo com topo arredondado e base quadrada (ancorada na linha de base). */
function caminhoColuna(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h)
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`
}

function SemDados({ altura }) {
  return (
    <Box sx={{
      height: altura, display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1px dashed #E2E8F0', borderRadius: 2,
    }}>
      <Typography variant="caption" color="text.secondary">Sem dados no período</Typography>
    </Box>
  )
}

/** Colunas de série única (receita por dia), com valor no pico e tooltip por coluna. */
export function ColunasPorDia({ dados, altura = 180 }) {
  if (!dados?.length) return <SemDados altura={altura} />

  const max        = Math.max(...dados.map(d => d.valor), 1)
  const larguraCol = Math.min(24, Math.max(6, 520 / dados.length - 4))
  const gap        = 4
  const w          = dados.length * (larguraCol + gap)
  const hPlot      = altura - 28
  const idxMax     = dados.reduce((best, d, i) => (d.valor > dados[best].valor ? i : best), 0)
  const passoRotulo = Math.max(1, Math.ceil(dados.length / 8))

  return (
    <Box sx={{ width: '100%' }}>
      <svg
        viewBox={`0 0 ${w} ${altura}`}
        width="100%"
        height={altura}
        preserveAspectRatio="none"
        role="img"
        aria-label="Receita confirmada por dia"
      >
        <line x1="0" y1={hPlot} x2={w} y2={hPlot} stroke={VIZ.axis} strokeWidth="1" />
        {dados.map((d, i) => {
          const h = d.valor > 0 ? Math.max(3, (d.valor / max) * (hPlot - 20)) : 0
          const x = i * (larguraCol + gap)
          const y = hPlot - h
          return (
            <g key={d.dia}>
              {h > 0 && (
                <path d={caminhoColuna(x, y, larguraCol, h, 4)} fill={VIZ.serie}>
                  <title>{`${diaCurto(d.dia)} · ${brl(d.valor)} · ${d.pedidos} pedido(s)`}</title>
                </path>
              )}
              {i === idxMax && d.valor > 0 && (
                <text x={x + larguraCol / 2} y={y - 6} textAnchor="middle"
                  fontSize="10" fontWeight="700" fill="#1E293B">
                  {brlCompacto(d.valor)}
                </text>
              )}
              {(dados.length <= 10 || i % passoRotulo === 0) && (
                <text x={x + larguraCol / 2} y={altura - 8} textAnchor="middle"
                  fontSize="9" fill={VIZ.muted}>
                  {diaCurto(d.dia)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </Box>
  )
}

/** Barras horizontais de série única — rótulo de valor na ponta. */
export function BarrasHorizontais({ dados, formatar = brl }) {
  if (!dados?.length) return <SemDados altura={120} />
  const max = Math.max(...dados.map(d => d.valor), 1)
  return (
    <Box>
      {dados.map((d, i) => (
        <Box key={d.chave ?? i} sx={{ mb: 1.25 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: .5 }}>
            <Typography variant="body2" noWrap title={d.rotulo} sx={{ maxWidth: '62%' }}>
              {d.rotulo}
            </Typography>
            <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatar(d.valor)}
            </Typography>
          </Box>
          <Box sx={{ height: 10, bgcolor: '#F1F5F9', borderRadius: '0 5px 5px 0' }}>
            <Box sx={{
              height: '100%', width: `${Math.max(2, (d.valor / max) * 100)}%`,
              bgcolor: VIZ.serie, borderRadius: '0 5px 5px 0',
            }} />
          </Box>
          {d.secundario && (
            <Typography variant="caption" color="text.secondary">{d.secundario}</Typography>
          )}
        </Box>
      ))}
    </Box>
  )
}

/** Barra empilhada de composição; segmentos separados por 2px da cor da superfície. */
export function BarraStatus({ segmentos, altura = 18 }) {
  const total = segmentos.reduce((a, s) => a + s.valor, 0)
  if (!total) return <SemDados altura={60} />
  return (
    <Box sx={{ display: 'flex', height: altura, borderRadius: 2, overflow: 'hidden', gap: '2px' }}>
      {segmentos.filter(s => s.valor > 0).map(s => (
        <Tooltip key={s.rotulo} title={`${s.rotulo}: ${s.valor} (${Math.round((s.valor / total) * 100)}%)`}>
          <Box sx={{ flex: s.valor, bgcolor: s.cor, minWidth: 4 }} />
        </Tooltip>
      ))}
    </Box>
  )
}

/** Sparkline de série única para dentro do cartão-herói (fundo colorido). */
export function Sparkline({ valores, largura = 160, altura = 40 }) {
  if (!valores?.length || valores.every(v => v === 0)) return null
  const max   = Math.max(...valores, 1)
  const passo = valores.length > 1 ? largura / (valores.length - 1) : largura
  const pts   = valores.map((v, i) => [i * passo, altura - (v / max) * (altura - 4) - 2])
  const linha = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} width={largura} height={altura} aria-hidden="true">
      <path d={`${linha} L${largura},${altura} L0,${altura} Z`} fill="rgba(255,255,255,.25)" />
      <path d={linha} fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="4" fill="#fff" stroke="rgba(255,255,255,.5)" strokeWidth="2" />
    </svg>
  )
}
