# language: pt
Funcionalidade: Serviço de Notificações

  Cenário: Verificação de saúde do serviço de notificações
    Dado que o serviço de notificações está disponível
    Quando acessar o endpoint de status do serviço de notificações
    Então o status de resposta deve ser 200

  Esquema do Cenário: Enviar notificação por tipo
    Dado que o serviço de notificações está disponível
    E estou autenticado como administrador
    Quando enviar notificação do tipo "<tipo>" para o email "<email>"
    Então o status de resposta deve ser <status>

    Exemplos:
      | tipo                  | email           | status |
      | PEDIDO_CONFIRMADO     | user@ecom.com   | 202    |
      | PAGAMENTO_RECUSADO    | user@ecom.com   | 202    |
      | PEDIDO_CANCELADO      | user@ecom.com   | 202    |
