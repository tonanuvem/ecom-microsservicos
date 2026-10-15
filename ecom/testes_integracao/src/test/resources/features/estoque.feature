# language: pt
Funcionalidade: Serviço de Estoque

  Cenário: Verificação de saúde do serviço de estoque
    Dado que o serviço de estoque está disponível
    Quando acessar o endpoint de status do serviço de estoque
    Então o status de resposta deve ser 200

  Esquema do Cenário: Verificar disponibilidade de produto
    Dado que o serviço de estoque está disponível
    Quando verificar disponibilidade do produto "<produto_id>"
    Então o status de resposta deve ser <status>

    Exemplos:
      | produto_id                           | status |
      | 00000000-0000-0000-0000-000000000001 | 200    |
      | 00000000-0000-0000-0000-000000000002 | 200    |

  Cenário: Reservar estoque para pedido
    Dado que o serviço de estoque está disponível
    E estou autenticado como administrador
    Quando atualizar a quantidade do produto "00000000-0000-0000-0000-000000000001" para 100
    E reservar 1 unidade do produto "00000000-0000-0000-0000-000000000001" para o pedido "pedido-teste-001"
    Então o status de resposta deve ser 201

  Cenário: Atualizar quantidade em estoque
    Dado que o serviço de estoque está disponível
    E estou autenticado como administrador
    Quando atualizar a quantidade do produto "00000000-0000-0000-0000-000000000001" para 100
    Então o status de resposta deve ser 200
