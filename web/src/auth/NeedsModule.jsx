import { Navigate } from 'react-router-dom';
import { hasModule } from '../data/users';
import { useViewerUser } from './useViewerUser';

/** Only render `children` when the current (View-as) user has the module; otherwise go home. */
export function NeedsModule({ module, children }) {
  const { me } = useViewerUser();
  return hasModule(me, module) ? children : <Navigate to="/" replace />;
}
