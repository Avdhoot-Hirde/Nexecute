import { NavLink, useLocation } from "react-router-dom";
import SecondaryButton from "./SecondaryButton";
import GitHubLogo from "../assets/GitHubLogo.jsx";
import Logo from "./Logo.jsx";
import { useAuthStore } from "../Store/AuthStore.js";
function Navbar({style=null}) {
  const location = useLocation().pathname;
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const loginWithGithub = useAuthStore((state) => state.loginWithGithub);
  
  return (
    <nav className={`nav-surface z-50 flex h-18 w-full items-center justify-between backdrop-blur-md ${style}`}>
      <div className="mx-3 flex min-w-0 items-center [&_svg]:h-auto [&_svg]:w-36 sm:mx-6 sm:[&_svg]:w-44">
        <Logo url="/"/>
      </div>
      <div className="hidden items-center md:flex">
        <ul className="flex justify-center gap-8 text-sm text-shadow-white lg:gap-12">
          <NavLink to="/" className={({isActive})=>`${isActive?"text-violet-400":"text-gray-400 "} transition hover:text-violet-300`}>Home</NavLink>
          <NavLink to="/ide" className={({isActive})=>`${isActive?"text-violet-400":"text-gray-400 "} transition hover:text-violet-300`}>IDE</NavLink>
          <NavLink to="/history" className={({isActive})=>`${isActive?"text-violet-400":"text-gray-400 "} transition hover:text-violet-300`}>History</NavLink>
        </ul>
      </div>
      <div className="mx-3 flex items-center gap-3 text-white sm:mx-6">
        {isAuthenticated ? (
          <>
            <span className="hidden max-w-40 truncate text-sm text-gray-300 lg:inline">
              {user?.gitHubUsername || user?.name || user?.username || user?.email || user?.sub || 'Signed in'}
            </span>
            <button
              type="button"
              onClick={logout}
              className="cursor-pointer rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300 transition hover:border-violet-400/30 hover:text-white sm:px-4"
            >
              Log out
            </button>
          </>
        ) : (
          <>
            {location !== "/login" && <SecondaryButton url="/login" content="Log in" />}
            <button
              type="button"
              onClick={() => loginWithGithub('/ide')}
              className="primary-button flex cursor-pointer justify-center gap-1.5 rounded-lg p-2.5 text-sm sm:px-3"
            >
              <GitHubLogo /> <span className="hidden sm:inline">Sign in with GitHub</span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
