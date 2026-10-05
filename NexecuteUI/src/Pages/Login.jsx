import { useState,useEffect } from "react";
import { Navigate, useLocation, useNavigate,useSearchParams  } from "react-router-dom";
import { GitHubLogo } from "../assets";
// import Logo from "../components/Logo";
import { useAuthStore } from "../Store/AuthStore";
import Icon from "../components/Icon";

function Login() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [signUp, setSignUp] = useState(false);
  const [loginForm, setLoginForm] = useState({ userName: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    userName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const loginWithGithub = useAuthStore((state) => state.loginWithGithub);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const storeError = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const returnTo = location.state?.from || "/ide";

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError === "oauth_failed") {
      setFormError("GitHub sign-in failed. Please try again.");
      searchParams.delete("error");
      setSearchParams(searchParams, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isAuthenticated) return <Navigate to={returnTo} replace />;

  async function handleLogin(event) {
    event.preventDefault();
    setFormError("");
    try {
      await login(loginForm);
      navigate(returnTo, { replace: true });
    } catch {
      // The store exposes the API error below the form.
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setFormError("");
    setNotice("");
    if (registerForm.password !== registerForm.confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }
    try {
      const user = await register(registerForm);
      if (user) {
        navigate(returnTo, { replace: true });
      } else {
        setNotice("Account created. You can now log in.");
        setSignUp(false);
      }
    } catch {
      // The store exposes the API error below the form.
    }
  }

  function showSignUp(value) {
    clearError();
    setFormError("");
    setNotice("");
    setSignUp(value);
  }

  return (
    <div className="min-h-screen w-full flex justify-center pt-36 text-white">
      <div className="w-full max-w-md h-fit bg-slate-900 border border-gray-700 rounded-lg flex-col justify-center mb-12">
        <div>
          <div className="flex justify-center my-6">
            <Icon />
          </div>
          {(!signUp && (
            <div>
              <form
                onSubmit={handleLogin}
                className="flex flex-col gap-4 items-center"
              >
                <input
                  type="text"
                  name="userName"
                  placeholder="Username"
                  autoComplete="userName"
                  required
                  value={loginForm.userName}
                  onChange={(event) =>
                    setLoginForm({ ...loginForm, userName: event.target.value })
                  }
                  className="border border-gray-700 p-3 bg-slate-800 rounded-xl w-5/6"
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Enter Password"
                  autoComplete="current-password"
                  required
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm({ ...loginForm, password: event.target.value })
                  }
                  className="bg-slate-800 border border-gray-700 p-3 rounded-xl w-5/6"
                />
                {(formError || storeError) && (
                  <p className="w-5/6 text-sm text-red-400" role="alert">
                    {formError || storeError}
                  </p>
                )}
                {notice && (
                  <p className="w-5/6 text-sm text-green-400">{notice}</p>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-6 mb-3 p-3 bg-white text-black rounded-sm w-5/6 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? "Logging in..." : "Login"}
                </button>
              </form>
              <div className="flex flex-col items-center mb-8">
                <button
                  type="button"
                  onClick={() => loginWithGithub(returnTo)}
                  className="w-5/6 bg-violet-600 p-3 rounded-sm flex gap-2 justify-center cursor-pointer"
                >
                  <GitHubLogo /> Sign in with GitHub
                </button>
                <button
                  className="border border-gray-600 rounded-sm py-3 px-4 w-5/6 mt-3 flex justify-center cursor-pointer"
                  onClick={() => showSignUp(true)}
                >
                  Sign up
                </button>
              </div>
            </div>
          )) || (
            <div className="pb-8">
              <form
                onSubmit={handleRegister}
                className="flex flex-col gap-4 items-center"
              >
                <input
                  type="text"
                  name="userName"
                  placeholder="Username"
                  autoComplete="userName"
                  required
                  value={registerForm.userName}
                  onChange={(event) =>
                    setRegisterForm({
                      ...registerForm,
                      userName: event.target.value,
                    })
                  }
                  className="border border-gray-700 p-3 bg-slate-800 rounded-xl w-5/6"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="E-mail address"
                  autoComplete="email"
                  required
                  value={registerForm.email}
                  onChange={(event) =>
                    setRegisterForm({
                      ...registerForm,
                      email: event.target.value,
                    })
                  }
                  className="bg-slate-800 border border-gray-700 p-3 rounded-xl w-5/6"
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Enter Password"
                  autoComplete="new-password"
                  minLength="8"
                  required
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm({
                      ...registerForm,
                      password: event.target.value,
                    })
                  }
                  className="bg-slate-800 border border-gray-700 p-3 rounded-xl w-5/6"
                />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  autoComplete="new-password"
                  minLength="8"
                  required
                  value={registerForm.confirmPassword}
                  onChange={(event) =>
                    setRegisterForm({
                      ...registerForm,
                      confirmPassword: event.target.value,
                    })
                  }
                  className="bg-slate-800 border border-gray-700 p-3 rounded-xl w-5/6"
                />
                {(formError || storeError) && (
                  <p className="w-5/6 text-sm text-red-400" role="alert">
                    {formError || storeError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-6 mb-3 p-3 bg-white text-black rounded-sm w-5/6 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? "Creating account..." : "Sign Up"}
                </button>
              </form>
              <div className="flex gap-5 justify-center">
                <p className="text-gray-400">Have account?</p>
                <button
                  onClick={() => showSignUp(false)}
                  className="cursor-pointer"
                >
                  Log in
                </button>
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-gray-400">Or sign in with</p>
                <button
                  type="button"
                  onClick={() => loginWithGithub(returnTo)}
                  aria-label="Sign in with GitHub"
                  className="cursor-pointer"
                >
                  <GitHubLogo />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
