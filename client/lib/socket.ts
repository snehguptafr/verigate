import { io } from "socket.io-client"

const URL = typeof window !== "undefined" 
  ? `https://${window.location.hostname}:4000`
  : "https://localhost:4000"

const socket = io(URL)

export default socket