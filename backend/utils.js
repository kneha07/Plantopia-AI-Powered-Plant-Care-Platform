const { WATER_FREQUENCY_DAYS } = require('./constants');

function daysSince(date) {
  if (!date) return Infinity;
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

function isWateringDue(plant) {
  const threshold = WATER_FREQUENCY_DAYS[plant.water] || 7;
  return daysSince(plant.last_watered) >= threshold;
}

function formatUserPlant(row) {
  return {
    userPlantId: row.id,
    plantId: row.plant_id,
    name: row.nickname || row.name,
    image: row.image,
    waterFrequency: row.water,
    lastWatered: row.last_watered,
    location: row.location,
  };
}

module.exports = { daysSince, isWateringDue, formatUserPlant };
