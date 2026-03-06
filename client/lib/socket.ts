import { io } from "socket.io-client"

const URL = typeof window !== "undefined" 
  ? `http://${window.location.hostname}:4000`
  : "http://localhost:4000"

const socket = io(URL)

export default socket