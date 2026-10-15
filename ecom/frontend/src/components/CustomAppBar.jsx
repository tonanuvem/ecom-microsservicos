import StorefrontIcon from '@mui/icons-material/Storefront'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { AppBar, TitlePortal, UserMenu } from 'react-admin'

export default function CustomAppBar() {
  return (
    <AppBar userMenu={<UserMenu />} sx={{ px: 2 }}>
      {/* Logo + nome da loja */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
        <StorefrontIcon sx={{ color: '#fff', fontSize: 28 }} />
        <Typography variant="h6" fontWeight={800} color="#fff" noWrap>
          E-Commerce
        </Typography>
      </Box>
      {/* Título da página atual (injetado pelo react-admin) */}
      <TitlePortal />
    </AppBar>
  )
}
