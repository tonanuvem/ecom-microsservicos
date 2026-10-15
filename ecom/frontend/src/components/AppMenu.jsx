import ApiIcon from '@mui/icons-material/Api'
import DashboardIcon from '@mui/icons-material/Dashboard'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { Menu } from 'react-admin'
import { EstoqueIcon } from '../resources/Estoque'
import { NotificacaoIcon } from '../resources/Notificacoes'
import { PagamentoIcon } from '../resources/Pagamentos'
import { PedidoIcon } from '../resources/Pedidos'
import { ProdutoIcon } from '../resources/Produtos'
import { UsuarioIcon } from '../resources/Usuarios'
import { SERVICES } from '../services'

const swaggerLinks = [
  { key: 'usuarios',     label: 'Usuários'     },
  { key: 'produtos',     label: 'Produtos'     },
  { key: 'estoque',      label: 'Estoque'      },
  { key: 'pedidos',      label: 'Pedidos'      },
  { key: 'pagamentos',   label: 'Pagamentos'   },
  { key: 'notificacoes', label: 'Notificações' },
]

export default function AppMenu() {
  return (
    <Menu>
      <Menu.DashboardItem primaryText="Dashboard" leftIcon={<DashboardIcon />} />

      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2, py: 0.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing={1}>
          GESTÃO
        </Typography>
      </Box>

      <Menu.Item to="/usuarios"     primaryText="Usuários"     leftIcon={<UsuarioIcon />} />
      <Menu.Item to="/produtos"     primaryText="Produtos"     leftIcon={<ProdutoIcon />} />
      <Menu.Item to="/estoque"      primaryText="Estoque"      leftIcon={<EstoqueIcon />} />
      <Menu.Item to="/pedidos"      primaryText="Pedidos"      leftIcon={<PedidoIcon />} />
      <Menu.Item to="/pagamentos"   primaryText="Pagamentos"   leftIcon={<PagamentoIcon />} />
      <Menu.Item to="/notificacoes" primaryText="Notificações" leftIcon={<NotificacaoIcon />} />

      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2, py: 0.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing={1}>
          API DOCS
        </Typography>
      </Box>
      {swaggerLinks.map(({ key, label }) => (
        <Tooltip key={key} title={`${SERVICES[key].base}/docs`} placement="right">
          <ListItemButton
            component="a"
            href={`${SERVICES[key].base}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ pl: 2, py: 0.5, borderRadius: 2, mx: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 28 }}>
              <ApiIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary={label} primaryTypographyProps={{ variant: 'body2' }} />
          </ListItemButton>
        </Tooltip>
      ))}
    </Menu>
  )
}
