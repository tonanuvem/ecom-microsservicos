import { Admin, Layout, Resource } from 'react-admin'
import authProvider from './authProvider'
import AppFooter from './components/AppFooter'
import AppMenu from './components/AppMenu'
import CustomAppBar from './components/CustomAppBar'
import Dashboard from './components/Dashboard'
import dataProvider from './dataProvider'
import { EstoqueCreate, EstoqueEdit, EstoqueIcon, EstoqueList } from './resources/Estoque'
import { NotificacaoIcon, NotificacaoList, NotificacaoShow } from './resources/Notificacoes'
import { PagamentoCreate, PagamentoEdit, PagamentoIcon, PagamentoList } from './resources/Pagamentos'
import { PedidoCreate, PedidoEdit, PedidoIcon, PedidoList, PedidoShow } from './resources/Pedidos'
import { ProdutoCreate, ProdutoEdit, ProdutoIcon, ProdutoList, ProdutoShow } from './resources/Produtos'
import { UsuarioCreate, UsuarioEdit, UsuarioIcon, UsuarioList } from './resources/Usuarios'
import { ecomTheme } from './theme'

const AppLayout = (props) => (
  <Layout {...props} menu={AppMenu} appBar={CustomAppBar}>
    {props.children}
    <AppFooter />
  </Layout>
)

export default function App() {
  return (
    <Admin
      dataProvider={dataProvider}
      authProvider={authProvider}
      layout={AppLayout}
      theme={ecomTheme}
      dashboard={Dashboard}
      title="E-Commerce Admin"
      requireAuth
    >
      <Resource name="usuarios"     list={UsuarioList}    create={UsuarioCreate}    edit={UsuarioEdit}    icon={UsuarioIcon}    options={{ label: 'Usuários' }} />
      <Resource name="produtos"     list={ProdutoList}    create={ProdutoCreate}    edit={ProdutoEdit}    show={ProdutoShow}    icon={ProdutoIcon}    options={{ label: 'Produtos' }} />
      <Resource name="estoque"      list={EstoqueList}    create={EstoqueCreate}    edit={EstoqueEdit}    icon={EstoqueIcon}    options={{ label: 'Estoque' }} />
      <Resource name="pedidos"      list={PedidoList}     create={PedidoCreate}     edit={PedidoEdit}     show={PedidoShow}     icon={PedidoIcon}     options={{ label: 'Pedidos' }} />
      <Resource name="pagamentos"   list={PagamentoList}  create={PagamentoCreate}  edit={PagamentoEdit}  icon={PagamentoIcon}  options={{ label: 'Pagamentos' }} />
      <Resource name="notificacoes" list={NotificacaoList} show={NotificacaoShow}   icon={NotificacaoIcon} options={{ label: 'Notificações' }} />
    </Admin>
  )
}
