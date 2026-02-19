import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import { ShoppingCart, Share2, Package, LayoutDashboard, LogOut, Users, PieChart, ClipboardCheck, ReceiptText, CloudOff, Truck, Receipt, BookOpen } from 'lucide-react';
import POS from './pages/POS';
import Login from './pages/Login';
import Branches from './pages/Branches';
import Products from './pages/Products';
import Customers from './pages/Customers';
import CustomerDetails from './pages/CustomerDetails';
import InventoryPage from './pages/Inventory';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import DailyReconciliation from './pages/DailyReconciliation';
import Sales from './pages/Sales';
import SyncQueue from './pages/SyncQueue';
import Suppliers from './pages/Suppliers';
import Expenses from './pages/Expenses';
import Accounts from './pages/Accounts';
import { useSyncWorker } from './lib/syncWorker';
import { BRAND_LOGO_URL, BRAND_LOGO_WIDTH_PX, BRAND_NAME } from './lib/brand';

// Placeholder components removed

// Layout Wrapper
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { appUser, logout } = useAuth();
  const location = useLocation();

  useSyncWorker({
    enabled: !!appUser,
    companyId: 'demo-company',
    branchId: appUser?.branchIds?.[0],
    userId: appUser?.uid,
    intervalMs: 15000,
  });

  const isActive = (path: string) => location.pathname === path ? 'bg-emerald-50 text-[hsl(var(--color-primary))] font-medium' : 'text-gray-600 hover:bg-gray-50';

  return (
    <div className="min-h-screen bg-[rgb(var(--color-background))] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6">
          <img
            src={BRAND_LOGO_URL}
            alt={BRAND_NAME}
            width={BRAND_LOGO_WIDTH_PX}
            className="h-auto"
          />
          <div className="font-bold text-lg text-[hsl(var(--color-primary))] tracking-tight mt-3">{BRAND_NAME}</div>
          <div className="text-xs text-gray-400 mt-1">v1.0.0 (Sprint 1)</div>
        </div>

        <div className="px-6 py-2">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Menu</div>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3">
          <Link to="/" className={`px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${isActive('/')}`}>
            <ShoppingCart size={20} />
            <span>POS</span>
          </Link>
          <Link to="/sales" className={`px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${isActive('/sales')}`}>
            <ReceiptText size={20} />
            <span>Sales</span>
          </Link>
          <Link to="/products" className={`px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${isActive('/products')}`}>
            <Package size={20} />
            <span>Products</span>
          </Link>
          <Link to="/branches" className={`px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${isActive('/branches')}`}>
            <Share2 size={20} />
            <span>Branches</span>
          </Link>
          <Link to="/customers" className={`px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${isActive('/customers')}`}>
            <Users size={20} />
            <span>Customers</span>
          </Link>
          <Link to="/inventory" className={`px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${isActive('/inventory')}`}>
            <Package size={20} />
            <span>Inventory</span>
          </Link>

          <div className="px-4 pt-4 pb-1">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Accounting</div>
          </div>
          <Link to="/accounts" className={`px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${isActive('/accounts')}`}>
            <BookOpen size={20} />
            <span>Accounts</span>
          </Link>
          <Link to="/suppliers" className={`px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${isActive('/suppliers')}`}>
            <Truck size={20} />
            <span>Suppliers</span>
          </Link>
          <Link to="/expenses" className={`px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${isActive('/expenses')}`}>
            <Receipt size={20} />
            <span>Expenses</span>
          </Link>

          <div className="px-4 pt-4 pb-1">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">System</div>
          </div>
          <Link to="/reports" className={`px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${isActive('/reports')}`}>
            <PieChart size={20} />
            <span>Reports</span>
          </Link>
          <Link to="/reconcile" className={`px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${isActive('/reconcile')}`}>
            <ClipboardCheck size={20} />
            <span>Close Day</span>
          </Link>
          <Link to="/sync" className={`px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${isActive('/sync')}`}>
            <CloudOff size={20} />
            <span>Sync Queue</span>
          </Link>
          <Link to="/dashboard" className={`px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${isActive('/dashboard')}`}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
        </nav>

        <div className="p-4 m-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[hsl(var(--color-primary))] text-white flex items-center justify-center font-bold">
              {appUser?.email?.[0].toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-gray-800 truncate">{appUser?.email}</div>
              <div className="text-xs text-gray-500">{appUser?.role}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full py-2 bg-white border border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-100 text-gray-600 text-sm rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50/50">
        {children}
      </main>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--color-primary))]"></div></div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout>
                <POS />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/products" element={
            <ProtectedRoute>
              <AppLayout>
                <Products />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/sales" element={
            <ProtectedRoute>
              <AppLayout>
                <Sales />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/branches" element={
            <ProtectedRoute>
              <AppLayout>
                <Branches />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/customers" element={
            <ProtectedRoute>
              <AppLayout>
                <Customers />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/customers/:id" element={
            <ProtectedRoute>
              <AppLayout>
                <CustomerDetails />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/inventory" element={
            <ProtectedRoute>
              <AppLayout>
                <InventoryPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/reports" element={
            <ProtectedRoute>
              <AppLayout>
                <Reports />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/reconcile" element={
            <ProtectedRoute>
              <AppLayout>
                <DailyReconciliation />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/sync" element={
            <ProtectedRoute>
              <AppLayout>
                <SyncQueue />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/suppliers" element={
            <ProtectedRoute>
              <AppLayout>
                <Suppliers />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/expenses" element={
            <ProtectedRoute>
              <AppLayout>
                <Expenses />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/accounts" element={
            <ProtectedRoute>
              <AppLayout>
                <Accounts />
              </AppLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
