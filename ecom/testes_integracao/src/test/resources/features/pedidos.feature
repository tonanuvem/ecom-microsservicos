# language: pt
Funcionalidade: Serviço de Pedidos

  Cenário: Verificação de saúde do serviço de pedidos
    Dado que o serviço de pedidos está disponível
    Quando acessar o endpoint de status do serviço de pedidos
    Então o status de resposta deve ser 200

  Cenário: Criar pedido autenticado
    Dado que o serviço de pedidos está disponível
    E estou autenticado como cliente
    Quando criar um pedido com o produto "00000000-0000-0000-0000-000000000001" quantidade 1
    Então o status de resposta deve ser 201
    E a resposta deve conter o campo "id"
    E a resposta deve conter o campo "status"

  Cenário: Criar pedido sem autenticação
    Dado que o serviço de pedidos está disponível
    Quando criar um pedido sem autenticação
    Então o status de resposta deve ser 401

  Cenário: Buscar pedido por ID
    Dado que o serviço de pedidos está disponível
    E estou autenticado como cliente
    Quando buscar o pedido com id "00000000-0000-0000-0000-000000000000"
    Então o status de resposta deve ser 404

  Esquema do Cenário: Listar pedidos do usuário autenticado
    Dado que o serviço de pedidos está disponível
    E estou autenticado como "<perfil>"
    Quando listar meus pedidos
    Então o status de resposta deve ser <status>

    Exemplos:
      | perfil        | status |
      | cliente       | 200    |
      | administrador | 200    |
