---
title: Field array
---

## Initialization
There are several ways to initialize array fields:

### Simple Array Literals
```ts
const form = reatomForm({
  // Empty array field
  tags: [],
  
  // Array with default item as a string field
  emails: ['default@example.com'],
  
  // Array with default item as a string field through options definition
  phones: [
    { initState: '123-456-7890', validateOnChange: true }
  ]
}, 'form')
```

### Empty Array with Type Information
```ts
const form = reatomForm({
  // Empty array with correct type information
  emails: new Array<string>(),
  contacts: new Array<{ name: string, phone: string }>()
}, 'form')
```

### Complex Array Field Factory
:::caution[Experimental]
This declaration approach is still experimental, but the plan to move it out of this state has already been built and it will be released very soon as `reatomFieldArray`
:::

If you want to configure the rules for creating fields in an array field, you should define a factory function using `experimental_fieldArray` function that describes how each new field in this array field will be created.
```ts
const form = reatomForm({
  // Using initState and create
  phoneNumbers: experimental_fieldArray({
    initState: [{ number: '123-456-7890', priority: false }],
    create: ({ number, priority }, name) => ({
      number: { initState: number, validateOnChange: true },
      priority: reatomBoolean(priority, `${name}.priority`).extend(withField())
    })
  }),
}, 'form')

form.fields.phoneNumbers.create({ 
  number: '123-456-7890', 
  priority: false 
})
```

## Basic Array Field Operations
Since field array or array literal in the fields definition are a syntactic sugar over `reatomLinkedList`, it provides several methods to manipulate the array of fields:

- `create(value)`: Adds a new field with the given value to the end of the array
- `remove(field)`: Removes a specific field from the array
- `clear()`: Removes all fields from the array
- `array()`: Returns an array of all fields, which you should use to iterate over the fields
- `swap(field1, field2)`: Swaps the positions of two fields in the array
- `move(field, targetField)`: Moves a field to a position after the target field (use null to move to the beginning)
- `find(predicate)`: Finds a field in the array that matches the predicate function

When rendering field arrays in UI components, you should always use the `.array()` method to iterate over the fields.

```ts
import { reatomForm } from '@reatom/core'

const contactForm = reatomForm({
  name: '',
  emails: [''] // Simple array of string fields
}, 'form')

// Add a new email field
contactForm.fields.emails.create('')

// Access the array of email fields
const emailFields = contactForm.fields.emails.array()

// Iterate over the fields to render them
// In React, this would look like:
// {emailFields.map((emailField) => (
//   <EmailFieldComponent key={emailField.name} field={emailField} />
// ))}

// Remove a specific email field
contactForm.fields.emails.remove(emailFields[0])

// Clear all email fields
contactForm.fields.emails.clear()
```

Since we use the "field as model" approach and each field is an object, we can achieve maximum type safety by working directly with objects. But the cherry on top is atomization, a principle used by array fields that allows maintaining a high-quality type-safe experience at any level of nesting in your forms.

## Nested Array Fields
You can also create nested array structures:

```ts
import { reatomForm } from '@reatom/core'

const userForm = reatomForm({
  name: '',
  addresses: [
    {
      street: '',
      city: '',
      tags: ['home']
    }
  ]
}, 'form')

// Access nested fields
const addresses = userForm.fields.addresses.array()
const firstAddressTags = addresses[0]?.tags.array()
```

Also you can use `ArrayFieldItem` type helper to infer type of the field array item:
```tsx
import type { ArrayFieldItem } from '@reatom/core'

type AddressFieldType = ArrayFieldItem<typeof form.fields.addresses>;

function AddressField({ model }: { model: AddressFieldType }) {
    // ...
}
``
