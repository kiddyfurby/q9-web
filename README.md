# Q9 Extension

A modern, draggable Chrome Extension that brings the **Q9 (九方)** input method to any web page. Built with **Svelte 5** and **Vite**, it features a sleek glassmorphic UI and full physical keyboard support.
[**View Installation Guide & Download ZIP**](https://kiddyfurby.github.io/q9-web/)

## 🚀 Features

- **Q9 Input Method**: Full support for radical-based character entry, candidate selection, and multi-page paging.
- **Draggable Keypad**: A compact, semi-transparent black widget that can be positioned anywhere on the screen.
- **Physical Keyboard Support**:
  - Mapped Qwerty keys (789, uio, jkl) for numeric entry.
  - **Shift-Toggle**: Hold the `Shift` key (approx. 300ms) to enable or disable the input method.
- **Modern UI**: Dark mode with blur effects (glassmorphism) and clear visual state indicators ("Q9" vs "OFF").
- **Custom Font**: Bundled `Q9-droid` font for perfect rendering of input method glyphs.
- **Isolated Styling**: Injected via Shadow DOM to prevent conflicts with host website styles.

## 🛠️ Installation

1. Clone or download this repository.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build the extension:
   ```bash
   pnpm build
   ```
4. Open Chrome and navigate to `chrome://extensions/`.
5. Enable **"Developer mode"** in the top right.
6. Click **"Load unpacked"**.
7. Select the `dist` directory inside this project.

## ⌨️ Usage

1. **Enable/Disable**: Long-press the `Shift` key to toggle the IME. The widget will dim and turn grayscale when disabled.
2. **Type Radicals**: Use the on-screen keypad or your keyboard's numpad/mapped keys to enter radical codes.
3. **Select Candidates**: Once a code is entered, character candidates appear. Press `1-9` to select your character.
4. **Paging**: Press `0` to scroll through multiple pages of candidates.
5. **Cancel**: Press the **取消** (Cancel) button or mapped key to clear the current code.
6. **Drag**: Grab the top status bar or background areas of the widget to reposition it.

## 🏗️ Architecture

- **Svelte 5**: Responsive UI logic using the latest Runes (`$state`, `$derived`).
- **Vite + CRXJS**: Modern build pipeline specifically designed for Chrome Extensions.
- **Shadow DOM**: Used for script injection to ensure style and logic isolation from the host page.
- **Pointer Events**: Robust dragging implementation that works across different viewport scales.
- **Manifest V3**: Compliant with the latest browser security and performance standards.
