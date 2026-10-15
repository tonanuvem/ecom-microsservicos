// Componentes compartilhados pelas telas de listagem.
//
// Os endpoints já aplicam filter/sort/range (contrato do ra-data-simple-rest),
// então ordenação e paginação vêm do servidor nas telas simples. Produtos e
// Pedidos filtram por critérios que cruzam serviços — nível de estoque, nome do
// cliente, produto dentro do pedido — e nenhum serviço conhece os dados do
// outro. Essas duas telas carregam a coleção, filtram no cliente e, como o
// filtro descarta linhas, paginam o resultado aqui também.
import SearchIcon from '@mui/icons-material/Search'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useMemo, useState } from 'react'
import { ListContextProvider, Pagination, useListContext } from 'react-admin'

/**
 * Aplica o filtro de negócio no cliente e republica o contexto de lista para os
 * filhos (Datagrid, grade de cards, paginação). A ordem chega já resolvida pelo
 * servidor (`sort` da query) e é preservada; a paginação é refeita aqui, sobre o
 * resultado do filtro: o `perPage` da List serve para buscar a coleção, e a
 * página exibida tem o tamanho próprio desta lista.
 */
export function ListaLocal({ filtrar, children, paginacao = true, porPagina = 24 }) {
  const ctx = useListContext()
  const { data } = ctx
  const [pagina, setPagina]   = useState(1)
  const [tamanho, setTamanho] = useState(porPagina)

  const visiveis = useMemo(() => {
    const base = Array.isArray(data) ? data : []
    return filtrar ? base.filter(filtrar) : base
  }, [data, filtrar])

  const valor = useMemo(() => {
    // A página é limitada ao total filtrado — mudar o filtro não deixa a lista
    // numa página que deixou de existir.
    const paginas = Math.max(1, Math.ceil(visiveis.length / tamanho))
    const atual   = Math.min(pagina, paginas)
    const inicio  = (atual - 1) * tamanho
    return {
      ...ctx,
      data: visiveis.slice(inicio, inicio + tamanho),
      total: visiveis.length,
      page: atual, perPage: tamanho, setPage: setPagina, setPerPage: setTamanho,
      hasPreviousPage: atual > 1, hasNextPage: atual < paginas,
    }
  }, [ctx, visiveis, pagina, tamanho])

  return (
    <ListContextProvider value={valor}>
      {children}
      {paginacao && <Pagination rowsPerPageOptions={[12, 24, 48, 100]} />}
    </ListContextProvider>
  )
}

/** Barra de busca + chips de filtro, com espaço para resumo/controles à direita. */
export function BarraFiltros({ busca, setBusca, placeholder, chips = [], resumo }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
      p: 2, pb: 1.5, borderBottom: '1px solid #E2E8F0',
    }}>
      <TextField
        size="small"
        value={busca}
        onChange={e => setBusca(e.target.value)}
        placeholder={placeholder}
        sx={{ minWidth: 260 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start"><SearchIcon fontSize="small" color="disabled" /></InputAdornment>
            ),
          },
        }}
      />
      <Box sx={{ display: 'flex', gap: .75, flexWrap: 'wrap' }}>
        {chips.map(c => (
          <Chip
            key={c.valor}
            label={c.rotulo}
            size="small"
            onClick={c.onClick}
            variant={c.ativo ? 'filled' : 'outlined'}
            color={c.ativo ? (c.cor || 'primary') : 'default'}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Box>
      <Box sx={{ flex: 1 }} />
      {typeof resumo === 'string'
        ? <Typography variant="body2" color="text.secondary">{resumo}</Typography>
        : resumo}
    </Box>
  )
}
