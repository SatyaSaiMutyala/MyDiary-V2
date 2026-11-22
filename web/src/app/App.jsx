import { ThemeProvider, CssBaseline } from '@mui/material';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import theme from '../theme/theme';
import { store } from '../store/redux/store';
import { AppStoreProvider } from '../store/AppStore';
import { AuthProvider } from '../auth/AuthContext';
import { CrumbsProvider } from '../store/CrumbsContext';
import router from './router';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Provider store={store}>
        <AuthProvider>
          <AppStoreProvider>
            <CrumbsProvider>
              <RouterProvider router={router} />
            </CrumbsProvider>
          </AppStoreProvider>
        </AuthProvider>
      </Provider>
    </ThemeProvider>
  );
}
