import Icon from './Icon.jsx'

// A row of buttons ("chips") to choose from.
// - Normal: you pick ONE option.       value is the chosen option, e.g. 'Kitchen'
// - multiple: you pick SEVERAL options. value is a list, e.g. ['Mon', 'Tue']
// options: a list of texts, or of { value, label } when the shown text is not the value
//          (e.g. houses: { value: 12, label: 'Kerkstraat 12, Eindhoven' })
// size: an extra CSS class to make the chips smaller or wider, e.g. 'chips-small'
function ChipGroup({ options, value, onChange, multiple = false, size = '' }) {
  const items = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }))

  function isSelected(option) {
    if (multiple) {
      return value.includes(option)
    }
    return value === option
  }

  function handleClick(option) {
    if (!multiple) {
      // Pick this one
      onChange(option)
    } else if (isSelected(option)) {
      // It was on: take it out of the list
      onChange(value.filter((v) => v !== option))
    } else {
      // It was off: add it to the list
      onChange([...value, option])
    }
  }

  return (
    <div className={'chips ' + size}>
      {items.map((item) => (
        <button
          type="button"
          key={String(item.value)}
          className={isSelected(item.value) ? 'chip selected' : 'chip'}
          aria-pressed={isSelected(item.value)}
          onClick={() => handleClick(item.value)}
        >
          {multiple && isSelected(item.value) && <Icon name="check" size={14} />}
          {item.label}
        </button>
      ))}
    </div>
  )
}

export default ChipGroup
