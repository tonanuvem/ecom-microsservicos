// Formatação e tokens visuais compartilhados — sem componentes React aqui.

/** Tokens de cor dos gráficos. Marcas usam estas cores; textos usam tokens de texto. */
export const VIZ = {
  surface:   '#FFFFFF',
  serie:     '#2a78d6',  // série única (azul) — contraste ≥3:1 sobre fundo branco
  grid:      '#E8ECF2',
  axis:      '#C3C2B7',
  muted:     '#8A94A6',
  // Paleta de status (reservada) — sempre acompanhada de ícone + rótulo
  status: {
    CONFIRMADO: '#0ca30c',
    PENDENTE:   '#fab219',
    CANCELADO:  '#d03b3b',
    ENTREGUE:   '#2a78d6',
  },
}

export const brl = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Versão compacta para cartões estreitos: R$ 7,9k / R$ 1,2M. */
export const brlCompacto = (v) => {
  const n = Number(v || 0)
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (Math.abs(n) >= 1_000)     return `R$ ${(n / 1_000).toFixed(1).replace('.', ',')}k`
  return brl(n)
}

export const pct = (v, casas = 1) =>
  (v == null ? '—' : `${v.toFixed(casas).replace('.', ',')}%`)

/** "14/10/2026 19:50" a partir de "2026-10-14 19:50:39.457116". */
export function formatarData(valor) {
  if (!valor) return '—'
  const s = String(valor).replace('T', ' ')
  const [data, hora = ''] = s.split(' ')
  const [a, m, d] = data.split('-')
  if (!a || !m || !d) return s
  return `${d}/${m}/${a} ${hora.slice(0, 5)}`.trim()
}

/** "há 3 dias" — contexto rápido sem precisar ler a data completa. */
export function tempoRelativo(valor) {
  if (!valor) return ''
  const t = Date.parse(`${String(valor).replace(' ', 'T')}Z`)
  if (Number.isNaN(t)) return ''
  const seg = (Date.now() - t) / 1000
  if (seg < 60)    return 'agora há pouco'
  if (seg < 3600)  return `há ${Math.floor(seg / 60)} min`
  if (seg < 86400) return `há ${Math.floor(seg / 3600)} h`
  return `há ${Math.floor(seg / 86400)} dia(s)`
}

/** Classifica o estoque de um produto do ponto de vista de operação. */
export function nivelEstoque(qtd) {
  if (qtd == null) return { rotulo: 'Sem registro', cor: 'default', chave: 'sem_registro' }
  if (qtd === 0)   return { rotulo: 'Ruptura',      cor: 'error',   chave: 'ruptura' }
  if (qtd < 10)    return { rotulo: `${qtd} un. — crítico`, cor: 'warning', chave: 'critico' }
  return { rotulo: `${qtd} un.`, cor: 'success', chave: 'ok' }
}
