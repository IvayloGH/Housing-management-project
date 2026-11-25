import Icon from './Icon.jsx'

// A row of buttons ("chips") to choose from.
// - Normal: you pick ONE option.       value is the chosen option, e.g. 'Kitchen'
// - multiple: you pick SEVERAL options. value is a list, e.g. ['Mon', 'Tue']
// size: an extra CSS class to make the chips smaller or wider, e.g. 'chips-small'
function ChipGroup({ options, value, onChange, multiple = false, size = '' }) {
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
      {options.map((option) => (
        <button
          type="button"
          key={option}
          className={isSelected(option) ? 'chip selected' : 'chip'}
          onClick={() => handleClick(option)}
        >
          {multiple && isSelected(option) && <Icon name="check" size={14} />}
          {option}
        </button>
      ))}
    </div>
  )
}

export default ChipGroup
