import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./Pages/Home.jsx";
import Login from "./Pages/Login.jsx";
import IDE from "./Pages/IDE.jsx";
import OAuthCallback from "./Pages/OAuthCallback.jsx";
import History from "./Pages/History.jsx";
// import ProtectedRoute from './components/ProtectedRoute.jsx'

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "",
        element: <Home />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "auth/callback",
        element: <OAuthCallback />,
      },
      {
        path:"history",
        // element: <ProtectedRoute><History/></ProtectedRoute>
        element: <History/>
      }
    ],
  },
  {
    path: "ide",
    // element:<ProtectedRoute><IDE/></ProtectedRoute>
    element: <IDE />,
  },
  
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
