
import type { Server } from 'socket.io';
import { airPlaneService } from '../airplane/airplane.service.js';



let pollingInterval: ReturnType<typeof setInterval> | null = null;
const socket = (io : Server) => {


io.on("connection" , (socket)=>{
console.log("socket connected" ,socket.id)


if(!pollingInterval){
    pollingInterval = setInterval(async()=>{

    try {
          const data = await airPlaneService();
        io.emit("aircraft:update" , data)
        } catch (error) {
          console.error("Failed to fetch aircraft:", error);
        }


} , 5000)
}

socket.on("disconnect" , ()=>{
    console.log("socket disconnected" , socket.id)

    if(io.engine.clientsCount === 0 && pollingInterval){
        clearInterval(pollingInterval)
        pollingInterval = null
    }
})
})

   
}

export default socket