import { jwtDecode } from "jwt-decode";

export interface AuthUser{
    userId: string,
    tenantId: string,
    role:string
}

export const getToken = () => {
    if(typeof window === "undefined") return null
    return localStorage.getItem("token")
}

export const getUser = (): AuthUser | null =>{
    const token = getToken()
    if(!token) return null
    try{
        return jwtDecode(token)
    } catch{
        return null
    }
}

export const setToken = (token:string) => {
    localStorage.setItem("token", token)
}

export const logout = () => {
    localStorage.removeItem("token")
    window.location.href = "/login"
}