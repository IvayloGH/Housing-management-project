// Turns { Bedroom: 6, Kitchen: 1 } into "6 bedrooms · 1 kitchen"
export function describeRooms(roomTypes) {
  return Object.entries(roomTypes)
    .map(([type, count]) => {
      const name = type.toLowerCase()
      return `${count} ${count === 1 ? name : name + 's'}`
    })
    .join(' · ')
}
