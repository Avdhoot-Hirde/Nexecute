import Button from "../components/Button";
import Card from "../components/Card";
import CodeEditor from "../components/CodeEditor";
import {
  SandBoxIcon,
  AiIcon,
  LSPIcon,
  GitHubIcon,
  GitHubLogo,
} from "../assets/index";
import { EditorProvider } from "../context/EditorProvider";
import Logo from "../components/Logo";
import { NavLink } from "react-router-dom";
function Home() {
  const features = [
    {
      heading: "Multi-Language",
      body: "Docker containers per submission 128MB memory cap, 0.5 CPU quota, all capabilities dropped, dual timeout enforcement. Auto-removed after every run.",
      logo: SandBoxIcon(),
      accent: "#8b5cf6",
    },
    {
      heading: "AI-Powered Assistance",
      body: "Async error explanations via Gemini API, triggered on non-zero exit. Responses cached in Redis by (code + stderr) hash; rate-limited independently of execution.",
      logo: AiIcon(),
      accent: "#22d3ee",
    },
    {
      heading: "Real-Time IntelliSense",
      body: "Java completions served by jdtls (Eclipse JDT Language Server), bridged to Monaco over WebSocket via LSP — the same engine VS Code uses.",
      logo: LSPIcon(),
      accent: "#34d399",
    },
    {
      heading: "GitHub Integration",
      body: "OAuth2 login via Spring Security, encrypted tokens at rest. Commits pushed through the GitHub Contents API with SHA-based conflict detection.",
      logo: GitHubIcon(),
      accent: "#e879f9",
    },
  ];
  return (
    <div className="home-shell text-white min-h-screen mt-18">

      {/* Home page and trial editor section */}
      <section id="home" className="hero-section flex flex-col xl:flex-row justify-between scroll-mt-20">
        <div className="mx-6 lg:mx-16 py-20 relative z-10">
          <div className="eyebrow-badge text-xs mb-6 rounded-full w-fit py-2.5 px-4">
            Build. Run. Debug. Ship
          </div>
          <div className="hero-title text-5xl lg:text-7xl">Your <span>All-in-one</span></div>
          <div className="hero-title text-5xl lg:text-7xl">Coding Workspace</div>
          <p className="text-slate-400 mt-5 text-lg leading-8">
            Code run and ship your project with powerfull online IDE,
            <br />
            AI assistance, and seamless GitHub integration
          </p>
          <div className=" w-fit mt-10 flex gap-4">
            <Button
              url="/login"
              content="Get Started ->"
              llogo={GitHubLogo()}
            />
          </div>
        </div>

        <div className="my-10 w-full xl:w-1/2 flex justify-center xl:justify-end relative z-10">
          <div className="editor-frame w-fit h-fit xl:mr-18 p-3 rounded-xl">
            <p className="mb-3 px-1 text-sm text-slate-300">Try it here — no sign-in required.</p>
            <EditorProvider>
              <CodeEditor className="z-0" />
            </EditorProvider>
            <p className="mt-3 px-1 text-xs text-slate-400">Trial runs are not saved. Sign in to the IDE for history and live input.</p>
          </div>
        </div>
      </section>

      <div className="flex justify-center">
        <hr className="mt-16 w-3/4 border-white/10" />
      </div>

      {/* Feature section */}
      <section id="feature" className="feature-section scroll-mt-20 mt-8 text-center">
        <div className="flex justify-center">
          <div className="eyebrow-badge my-6 text-sm rounded-full w-fit py-2.5 px-5">
            Features
          </div>
        </div>
        <h2 className="text-4xl font-semibold tracking-tight">Everything you need to <span className="gradient-text">code better</span></h2>
        <div className="text-slate-400 mt-3">
          Powerfull feature that make coding, learning and collaborating
          seamless
        </div>
        <div className="feature-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto px-6 my-20 text-left">
          {features.map((f, index) => (
            <Card
              key={f.heading}
              heading={f.heading}
              body={f.body}
              logo={f.logo}
              accent={f.accent}
              number={String(index + 1).padStart(2, '0')}
            />
          ))}
        </div>
      </section>
      
      {/* Footer section */}
      <footer className="footer-surface border-t border-white/10 px-8 py-16">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Logo h='60'/>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              A sandboxed multi-language code execution platform built as a
              portfolio project.
            </p>
            <div className="flex gap-4 mt-5">
              <a
                href="https://github.com/Avdhoot-Hirde"
                aria-label="GitHub"
                className="text-gray-400 hover:text-white"
                target="_blank"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.88-2.78.62-3.37-1.22-3.37-1.22-.46-1.2-1.12-1.52-1.12-1.52-.91-.64.07-.63.07-.63 1.01.07 1.54 1.06 1.54 1.06.9 1.58 2.35 1.12 2.93.86.09-.67.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2z" />
                </svg>
              </a>

              <a
                href="https://www.linkedin.com/in/avdhoot-hirde-80891a261/"
                aria-label="LinkedIn"
                className="text-gray-400 hover:text-white"
                target="_blank"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.25h4V23h-4V8.25zM8.5 8.25h3.83v2.02h.05c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.78 2.66 4.78 6.11V23h-4v-6.7c0-1.6-.03-3.65-2.22-3.65-2.23 0-2.57 1.74-2.57 3.53V23h-4V8.25z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Product</h4>
            <ul className="space-y-3">
              <li>
                <a href="#feature" className="text-gray-400 hover:text-white text-sm">
                  Features
                </a>
              </li>
              <li>
                <NavLink to='/ide' className="text-gray-400 hover:text-white text-sm">
                  IDE
                </NavLink>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Connect</h4>
            <ul className="space-y-3">
              <li>
                <button
                  
                  className="text-gray-400 hover:text-white text-sm"
                  target="_blank"
                  onClick={async()=>{
                    // e.preventDefault()
                    await navigator.clipboard.writeText("avdhoot4304@gmail.com")
                    alert("Mail is copied")
                  }}
                >
                  Email
                </button>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/avdhoot-hirde-80891a261/"
                  className="text-gray-400 hover:text-white text-sm"
                  target="_blank"
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Avdhoot-Hirde"
                  className="text-gray-400 hover:text-white text-sm"
                  target="_blank"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto border-t border-white/10 mt-12 pt-6">
          <p className="text-gray-500 text-sm">
            © 2026 Nexecute. Built by Avdhoot Hirde.
          </p>
        </div>
      </footer>
      
    </div>
  );
}

export default Home;
