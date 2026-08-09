import aircraftGeoJson from '@/utils/aircraftGeoJson'
import React from 'react'

const aircraftGetAction = async() => {
    const aircraftData = await aircraftGeoJson() 
 return aircraftData
}

export default aircraftGetAction