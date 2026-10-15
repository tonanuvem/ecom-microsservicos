import PersonIcon from '@mui/icons-material/Person'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import {
  BooleanInput, Create, Datagrid, Edit,
  EmailField, List, SelectInput, SimpleForm,
  TextInput, useRecordContext,
} from 'react-admin'

export const UsuarioIcon = PersonIcon

const ROLE_COLOR = { ADMIN: 'error', OPERADOR: 'warning', CLIENTE: 'info' }

const RoleChip = () => {
  const record = useRecordContext()
  if (!record) return null
  return <Chip label={record.role} color={ROLE_COLOR[record.role] || 'default'} size="small" />
}

const AtivoChip = () => {
  const record = useRecordContext()
  if (!record) return null
  return <Chip label={record.ativo ? 'Ativo' : 'Inativo'} color={record.ativo ? 'success' : 'default'} size="small" />
}

// Avatar com inicial do nome
const NomeField = () => {
  const record = useRecordContext()
  if (!record) return null
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14, fontWeight: 700 }}>
        {record.nome?.[0]?.toUpperCase()}
      </Avatar>
      <Typography variant="body2" fontWeight={600}>{record.nome}</Typography>
    </Box>
  )
}

const ROLE_CHOICES = [
  { id: 'CLIENTE',  name: 'Cliente'  },
  { id: 'OPERADOR', name: 'Operador' },
  { id: 'ADMIN',    name: 'Admin'    },
]

export const UsuarioList = () => (
  <List perPage={25}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <NomeField label="Nome" />
      <EmailField source="email" label="E-mail" />
      <RoleChip label="Perfil" />
      <AtivoChip label="Status" />
    </Datagrid>
  </List>
)

export const UsuarioCreate = () => (
  <Create redirect="list">
    <SimpleForm>
      <TextInput source="nome"  label="Nome completo" required fullWidth />
      <TextInput source="email" label="E-mail" type="email" required fullWidth />
      <TextInput source="senha" label="Senha" type="password" required />
      <SelectInput source="role" label="Perfil" defaultValue="CLIENTE" choices={ROLE_CHOICES} />
    </SimpleForm>
  </Create>
)

export const UsuarioEdit = () => (
  <Edit redirect="list">
    <SimpleForm>
      <TextInput source="nome"  label="Nome completo" required fullWidth />
      <TextInput source="email" label="E-mail" type="email" required fullWidth />
      <SelectInput source="role" label="Perfil" choices={ROLE_CHOICES} />
      <BooleanInput source="ativo" label="Ativo" />
    </SimpleForm>
  </Edit>
)
