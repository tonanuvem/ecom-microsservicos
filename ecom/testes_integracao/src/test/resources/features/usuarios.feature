# language: pt
Funcionalidade: Serviço de Usuários

  Esquema do Cenário: Cadastro de usuário com dados válidos
    Dado que o serviço de usuários está disponível
    Quando cadastrar um usuário com nome "<nome>", email "<email>" e senha "<senha>"
    Então o status de resposta deve ser <status>

    Exemplos:
      | nome        | email                  | senha       | status |
      | João Silva  | joao@ecom.com          | Senha@123   | 201    |
      | Maria Souza | maria@ecom.com         | Senha@456   | 201    |

  Cenário: Cadastro com email já existente
    Dado que o serviço de usuários está disponível
    E o email "joao@ecom.com" já está cadastrado
    Quando cadastrar um usuário com nome "Outro", email "joao@ecom.com" e senha "Senha@123"
    Então o status de resposta deve ser 409

  Cenário: Login com credenciais válidas
    Dado que o serviço de usuários está disponível
    E o email "joao@ecom.com" já está cadastrado
    Quando realizar login com email "joao@ecom.com" e senha "Senha@123"
    Então o status de resposta deve ser 200
    E a resposta deve conter o campo "access_token"

  Cenário: Login com credenciais inválidas
    Dado que o serviço de usuários está disponível
    Quando realizar login com email "naoexiste@ecom.com" e senha "errada"
    Então o status de resposta deve ser 401

  Cenário: Verificação de saúde do serviço de usuários
    Dado que o serviço de usuários está disponível
    Quando acessar o endpoint de status do serviço de usuários
    Então o status de resposta deve ser 200
