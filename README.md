# React Notification Kit


**Build status**

[![Node 18](https://img.shields.io/github/actions/workflow/status/ceviixx/react-notification-kit/ci-node18.yml?branch=main&label=Node%2018&logo=node.js)](https://github.com/ceviixx/react-notification-kit/actions/workflows/ci-node18.yml)
[![Node 20](https://img.shields.io/github/actions/workflow/status/ceviixx/react-notification-kit/ci-node20.yml?branch=main&label=Node%2020&logo=node.js)](https://github.com/ceviixx/react-notification-kit/actions/workflows/ci-node20.yml)
[![Node 22](https://img.shields.io/github/actions/workflow/status/ceviixx/react-notification-kit/ci-node22.yml?branch=main&label=Node%2022&logo=node.js)](https://github.com/ceviixx/react-notification-kit/actions/workflows/ci-node22.yml)

A lightweight and dependency-free **toast & notification system** for React 18+.  
No context providers, no external libraries – just drop in a `<Toaster />` and call `toast.success(...)`.

---

## ✨ Features

- 🔥 Tiny & dependency-free (only `react` & `react-dom` as peer dependencies)
- 📦 Easy API (`toast.success`, `toast.error`, `toast.info`, etc.)
- ⏱ Auto-dismiss with progress bar
- 🎨 Built with Tailwind classes (but works without Tailwind – you can restyle)
- ⚡ Works with or without TypeScript

---

## 🚀 Installation

This package is not yet published on npm.  
You can install it **directly from GitHub**:

```bash
npm install github:ceviixx/react-notification-kit
# or
yarn add github:ceviixx/react-notification-kit
# or
pnpm add github:ceviixx/react-notification-kit
```

---

## 🛠 Usage

### 1. Add the Toaster at the root of your app

```tsx
'use client';
import { Toaster } from 'react-notification-kit';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-right" /> {/* Mount once */}
    </>
  );
}
```

### 2. Trigger notifications anywhere

```tsx
'use client';
import { toast } from 'react-notification-kit';

export default function DemoPage() {
  return (
    <div>
      <button
        onClick={() => toast.success({ title: 'Success', description: 'Data saved!' })}
      >
        Show Success
      </button>

      <button
        onClick={() => toast.error({ title: 'Error', description: 'Something went wrong.' })}
      >
        Show Error
      </button>
    </div>
  );
}
```

### 3. Optional helpers

You can also use `toast.show` for fully custom toasts:

```tsx
toast.show({
  id: "my-unique-id",            // optional, overrides existing toast with same id
  title: "Hello",
  description: "This is a custom notification",
  type: "info",
  duration: 5000,
  dismissible: true,
  action: {
    label: "Undo",
    onClick: () => alert("Action clicked!"),
  },
});
```

---

## 📖 API

### `<Toaster />` props

| Prop             | Type                                  | Default       | Description                        |
|------------------|---------------------------------------|---------------|------------------------------------|
| `position`       | `"top-right"|...`                    | `"top-right"` | Where notifications appear         |
| `maxVisible`     | `number`                              | `3`           | Max toasts visible at once         |
| `defaultDuration`| `number` (ms)                         | `4000`        | Default auto-dismiss time (ms)     |
| `container`      | `HTMLElement | null`                 | `document.body` | Custom portal mount target       |

### `toast` API

- `toast.show(options: ToastInput)`
- `toast.success(message: string | ToastInput)`
- `toast.error(message: string | ToastInput)`
- `toast.warning(message: string | ToastInput)`
- `toast.info(message: string | ToastInput)`
- `toast.dismiss(id?: string)`
- `toast.promise(promise, { loading, success, error })`
