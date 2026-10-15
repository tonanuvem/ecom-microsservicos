// Caminhos relativos → nginx faz proxy para cada microsserviço.
// Funciona em qualquer IP/domínio sem recompilar o bundle.
export const SERVICES = {
  usuarios:    { label: 'Usuários',     port: 8001, base: '/api/usuarios'     },
  produtos:    { label: 'Produtos',     port: 8002, base: '/api/produtos'     },
  estoque:     { label: 'Estoque',      port: 8003, base: '/api/estoque'      },
  pedidos:     { label: 'Pedidos',      port: 8004, base: '/api/pedidos'      },
  pagamentos:  { label: 'Pagamentos',   port: 8005, base: '/api/pagamentos'   },
  notificacoes:{ label: 'Notificações', port: 8006, base: '/api/notificacoes' },
}
