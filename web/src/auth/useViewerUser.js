import { useAppStore } from '../store/AppStore';
import { useAuth } from './AuthContext';

/**
 * The person whose permissions apply right now. When the View-as viewer IS the signed-in person, that is
 * the API user (role / modules / status from the server); otherwise the in-memory roster record (demo data
 * until the later modules move to the API). `isSelf` says which one you got.
 */
export function useViewerUser() {
  const { state } = useAppStore();
  const { user } = useAuth();
  const isSelf = !!user && state.viewer.name === user.name;
  const me = isSelf ? user : state.users.find(u => u.name === state.viewer.name) || null;
  return { me, isSelf, viewer: state.viewer, authUser: user };
}
