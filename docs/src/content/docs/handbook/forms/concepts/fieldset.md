---
title: Fieldset
---

Field sets allow you to group related fields together and manage them as a single unit. This is useful for organizing complex forms into logical sections such as [wizard (multi-step) forms](/handbook/forms/recipes/wizard-forms), [compound fields](/handbook/forms/recipes/compound-fields), or for tracking the combined state of multiple fields without creating a full form.

### Behavior with disabled fields

When fields are disabled, they no longer automatically trigger their own validation. In field sets, these disabled fields are excluded from the `validation` and `focus` computations, meaning they are not considered in the validation process according to the schema/etc. This ensures that disabled fields do not affect the validation status of the form or field set they belong to.