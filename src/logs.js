import 'core-js/stable';
import 'regenerator-runtime/runtime';
import React from "react";
import { createRoot } from "react-dom/client";
import LogPage from './LogPage.jsx';
const container = document.getElementById("log");
const root = createRoot(container);
root.render(<LogPage/>);