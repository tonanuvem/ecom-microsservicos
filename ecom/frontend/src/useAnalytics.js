// Agrega os dados dos microsserviços e deriva as métricas de negócio do dashboard.
// Uma única passada de leitura; todos os KPIs saem daqui para evitar cálculo duplicado.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDataProvider } from 'react-admin'

export const PERIODOS = [
  { chave: '7',   rotulo: '7 dias',  dias: 7   },
  { chave: '30',  rotulo: '30 dias', dias: 30  },
  { chave: '90',  rotulo: '90 dias', dias: 90  },
  { chave: 'all', rotulo: 'Tudo',    dias: null },
]

const LISTA = { pagination: { page: 1, perPage: 1000 }, sort: { field: 'id', order: 'ASC' }, filter: {} }

// criado_em chega como "YYYY-MM-DD HH:MM:SS.ffffff" (UTC) — o recorte por dia
// é feito na string para não depender do fuso do navegador.
const dia = (criadoEm) => (criadoEm || '').slice(0, 10)

const diaISO = (offsetDias = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDias)
  return d.toISOString().slice(0, 10)
}

const sequenciaDeDias = (nDias) =>
  Array.from({ length: nDias }, (_, i) => diaISO(-(nDias - 1 - i)))

export function useAnalytics(periodoChave = '30') {
  const dataProvider = useDataProvider()
  const [bruto, setBruto]       = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erros, setErros]       = useState([])

  // Só o callback da Promise atualiza estado — o efeito abaixo apenas dispara a busca.
  const buscar = useCallback(() => Promise.allSettled([
      dataProvider.getList('usuarios',     LISTA),
      dataProvider.getList('produtos',     LISTA),
      dataProvider.getList('pedidos',      LISTA),
      dataProvider.getList('estoque',      LISTA),
      dataProvider.getList('pagamentos',   LISTA),
      dataProvider.getList('notificacoes', LISTA),
    ]).then(([u, pr, pe, es, pa, no]) => {
      const nomes = ['usuarios', 'produtos', 'pedidos', 'estoque', 'pagamentos', 'notificacoes']
      const res   = [u, pr, pe, es, pa, no]
      setErros(nomes.filter((_, i) => res[i].status === 'rejected'))
      const dados = (r) => (r.status === 'fulfilled' ? r.value.data : [])
      setBruto({
        usuarios:     dados(u),
        produtos:     dados(pr),
        pedidos:      dados(pe),
        estoque:      dados(es),
        pagamentos:   dados(pa),
        notificacoes: dados(no),
      })
      setCarregando(false)
    }), [dataProvider])

  useEffect(() => { buscar() }, [buscar])

  const recarregar = useCallback(() => {
    setCarregando(true)
    buscar()
  }, [buscar])

  const metricas = useMemo(() => {
    if (!bruto) return null

    const periodo   = PERIODOS.find(p => p.chave === periodoChave) || PERIODOS[1]
    const nDias     = periodo.dias
    const corte     = nDias ? diaISO(-(nDias - 1)) : null
    const corteAnt  = nDias ? diaISO(-(nDias * 2 - 1)) : null

    const noPeriodo = (p) => !corte || dia(p.criado_em) >= corte
    const noAnterior = (p) => corte && corteAnt && dia(p.criado_em) >= corteAnt && dia(p.criado_em) < corte

    const pedidos    = bruto.pedidos.filter(noPeriodo)
    const anteriores = bruto.pedidos.filter(noAnterior)

    const porStatus = (lista, st) => lista.filter(p => p.status === st)
    const soma      = (lista) => lista.reduce((a, p) => a + (Number(p.total) || 0), 0)

    const confirmados = porStatus(pedidos, 'CONFIRMADO')
    const pendentes   = porStatus(pedidos, 'PENDENTE')
    const cancelados  = porStatus(pedidos, 'CANCELADO')

    const receita       = soma(confirmados)
    const receitaAnt    = soma(porStatus(anteriores, 'CONFIRMADO'))
    const ticketMedio   = confirmados.length ? receita / confirmados.length : 0
    const taxaConversao = pedidos.length ? (confirmados.length / pedidos.length) * 100 : 0
    const taxaCancel    = pedidos.length ? (cancelados.length / pedidos.length) * 100 : 0

    // Unidades e cesta média
    const itensDe   = (lista) => lista.flatMap(p => p.itens || [])
    const unidades  = itensDe(confirmados).reduce((a, i) => a + (Number(i.quantidade) || 0), 0)
    const cesta     = confirmados.length ? unidades / confirmados.length : 0

    // Receita por dia (apenas confirmados) — série contínua, inclusive dias sem venda
    const diasSerie = nDias ? sequenciaDeDias(Math.min(nDias, 30)) : null
    const porDiaMap = {}
    confirmados.forEach(p => {
      const d = dia(p.criado_em)
      porDiaMap[d] = porDiaMap[d] || { valor: 0, pedidos: 0 }
      porDiaMap[d].valor   += Number(p.total) || 0
      porDiaMap[d].pedidos += 1
    })
    const chavesDias = diasSerie || Object.keys(porDiaMap).sort()
    const receitaPorDia = chavesDias.map(d => ({
      dia: d, valor: porDiaMap[d]?.valor || 0, pedidos: porDiaMap[d]?.pedidos || 0,
    }))

    // Ranking de produtos a partir dos itens dos pedidos confirmados
    const rankMap = {}
    confirmados.forEach(p => (p.itens || []).forEach(i => {
      const k = i.produto_id
      rankMap[k] = rankMap[k] || { produto_id: k, nome: i.nome_produto, unidades: 0, receita: 0 }
      rankMap[k].unidades += Number(i.quantidade) || 0
      rankMap[k].receita  += (Number(i.preco_unit) || 0) * (Number(i.quantidade) || 0)
    }))
    const ranking = Object.values(rankMap).sort((a, b) => b.receita - a.receita)

    // Estoque: valor imobilizado, ruptura e cobertura em dias
    const precoDe   = Object.fromEntries(bruto.produtos.map(p => [p.id, Number(p.preco) || 0]))
    const produtoDe = Object.fromEntries(bruto.produtos.map(p => [p.id, p]))
    const diasJanela = nDias || 30
    const velocidade = Object.fromEntries(
      Object.values(rankMap).map(r => [r.produto_id, r.unidades / diasJanela])
    )
    const estoque = bruto.estoque.map(e => ({
      ...e,
      produto:   produtoDe[e.produto_id],
      valor:     (Number(e.quantidade) || 0) * (precoDe[e.produto_id] || 0),
      cobertura: velocidade[e.produto_id] > 0
        ? Math.floor((Number(e.quantidade) || 0) / velocidade[e.produto_id])
        : null,
    }))
    const valorEstoque = estoque.reduce((a, e) => a + e.valor, 0)
    const rupturas     = estoque.filter(e => (e.quantidade || 0) === 0)
    const criticos     = estoque.filter(e => (e.quantidade || 0) > 0 && e.quantidade < 10)
    // Receita bloqueada: produtos com giro que estão sem estoque
    const receitaBloqueada = rupturas.reduce(
      (a, e) => a + (velocidade[e.produto_id] || 0) * diasJanela * (precoDe[e.produto_id] || 0), 0)

    // Pagamentos: o webhook grava o valor cobrado, então além da taxa de
    // aprovação sabemos quanto o provedor efetivamente aprovou. A receita do
    // dashboard continua saindo dos pedidos — fonte única do faturamento.
    const pagosAprovados = bruto.pagamentos.filter(p => p.status === 'APROVADO')
    const aprovados = pagosAprovados.length
    const recusados = bruto.pagamentos.filter(p => p.status === 'RECUSADO').length
    const taxaAprovacao = aprovados + recusados ? (aprovados / (aprovados + recusados)) * 100 : null
    const valorAprovado = pagosAprovados.reduce((a, p) => a + (Number(p.valor) || 0), 0)

    // Clientes
    const compradores = new Set(pedidos.map(p => p.usuario_id))
    const base        = bruto.usuarios.length
    const nomeCliente = Object.fromEntries(bruto.usuarios.map(u => [u.id, u.nome || u.email]))

    // Notificações com falha = risco de comunicação com o cliente
    const notifFalha = bruto.notificacoes.filter(n => n.status === 'FALHA').length

    const variacao = (atual, ant) => (ant > 0 ? ((atual - ant) / ant) * 100 : null)

    return {
      periodo,
      receita,
      variacaoReceita: variacao(receita, receitaAnt),
      ticketMedio,
      taxaConversao,
      taxaCancel,
      unidades,
      cesta,
      pedidos: {
        total: pedidos.length,
        confirmados: confirmados.length,
        pendentes:   pendentes.length,
        cancelados:  cancelados.length,
        recentes: [...pedidos].sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em))).slice(0, 6),
      },
      receitaEmRisco:  pendentes.reduce((a, p) => a + (Number(p.total) || 0), 0),
      receitaPerdida:  cancelados.reduce((a, p) => a + (Number(p.total) || 0), 0),
      receitaPorDia,
      ranking,
      estoque: { itens: estoque, valor: valorEstoque, rupturas, criticos, receitaBloqueada },
      pagamentos: { aprovados, recusados, taxaAprovacao, valorAprovado },
      clientes: { base, compradores: compradores.size, nomeCliente,
                  pedidosPorCliente: compradores.size ? pedidos.length / compradores.size : 0 },
      catalogo: { ativos: bruto.produtos.length, semVenda: bruto.produtos.filter(p => !rankMap[p.id]).length },
      notifFalha,
    }
  }, [bruto, periodoChave])

  return { metricas, carregando, erros, recarregar }
}
