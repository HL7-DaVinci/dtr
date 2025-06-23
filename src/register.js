import 'core-js/stable';
import 'regenerator-runtime/runtime';
import React from "react";
import { createRoot } from "react-dom/client";
import RegisterPage from './RegisterPage.jsx';
const container = document.getElementById("reg");
const root = createRoot(container);
root.render(<RegisterPage/>);