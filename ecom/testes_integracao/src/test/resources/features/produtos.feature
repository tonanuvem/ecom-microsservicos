# language: pt
Funcionalidade: Serviço de Produtos

  Cenário: Verificação de saúde do serviço de produtos
    Dado que o serviço de produtos está disponível
    Quando acessar o endpoint de status do serviço de produtos
    Então o status de resposta deve ser 200

  Cenário: Listar produtos sem autenticação
    Dado que o serviço de produtos está disponível
    Quando listar os produtos sem autenticação
    Então o status de resposta deve ser 200
    E a resposta deve ser uma lista

  Esquema do Cenário: Criar produto como administrador
    Dado que o serviço de produtos está disponível
    E estou autenticado como administrador
    Quando criar um produto com nome "<nome>" e preço <preco>
    Então o status de resposta deve ser <status>

    Exemplos:
      | nome          | preco  | status |
      | Notebook Pro  | 4999.9 | 201    |
      | Mouse Gamer   | 299.9  | 201    |

  Cenário: Buscar produto por ID inexistente
    Dado que o serviço de produtos está disponível
    Quando buscar o produto com id "00000000-0000-0000-0000-000000000000"
    Então o status de resposta deve ser 404
