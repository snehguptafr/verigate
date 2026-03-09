import { useEffect, useState, startTransition } from "react"
import { useRouter } from "next/navigation"
import { getUser, AuthUser } from "./auth"

export const useAuth = (requiredRole?: string) => {
    const router = useRouter()
    const [user, setUser] = useState<AuthUser | null>(null)
    const [checking, setChecking] = useState(true)

    useEffect(() => {
        const user = getUser();
        if (!user) {
            router.push("/login")
            return
        }
        if (requiredRole && user.role !== requiredRole) {
            router.push("/login")
            return
        }
        startTransition(() => {
            setUser(user)
            setChecking(false)
        })
    }, [requiredRole, router])

    return { user, checking }
}