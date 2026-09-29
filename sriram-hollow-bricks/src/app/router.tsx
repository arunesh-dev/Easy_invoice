import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './AppShell'
import { ProtectedRoute } from './ProtectedRoute'
import { BusinessLayout } from '@/features/business/BusinessLayout'
import Login from '@/features/auth/pages/Login'
import SignUp from '@/features/auth/pages/SignUp'
import Dashboard from '@/features/analytics/pages/Dashboard'
import Customers from '@/features/customers/pages/Customers'
import Invoices from '@/features/invoices/pages/Invoices'
import Expenses from '@/features/expenses/pages/Expenses'
import Settings from '@/features/settings/pages/Settings'
import CustomerNew from '@/features/customers/pages/CustomerNew'
import CustomerEdit from '@/features/customers/pages/CustomerEdit'
import CustomerDetail from '@/features/customers/pages/CustomerDetail'
import Products from '@/features/products/pages/Products'
import ProductNew from '@/features/products/pages/ProductNew'
import ProductEdit from '@/features/products/pages/ProductEdit'
import CreateInvoice from '@/features/invoices/pages/CreateInvoice'
import InvoiceDetail from '@/features/invoices/pages/InvoiceDetail'
import RecordPayment from '@/features/invoices/pages/RecordPayment'
import NewExpense from '@/features/expenses/pages/NewExpense'
import EditExpense from '@/features/expenses/pages/EditExpense'
import Analytics from '@/features/analytics/pages/Analytics'
import BusinessProfile from '@/features/settings/pages/BusinessProfile'
import Privacy from '@/features/legal/pages/Privacy'
import SeedPage from '@/features/dev/SeedPage'
import AccountSecurity from '@/features/account/pages/AccountSecurity'

const devRoutes = import.meta.env.DEV
  ? [{ path: '/dev/seed', element: <SeedPage /> }]
  : []

export const router = createBrowserRouter([
  { path: '/privacy', element: <Privacy /> },
  { path: '/login',  element: <Login /> },
  { path: '/signup', element: <SignUp /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <BusinessLayout />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/',         element: <Navigate to="/home" replace /> },
              { path: '/home',     element: <Dashboard /> },
              { path: '/customers',            element: <Customers /> },
              { path: '/customers/new',        element: <CustomerNew /> },
              { path: '/customers/:id',        element: <CustomerDetail /> },
              { path: '/customers/:id/edit',   element: <CustomerEdit /> },
              { path: '/products',             element: <Products /> },
              { path: '/products/new',         element: <ProductNew /> },
              { path: '/products/:id/edit',    element: <ProductEdit /> },
              { path: '/invoices',             element: <Invoices /> },
              { path: '/invoices/new',         element: <CreateInvoice /> },
              { path: '/invoices/:id',         element: <InvoiceDetail /> },
              { path: '/invoices/:id/payments/new', element: <RecordPayment /> },
              { path: '/expenses',             element: <Expenses /> },
              { path: '/expenses/new',         element: <NewExpense /> },
              { path: '/expenses/:id/edit',    element: <EditExpense /> },
              { path: '/analytics',            element: <Analytics /> },
              { path: '/settings',             element: <Settings /> },
              { path: '/settings/business',    element: <BusinessProfile /> },
              { path: '/settings/account',     element: <AccountSecurity /> },
              ...devRoutes,
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/home" replace /> },
])
