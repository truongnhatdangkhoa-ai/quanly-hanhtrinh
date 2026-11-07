import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { markAppReady } from "./updater";

void markAppReady(); // báo giao diện đã chạy ổn (cần cho cơ chế tự cập nhật)

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
