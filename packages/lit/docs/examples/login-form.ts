/** @doc-expand
 * Login form
 * 
 * Login form with real-time validation and asynchronous submission
 * 
 * This example demonstrates:
 *
 * - Using reatomForm for simple, powerful form management
 * - Field-level validation with automatic error handling
 * - Built-in async states (isPending, error, data)
 * - Automatic form reset on success
 * - ~40% less code than manual implementation
 * - Type-safe form state and validation
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Computed render props memoize template parts (errors, button state)
 * - watch() directive updates only the bound Parts (avoid unnecessary host updates)
 * - Computed atoms cache derived state (isFormValid)
 * - Templates only update when their specific dependencies change
 * - No unnecessary template recreation on every render
 */


import { computed, reatomForm, wrap } from '@reatom/core'
import { ReatomLitElement, watch } from '@reatom/lit'
import { html } from 'lit'

/**
 * BENEFIT: Single form definition replaces 10+ separate atoms
 * Before: email, password, isSubmitting, submitError, submitSuccess atoms
 *         + emailError, passwordError, isValid computed atoms
 *         + handleSubmit action with manual state management
 * After: One reatomForm call with everything included
 */
const loginForm = reatomForm(
  {
    email: {
      initState: '',
      /**
       * BENEFIT: Field-level validation is colocated with field definition
       * - Validation runs automatically when validateOnChange: true
       * - Error stored in field.validation.error()
       * - No need for separate validation computed atoms
       */
      validate: ({ value }) => {
        if (!value) return 'Email is required'
        if (!value.includes('@')) return 'Invalid email format'
      },
      validateOnChange: true,
    },
    password: {
      initState: '',
      validate: ({ value }) => {
        if (!value) return 'Password is required'
        if (value.length < 6) return 'Password must be at least 6 characters'
      },
      validateOnChange: true,
    },
  },
  {
    name: 'loginForm',
    /**
     * BENEFIT: Built-in async states from withAsyncData extension
     * - loginForm.submit.isPending() replaces isSubmitting atom
     * - loginForm.submit.error() replaces submitError atom
     * - loginForm.submit.data() replaces submitSuccess atom
     * All automatically managed - no manual state updates needed!
     */
    onSubmit: async (state) => {
      const response = await wrap(fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: state.email,
          password: state.password,
        }),
      }))

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Login failed')
      }

      return { success: true }
    },
    /**
     * BENEFIT: Automatic form reset
     * - resetOnSubmit: true clears all fields after successful submit
     * - No need for manual email.set(''), password.set('')
     * - Also resets validation errors and submit states
     */
    resetOnSubmit: true,
    validateOnChange: true,
  },
)

/**
 * PERFORMANCE: Computed atom for form validation state
 * Caches the validation result, only recalculates when field validations change
 * This prevents unnecessary recalculations on every render
 */
const isFormValid = computed(() => {
  const emailError = loginForm.fields.email.validation().error
  const passwordError = loginForm.fields.password.validation().error
  return !emailError && !passwordError
}, 'isFormValid')

export class LoginForm extends ReatomLitElement {
  /**
   * PERFORMANCE: Computed render props for error messages
   * These template parts are memoized and only update when their dependencies change,
   * preventing unnecessary template recreation on every render.
   * IMPORTANT: Computed render props ONLY work when depending on atoms, not Lit properties.
   */
  emailErrorTemplate = computed(() => {
    const error = loginForm.fields.email.validation().error
    return error ? html`<div class="error">${error}</div>` : html``
  }, 'emailErrorTemplate')

  passwordErrorTemplate = computed(() => {
    const error = loginForm.fields.password.validation().error
    return error ? html`<div class="error">${error}</div>` : html``
  }, 'passwordErrorTemplate')

  submitErrorTemplate = computed(() => {
    const error = loginForm.submit.error()?.message
    return error ? html`<div class="error">Error: ${error}</div>` : html``
  }, 'submitErrorTemplate')

  successTemplate = computed(() => {
    const data = loginForm.submit.data()
    return data ? html`<div class="success">Login successful!</div>` : html``
  }, 'successTemplate')

  buttonDisabled = computed(() => {
    const isPending = loginForm.submit.pending() > 0
    return isPending || !isFormValid()
  }, 'buttonDisabled')

  buttonText = computed(() => {
    const isPending = loginForm.submit.pending() > 0
    return isPending ? 'Logging in...' : 'Login'
  }, 'buttonText')

  /**
   * PERFORMANCE: Computed atoms for input disabled state
   * These cache the boolean result, preventing recalculation on every render
   */
  inputsDisabled = computed(() => {
    return loginForm.submit.pending() > 0
  }, 'inputsDisabled')

  /**
   * BENEFIT: Simplified event handlers
   * - field.change(value) handles all state updates
   * - No need for manual atom().set() calls
   * - Validation triggers automatically
   */
  private handleFormSubmit = (e: Event) => {
    e.preventDefault()
    loginForm.submit()
  }

  private handleEmailInput = (e: InputEvent) => {
    loginForm.fields.email.change((e.target as HTMLInputElement).value)
  }

  private handlePasswordInput = (e: InputEvent) => {
    loginForm.fields.password.change((e.target as HTMLInputElement).value)
  }

  override render() {
    /**
     * PERFORMANCE: Optimized render with computed props
     * - Computed render props prevent unnecessary template recreation
     * - watch() ensures component updates when atoms change
     * - Minimal DOM operations for better performance
     */
    return html`
      <form @submit=${this.handleFormSubmit} class="login-form">
        <h2>Login</h2>

        ${watch(this.successTemplate)}
        ${watch(this.submitErrorTemplate)}

        <div class="form-group">
          <label>Email</label>
          <input
            type="email"
            .value=${watch(loginForm.fields.email.value)}
            @input=${this.handleEmailInput}
            ?disabled=${watch(this.inputsDisabled)}
          />
          ${watch(this.emailErrorTemplate)}
        </div>

        <div class="form-group">
          <label>Password</label>
          <input
            type="password"
            .value=${watch(loginForm.fields.password.value)}
            @input=${this.handlePasswordInput}
            ?disabled=${watch(this.inputsDisabled)}
          />
          ${watch(this.passwordErrorTemplate)}
        </div>

        <button
          type="submit"
          ?disabled=${watch(this.buttonDisabled)}
        >
          ${watch(this.buttonText)}
        </button>
      </form>
    `
  }
}

customElements.define('login-form', LoginForm)
