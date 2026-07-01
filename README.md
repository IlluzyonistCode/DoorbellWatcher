# DoorbellWatcher

> *Never miss a moment, always stay connected.*

![JSON](https://img.shields.io/badge/JSON-000000.svg?style=flat-square&logo=JSON&logoColor=white)  ![npm](https://img.shields.io/badge/npm-CB3837.svg?style=flat-square&logo=npm&logoColor=white)  ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E.svg?style=flat-square&logo=JavaScript&logoColor=black)  ![GNU%20Bash](https://img.shields.io/badge/GNU%20Bash-4EAA25.svg?style=flat-square&logo=GNU-Bash&logoColor=white)  ![bat](https://img.shields.io/badge/bat-31369E.svg?style=flat-square&logo=bat&logoColor=white)

## Overview

DoorbellWatcher is a cross-platform CLI tool that monitors doorbell events and delivers system notifications. It runs as a persistent background service, abstracting OS-specific complexity behind a unified interface that works on Windows, macOS, and Linux.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [License](#license)

---

## Features

|      | Component       | Details                                                                                                                                                                                                                             |
| :--- | :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ⚙️  | **Architecture**  | <ul><li>Hybrid script-based architecture</li><li>Combines **Windows batch** (`doorbell.bat`), **shell scripts**, and **Node.js** modules</li><li>Uses **systray2** for system tray integration</li></ul>                             |
| 🔩 | **Code Quality**  | <ul><li>Modular JavaScript with **ES modules** (`.mjs` extension)</li><li>Uses **commander** for CLI structure</li><li>Package.json includes standard npm scripts</li></ul>                                                          |
| 📄 | **Documentation** | <ul><li>**Minimal documentation** - only basic license file present</li><li>No README, contributing guidelines, or API docs detected</li></ul>                                                                                      |
| 🔌 | **Integrations**  | <ul><li>**System tray integration** via systray2</li><li>**Desktop notifications** via node-notifier</li><li>**CLI interface** using commander</li><li>**Cross-platform script execution** (bat/sh)</li></ul>                       |
| 🧩 | **Modularity**    | <ul><li>Separate **configuration** (JSON) from **logic** (JavaScript)</li><li>**Script separation** between batch files and Node modules</li></ul>                                                                                  |
| ⚡️  | **Performance**   | <ul><li>Lightweight **system tray application**</li><li>Event-driven architecture using native OS notifications</li></ul>                                                                                                           |
| 🛡️ | **Security**      | <ul><li>**No explicit security measures** documented</li><li>Relies on npm dependency security</li><li>Executes system-level batch/shell scripts</li></ul>                                                                           |
| 📦 | **Dependencies**  | <ul><li>**Core dependencies**: `systray2`, `commander`, `node-notifier`</li><li>**Package management**: npm (package-lock.json present)</li><li>**Runtime**: Node.js</li></ul>                                                       |

---

## Project Structure

```
└── DoorbellWatcher/
    ├── autostart.mjs
    ├── bell.png
    ├── doorbell.bat
    ├── doorbell.sh
    ├── index.mjs
    ├── LICENSE
    ├── package-lock.json
    ├── package.json
    └── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.10+ / Node.js 18+ *(depending on the stack above)*

### Installation

```sh
git clone "https://github.com/IlluzyonistCode/DoorbellWatcher
cd DoorbellWatcher"
npm install
```

### Usage

```sh
python main.py
```

---

## Contributing

- [Report Issues](https://github.com/IlluzyonistCode/DoorbellWatcher/issues)
- [Submit Pull Requests](https://github.com/IlluzyonistCode/DoorbellWatcher/pulls)
- [Discussions](https://github.com/IlluzyonistCode/DoorbellWatcher/discussions)

---

## License

Distributed under the [AGPL-3.0](LICENSE) license.
