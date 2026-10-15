// Smoke tests das telas principais com um dataProvider falso em memória.
// Garantem que Dashboard, lista/detalhe de Pedidos e catálogo de Produtos
// montam e exibem os números derivados dos dados.
import { render, screen, within } from '@testing-library/react'
import { AdminContext, ResourceContextProvider } from 'react-admin'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Dashboard from './components/Dashboard'
import { PedidoList, PedidoShow } from './resources/Pedidos'
import { ProdutoList } from './resources/Produtos'

const USUARIOS = [
  { id: 'u1', nome: 'Ana Lima',  email: 'ana@ecom.com',  role: 'CLIENTE', ativo: true },
  { id: 'u2', nome: 'Bruno Sá',  email: 'bruno@ecom.com', role: 'CLIENTE', ativo: true },
]

const PRODUTOS = [
  { id: 'p1', nome: 'Monitor 27 polegadas', preco: 3299.9, ativo: true, descricao: 'IPS 144Hz', imagem_url: null },
  { id: 'p2', nome: 'Teclado Mecanico TKL', preco: 499.9,  ativo: true, descricao: 'Switch azul', imagem_url: null },
  { id: 'p3', nome: 'Webcam Full HD',       preco: 299.9,  ativo: true, descricao: '1080p',       imagem_url: null },
  { id: 'p4', nome: 'Mousepad Descontinuado', preco: 79.9, ativo: false, descricao: 'fora de linha', imagem_url: null },
]

const hoje = new Date().toISOString().slice(0, 10)

const PEDIDOS = [
  {
    id: 'ped-confirmado-1', usuario_id: 'u1', status: 'CONFIRMADO', total: 4299.7,
    criado_em: `${hoje} 10:00:00.000000`,
    itens: [
      { produto_id: 'p1', nome_produto: 'Monitor 27 polegadas', preco_unit: 3299.9, quantidade: 1 },
      { produto_id: 'p2', nome_produto: 'Teclado Mecanico TKL', preco_unit: 499.9,  quantidade: 2 },
    ],
  },
  {
    id: 'ped-pendente-1', usuario_id: 'u2', status: 'PENDENTE', total: 299.9,
    criado_em: `${hoje} 11:00:00.000000`,
    itens: [{ produto_id: 'p3', nome_produto: 'Webcam Full HD', preco_unit: 299.9, quantidade: 1 }],
  },
  {
    id: 'ped-cancelado-1', usuario_id: 'u1', status: 'CANCELADO', total: 499.9,
    criado_em: `${hoje} 12:00:00.000000`,
    itens: [{ produto_id: 'p2', nome_produto: 'Teclado Mecanico TKL', preco_unit: 499.9, quantidade: 1 }],
  },
]

const COLECOES = {
  usuarios:     USUARIOS,
  produtos:     PRODUTOS,
  pedidos:      PEDIDOS,
  estoque:      [
    { id: 'e1', produto_id: 'p1', quantidade: 3 },
    { id: 'e2', produto_id: 'p2', quantidade: 40 },
    { id: 'e3', produto_id: 'p3', quantidade: 0 },
  ],
  pagamentos:   [{ id: 'pg1', pedido_id: 'ped-confirmado-1', status: 'APROVADO', valor: 4299.7 }],
  notificacoes: [{ id: 'n1', tipo: 'PEDIDO_CONFIRMADO', status: 'ENVIADO', destinatario_email: 'ana@ecom.com' }],
}

// Imita o contrato dos serviços no que as telas dependem: produtos inativos só
// aparecem quando a listagem pede `incluir_inativos`.
const listar = (recurso, filter = {}) => {
  const colecao = COLECOES[recurso] || []
  if (recurso !== 'produtos' || filter.incluir_inativos) return colecao
  return colecao.filter(p => p.ativo)
}

const dataProviderFalso = {
  getList:  (recurso, params = {}) => {
    const data = listar(recurso, params.filter)
    return Promise.resolve({ data, total: data.length })
  },
  getOne:   (recurso, { id }) => Promise.resolve({ data: (COLECOES[recurso] || []).find(r => r.id === id) }),
  getMany:  (recurso, { ids }) => Promise.resolve({ data: (COLECOES[recurso] || []).filter(r => ids.includes(r.id)) }),
  getManyReference: () => Promise.resolve({ data: [], total: 0 }),
  create: () => Promise.resolve({ data: {} }),
  update: () => Promise.resolve({ data: {} }),
  updateMany: () => Promise.resolve({ data: [] }),
  delete: () => Promise.resolve({ data: {} }),
  deleteMany: () => Promise.resolve({ data: [] }),
}

