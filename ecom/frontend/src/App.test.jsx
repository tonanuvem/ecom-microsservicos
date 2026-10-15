import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Mock do react-admin para isolar o teste unitário do Admin
vi.mock('react-admin', () => ({
  Admin: ({ children }) => <div data-testid="admin">{children}</div>,
  Resource: ({ name }) => <div data-testid={`resource-${name}`} />,
  Layout: ({ children }) => <div>{children}</div>,
  Menu: Object.assign(({ children }) => <nav>{children}</nav>, {
    Item: ({ primaryText }) => <a>{primaryText}</a>,
  }),
  defaultTheme: { components: {} },
  useRecordContext: () => ({}),
  List: ({ children }) => <div>{children}</div>,
  Datagrid: ({ children }) => <table><tbody>{children}</tbody></table>,
  TextField: () => <td />,
  EmailField: () => <td />,
  BooleanField: () => <td />,
  NumberField: () => <td />,
  Create: ({ children }) => <div>{children}</div>,
  Edit: ({ children }) => <div>{children}</div>,
  Show: ({ children }) => <div>{children}</div>,
  SimpleForm: ({ children }) => <form>{children}</form>,
  SimpleShowLayout: ({ children }) => <div>{children}</div>,
  TextInput: () => <input />,
  NumberInput: () => <input type="number" />,
  BooleanInput: () => <input type="checkbox" />,
  SelectInput: () => <select />,
}))

vi.mock('./authProvider', () => ({ default: {} }))
vi.mock('./dataProvider', () => ({ default: {} }))

import App from './App'

describe('App', () => {
  it('renderiza o componente Admin', () => {
    render(<App />)
    expect(screen.getByTestId('admin')).toBeInTheDocument()
  })

  it('registra os 6 recursos de microsserviços', () => {
    render(<App />)
    const recursos = ['usuarios', 'produtos', 'estoque', 'pedidos', 'pagamentos', 'notificacoes']
    recursos.forEach(r => expect(screen.getByTestId(`resource-${r}`)).toBeInTheDocument())
  })
})
