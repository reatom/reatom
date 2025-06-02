---
title: Setup
description: Getting started with setting up Reatom
---

## Installation

Install the core Reatom package and the React adapter.

### Core Package
```bash
npm install @reatom/core@alpha
# or
yarn add @reatom/core@alpha
```

### React Adapter
```bash
npm install @reatom/react@alpha
# or
yarn add @reatom/react@alpha
```

You can also install both at once:
```bash
npm install @reatom/core@alpha @reatom/react@alpha
# or
yarn add @reatom/core@alpha @reatom/react@alpha
```

## Usage Example

Here's a very basic example to get you started.

### Core Example (JavaScript/TypeScript)

This example demonstrates basic atom creation, reading, and updating.

```typescript
import { atom } from '@reatom/core';

// 1. Create an atom
// The first argument is the initial state.
// The second argument is an optional name for debugging.
const counter = atom(0, 'counter');

// 2. Read the atom's state
// Call the atom as a function to get its current value.
console.log(counter()); // Output: 0

// 3. Update the atom's state
// Use the .set method to update the atom's state.
counter.set(1);
console.log(counter()); // Output: 1

// You can also update using an updater function.
// This function receives the previous state and returns the new state.
counter.set((prevValue) => prevValue + 5);
console.log(counter()); // Output: 6
```

### React Example

This example shows how to use Reatom with React using the `@reatom/react` package.
It uses `reatomComponent` for creating reactive components.

```tsx
import React from 'react';
import { atom } from '@reatom/core';
import { reatomComponent } from '@reatom/react';

// 1. Define an atom
// This atom will hold the name input by the user.
const nameAtom = atom('World', 'nameAtom');

// 2. Create a Reatom-connected React component
// `reatomComponent` wraps your functional component, making it reactive to atom changes.
const NameEditor = reatomComponent(() => {
  // Inside the component, you can read atom values by calling them as functions.
  const currentName = nameAtom();

  // Event handlers can update atoms using the .set method too.
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    nameAtom.set(event.target.value);
  };

  return (
    <div>
      <input
        type="text"
        value={currentName}
        onChange={handleInputChange}
        placeholder="Enter your name"
      />
      <p>Hello, {currentName}!</p>
    </div>
  );
}, 'NameEditor'); // Naming the component is good for debugging.

// Example of how you might use NameEditor in an application:
//
// import ReactDOM from 'react-dom/client';
//
// function App() {
//   return (
//     <div>
//       <h1>Reatom React Example</h1>
//       <NameEditor />
//     </div>
//   );
// }
//
// const root = ReactDOM.createRoot(document.getElementById('root')!);
// root.render(<App />);