function montar(ui, { rota = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <AdminContext dataProvider={dataProviderFalso}>{ui}</AdminContext>
    </MemoryRouter>,
  )
}

describe('Dashboard', () => {
  it('apresenta a receita confirmada e os indicadores derivados', async () => {
    montar(<Dashboard />)

    // Receita confirmada = total dos pedidos CONFIRMADO
    expect((await screen.findAllByText('R$ 4.299,70')).length).toBeGreaterThan(0)
    expect(screen.getByText(/Receita confirmada ·/i)).toBeInTheDocument()

    // Conversão = 1 confirmado de 3 pedidos
    expect(await screen.findByText('1 de 3 pedidos')).toBeInTheDocument()

    // Ruptura detectada (Webcam com quantidade 0)
    expect(await screen.findByText(/1 SKU\(s\) em ruptura/)).toBeInTheDocument()

    // Receita em risco = total dos pendentes
    expect(screen.getByText(/1 pedido\(s\) pendentes/)).toBeInTheDocument()
  })

  it('lista o produto de maior receita no ranking', async () => {
    montar(<Dashboard />)
    expect(await screen.findByText('Top produtos por receita')).toBeInTheDocument()
    expect((await screen.findAllByText('Monitor 27 polegadas')).length).toBeGreaterThan(0)
  })
})

describe('Pedidos', () => {
  it('mostra cliente, itens e status na listagem', async () => {
    montar(
      <ResourceContextProvider value="pedidos">
        <PedidoList />
      </ResourceContextProvider>,
    )

    // Ana aparece nas duas linhas em que é a cliente
    expect((await screen.findAllByText('Ana Lima')).length).toBe(2)
    expect(await screen.findByText('Bruno Sá')).toBeInTheDocument()
    expect(await screen.findByText('2 itens · 3 un.')).toBeInTheDocument()
    expect((await screen.findAllByText('1 item · 1 un.')).length).toBe(2)
  })

  it('abre o detalhe com os produtos que compõem o pedido', async () => {
    montar(
      <Routes>
        <Route path="/pedidos/:id/show" element={
          <ResourceContextProvider value="pedidos"><PedidoShow /></ResourceContextProvider>
        } />
      </Routes>,
      { rota: '/pedidos/ped-confirmado-1/show' },
    )

    expect(await screen.findByText('Produtos do pedido')).toBeInTheDocument()
    const tabela = screen.getByRole('table')
    expect(within(tabela).getByText('Monitor 27 polegadas')).toBeInTheDocument()
    expect(within(tabela).getByText('Teclado Mecanico TKL')).toBeInTheDocument()
    // Subtotal do item: 2 × 499,90
    expect(within(tabela).getByText('R$ 999,80')).toBeInTheDocument()
  })
})

describe('Produtos', () => {
  it('exibe o catálogo com estoque e totais de negócio', async () => {
    montar(
      <ResourceContextProvider value="produtos">
        <ProdutoList />
      </ResourceContextProvider>,
    )

    expect(await screen.findByText('Monitor 27 polegadas')).toBeInTheDocument()
    expect(await screen.findByText('Ruptura')).toBeInTheDocument()       // Webcam, estoque 0
    expect(await screen.findByText('3 un. — crítico')).toBeInTheDocument() // Monitor, estoque 3
    expect(screen.getByText('Capital em estoque')).toBeInTheDocument()
  })

  it('mostra os produtos desativados com o selo Inativo', async () => {
    montar(
      <ResourceContextProvider value="produtos">
        <ProdutoList />
      </ResourceContextProvider>,
    )

    // O catálogo do admin pede incluir_inativos — a vitrine esconderia este item
    expect(await screen.findByText('Mousepad Descontinuado')).toBeInTheDocument()
    expect(screen.getByText('Inativo')).toBeInTheDocument()
  })
})
