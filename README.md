# 🎨 OpenSketch V.1.0

<div align="center">

**The Collaborative, Infinite Canvas Whiteboard for the Modern Web.**

![Maintained By](https://img.shields.io/badge/MAINTAINED%20BY-HANIIIPP.SPACE-7d56f4?style=for-the-badge&labelColor=black)

<br/>

![Next JS](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)
![Fabric.js](https://img.shields.io/badge/Fabric.js%20v6-e75146?style=for-the-badge&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![PHP](https://img.shields.io/badge/php-%23777BB4.svg?style=for-the-badge&logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/mysql-%2300f.svg?style=for-the-badge&logo=mysql&logoColor=white)
![cPanel](https://img.shields.io/badge/cPanel-FF6C2C?style=for-the-badge&logo=cpanel&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

</div>

---

**OpenSketch** is a high-performance, open-source real-time collaboration tool designed to mimic the freedom of a physical whiteboard. Built with a Monorepo architecture, it leverages the latest web technologies to provide a seamless drawing experience.

It utilizes a unique **Hybrid Architecture** (Node.js + PHP) to enable real-time WebSocket capabilities even on standard Shared Hosting (cPanel) environments.

---

## 🌟 Key Features

### 🤝 Real-Time Collaboration
Seamlessly sync drawings, cursors, and object modifications across multiple users with sub-millisecond latency using **WebSockets**.

### 🖌️ Smart Drawing Tools
Includes a comprehensive suite of tools: Rectangle, Circle, Triangle, Rhombus, Arrow, Line, Freehand Pencil, Text, and Eraser.

### ⚡ High Performance
Powered by **Fabric.js v6** for hardware-accelerated rendering, supporting thousands of objects on an infinite canvas without lag. Optimized for mobile touch gestures.

### 📱 UI/UX Excellence
Fully responsive interface with native **Dark Mode**, customizable Grid systems (Dots/Lines), and mobile-first gesture support. Toolbar hides automatically on small screens.

### 💾 Hybrid Storage
*   **Node.js**: Handles live streams.
*   **PHP/MySQL**: Handles room persistence and host validation.
*   **Export**: Save work as PNG, PDF, or SVG.

---

## 🛠️ Tech Stack

| Category | Technologies Used |
| :--- | :--- |
| **Frontend** | **Next.js 15**, **React 18**, **Tailwind CSS**, **Lucide Icons** |
| **State Management** | **Zustand** (Global Store), LocalStorage |
| **Canvas Engine** | **Fabric.js** (v6), **Rough.js** (Hand-drawn style) |
| **Real-time Server** | **Node.js**, **Express**, **Socket.io** |
| **Data API** | **PHP 8.x** (Native), **MySQL/MariaDB** |
| **Deployment** | **cPanel** (Shared Hosting), **Docker** (Local Dev) |

---

## 🚀 Step-by-Step Deployment Guide (cPanel)

Follow this guide to deploy your app to your domain (e.g., `https://art.haniipp.space`).

### Phase 1: Preparation (Local Machine) 🍳

Before uploading, we must "cook" the code into production-ready files.

1.  **Configure Environment**:
    *   Open `apps/web/.env`.
    *   Set the production URL:
        ```env
        NEXT_PUBLIC_WS_URL=https://art.haniipp.space
        ```

2.  **Build the Server (Node.js)**:
    Open your terminal in `apps/server` and run:
    ```bash
    npm install
    npm run build
    ```
    ✅ **Check:** Ensure a `dist` folder is created.

3.  **Build the Frontend (Web)**:
    Open terminal in the root folder and run:
    ```bash
    npm run build:web:static
    ```
    ✅ **Check:** Ensure `apps/web/out` folder is created.

---

### Phase 2: Deploying the "Brain" (Node.js Backend) 🧠

1.  **Upload Files**:
    *   In cPanel File Manager, create a folder outside `public_html` named `opensketch-server`.
    *   Upload these **exact items** from `apps/server`:
        *   `package.json`
        *   `app.js` (The bridge file)
        *   `dist` (The folder containing compiled code)

2.  **Start the App**:
    *   Go to **Setup Node.js App** in cPanel.
    *   **Create Application**:
        *   **Node Version**: 18.x or 20.x.
        *   **App Root**: `opensketch-server`.
        *   **Startup File**: `app.js`.
    *   Click **Create**.
    *   Click **Run NPM Install**.
    *   Ensure status says **Started**.

3.  **🔍 CRITICAL: Find the Port**:
    *   Go back to File Manager -> `opensketch-server`.
    *   Look for a file named **`port.txt`**.
    *   Open it and copy the number (e.g., `54321`).
    *   *Keep this number safe!*

---

### Phase 3: Deploying the "Memory" (Database & PHP) 💾

1.  **Create Database**:
    *   Go to **MySQL Database Wizard**.
    *   Create a database (e.g., `haniipp_sketch`).
    *   Create a user and give it **All Privileges**.

2.  **Setup Table**:
    *   Go to **phpMyAdmin**.
    *   Select your database -> **Import**.
    *   Upload `php-backend/database.sql`.

3.  **Upload API**:
    *   In File Manager, go to your subdomain folder (`public_html` or `art.haniipp.space`).
    *   Create a folder named `api`.
    *   Upload `db.php`, `create-room.php`, and `check-room.php` into this `api` folder.
    *   **Edit `db.php`**: Update with your new Database User and Password.

---

### Phase 4: Deploying the "Face" (Frontend) 💅

1.  **Upload Static Files**:
    *   Go to your subdomain folder (`art.haniipp.space`).
    *   Upload **ALL** contents from your local `apps/web/out` folder.
    *   (You should see `index.html`, `404.html`, and `_next` folder).

---

### Phase 5: The "Bridge" (.htaccess) 🌉

This connects everything together.

1.  Create or Edit `.htaccess` in your subdomain folder.
2.  Paste this code (Replace `YOUR_PORT_NUMBER` with the number from Phase 2):

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    # 1. Force HTTPS 🔒
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

    # 2. PHP API Routing (Let Apache handle this) 📄
    RewriteCond %{REQUEST_URI} ^/api/.*\.php$ [NC]
    RewriteRule ^ - [L]

    # 3. WebSocket Proxy (To Node.js) ⚡
    # REPLACE 12345 WITH YOUR PORT NUMBER!
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteRule ^socket.io/(.*) ws://127.0.0.1:12345/socket.io/$1 [P,L]

    RewriteCond %{REQUEST_URI}  ^/socket.io/ [NC]
    RewriteRule ^socket.io/(.*) http://127.0.0.1:12345/socket.io/$1 [P,L]

    # 4. React App Routing ⚛️
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

<br />
<div align="center">
  Created with ❤️ by <b>haniipp.space</b>
</div>