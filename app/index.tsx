/**
 * Root landing page — redirects to /login.
 * The login screen handles role-based routing after authentication:
 *   - field_technician → /agent-home
 *   - nvc_super_admin / nvc_project_manager → /super-admin
 *   - dispatcher / company_admin / manager → /(tabs)
 */
import { Redirect } from "expo-router";

export default function RootIndex() {
  return <Redirect href="/login" />;
}
