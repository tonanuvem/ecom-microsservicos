import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { SERVICES } from '../services'

function ServiceStatus({ svc }) {
  const [ok, setOk] = useState(null)

  useEffect(() => {
    fetch(`${svc.base}/status`, { signal: AbortSignal.timeout(3000) })
      .then(r => setOk(r.ok))
      .catch(() => setOk(false))
  }, [svc.base])

  return (
    <Tooltip title={`${svc.base}/status`}>
      <Chip
        icon={ok === null ? null : ok ? <CheckCircleIcon fontSize="small" /> : <ErrorIcon fontSize="small" />}
        label={svc.label}
        color={ok === null ? 'default' : ok ? 'success' : 'error'}
        size="small" variant="outlined"
        sx={{ fontSize: '0.7rem' }}
      />
    </Tooltip>
  )
}

export default function AppFooter() {
  return (
    <Box component="footer" sx={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center',
      gap: 1, px: 2, py: 1,
      borderTop: '1px solid #E2E8F0',
      bgcolor: '#FAFAFA',
      justifyContent: 'space-between',
    }}>
      <Typography variant="caption" color="text.secondary">
        © 2026 E-Commerce Admin
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {Object.entries(SERVICES).map(([key, svc]) => (
          <ServiceStatus key={key} svc={svc} />
        ))}
      </Box>
    </Box>
  )
}
