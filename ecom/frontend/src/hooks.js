// Hooks de leitura compartilhados entre as telas.
//
// Cada microsserviço tem o seu banco e nenhum deles junta dados do outro: quem
// cruza produto × estoque × pedido é o admin. Carregamos então a coleção de
// cada serviço uma vez (o cache do react-admin evita requisições repetidas) e
// montamos os mapas aqui.
import { useMemo } from 'react'
import { useGetList } from 'react-admin'

// Uma página grande o bastante para o lab: o servidor respeita o range, então
// este é o teto de registros que os cruzamentos consideram.
export const LISTA_TUDO = {
  pagination: { page: 1, perPage: 1000 },
  sort: { field: 'id', order: 'ASC' },
}

/** Mapa id → usuário (para exibir nome/e-mail no lugar do UUID). */
export function useUsuariosMap() {
  const { data } = useGetList('usuarios', LISTA_TUDO)
  return useMemo(() => Object.fromEntries((data || []).map(u => [u.id, u])), [data])
}

/** Mapa id → produto. */
export function useProdutosMap() {
  const { data } = useGetList('produtos', LISTA_TUDO)
  return useMemo(() => Object.fromEntries((data || []).map(p => [p.id, p])), [data])
}

/** Mapa produto_id → quantidade em estoque. */
export function useEstoqueMap() {
  const { data } = useGetList('estoque', LISTA_TUDO)
  return useMemo(() => Object.fromEntries((data || []).map(e => [e.produto_id, e.quantidade])), [data])
}

/** Todos os pedidos (fonte dos indicadores de venda por produto). */
export function usePedidos() {
  const { data } = useGetList('pedidos', LISTA_TUDO)
  return data || []
}

/** Vendas por produto, derivadas dos itens dos pedidos confirmados. */
export function useVendasPorProduto() {
  const pedidos = usePedidos()
  return useMemo(() => {
    const mapa = {}
    pedidos.filter(p => p.status === 'CONFIRMADO').forEach(p =>
      (p.itens || []).forEach(i => {
        const k = i.produto_id
        mapa[k] = mapa[k] || { unidades: 0, receita: 0, pedidos: 0 }
        mapa[k].unidades += Number(i.quantidade) || 0
        mapa[k].receita  += (Number(i.preco_unit) || 0) * (Number(i.quantidade) || 0)
        mapa[k].pedidos  += 1
      }))
    return mapa
  }, [pedidos])
}
