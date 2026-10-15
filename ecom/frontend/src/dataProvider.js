import simpleRestProvider from 'ra-data-simple-rest'
import { fetchUtils } from 'react-admin'
import { SERVICES } from './services'

// httpClient que injeta o JWT em todas as requisições
const httpClient = (url, options = {}) => {
  const token = localStorage.getItem('token')
  const headers = new Headers(options.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetchUtils.fetchJson(url, { ...options, headers })
}

// Cria um dataProvider por microsserviço, usando ra-data-simple-rest
// Cada recurso aponta para base/v1/<recurso> conforme rotas dos backends
const providers = Object.fromEntries(
  Object.entries(SERVICES).map(([key, svc]) => [key, simpleRestProvider(`${svc.base}/v1`, httpClient)])
)

// DataProvider que despacha para o provider correto baseado no nome do recurso
const dataProvider = {
  getList:    (resource, params) => providers[resource]?.getList(resource, params)    ?? Promise.reject(`Recurso desconhecido: ${resource}`),
  getOne:     (resource, params) => providers[resource]?.getOne(resource, params)     ?? Promise.reject(`Recurso desconhecido: ${resource}`),
  getMany:    (resource, params) => providers[resource]?.getMany(resource, params)    ?? Promise.reject(`Recurso desconhecido: ${resource}`),
  getManyReference: (resource, params) => providers[resource]?.getManyReference(resource, params) ?? Promise.reject(),
  create:     (resource, params) => providers[resource]?.create(resource, params)     ?? Promise.reject(`Recurso desconhecido: ${resource}`),
  update:     (resource, params) => providers[resource]?.update(resource, params)     ?? Promise.reject(`Recurso desconhecido: ${resource}`),
  updateMany: (resource, params) => providers[resource]?.updateMany(resource, params) ?? Promise.reject(),
  delete:     (resource, params) => providers[resource]?.delete(resource, params)     ?? Promise.reject(`Recurso desconhecido: ${resource}`),
  deleteMany: (resource, params) => providers[resource]?.deleteMany(resource, params) ?? Promise.reject(),

  // Fora do CRUD do react-admin: o status do pedido tem rota própria no
  // serviço (PATCH /v1/pedidos/{id}/status), e não um PUT do recurso inteiro —
  // usuario_id, itens e total são snapshot da compra. Chamado pela tela de
  // detalhe de Pedidos via useDataProvider().
  atualizarStatusPedido: (id, status) =>
    httpClient(`${SERVICES.pedidos.base}/v1/pedidos/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }).then(({ json }) => ({ data: json })),
}

export default dataProvider
