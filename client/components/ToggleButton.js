'use client'

/**
 * Reusable segmented control / toggle button.
 * @param {Object} props
 * @param {{ value: string, label: string }[]} props.options - Options to display (value + label)
 * @param {string} props.value - Currently selected value
 * @param {(value: string) => void} props.onChange - Called when selection changes
 * @param {string} [props.ariaLabel] - Accessible label for the group
 * @param {string} [props.className] - Optional class for the wrapper
 */
export default function ToggleButton({ options, value, onChange, ariaLabel, className = '' }) {
  return (
    <div
      className={`toggle-button ${className}`.trim()}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`toggle-button-btn ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
