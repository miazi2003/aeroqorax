import aircraftGeoJson from '@/utils/aircraftGeoJson'
import React from 'react'

const aircraftGetAction = async(data : any) => {
    const aircraftData = await aircraftGeoJson(data) 
 return aircraftData
}

export default aircraftGetAction