# language: pt
Funcionalidade: Serviço de Pagamentos

  Cenário: Verificação de saúde do serviço de pagamentos
    Dado que o serviço de pagamentos está disponível
    Quando acessar o endpoint de status do serviço de pagamentos
    Então o status de resposta deve ser 200

  Cenário: Iniciar sessão de pagamento para pedido existente
    Dado que o serviço de pagamentos está disponível
    E estou autenticado como cliente
    Quando iniciar sessão de pagamento para o pedido "pedido-teste-001"
    Então o status de resposta deve ser 201
    E a resposta deve conter o campo "sessao_id"

  Cenário: Webhook de pagamento aprovado com idempotência
    Dado que o serviço de pagamentos está disponível
    Quando receber webhook de pagamento aprovado com chave "idem-key-001" para o pedido "pedido-teste-001"
    Então o status de resposta deve ser 200
    Quando receber webhook de pagamento aprovado com chave "idem-key-001" para o pedido "pedido-teste-001"
    Então o status de resposta deve ser 200

  Esquema do Cenário: Webhook com diferentes resultados
    Dado que o serviço de pagamentos está disponível
    Quando receber webhook com status "<resultado>" para o pedido "<pedido_id>"
    Então o status de resposta deve ser <http_status>

    Exemplos:
      | resultado | pedido_id        | http_status |
      | APROVADO  | pedido-teste-002 | 200         |
      | RECUSADO  | pedido-teste-003 | 200         |
