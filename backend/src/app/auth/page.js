import AuthPage from "../../components/auth-page.js";

export const dynamic = "force-dynamic";

export default async function AuthScreen({ searchParams }) {
  const params = await searchParams;
  return <AuthPage initialMode={params?.mode === "signup" ? "signup" : "login"} />;
}
